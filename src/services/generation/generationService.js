import ApiError from '../../utils/ApiError.js';
import mongoose from 'mongoose';
import ProviderModel from '../../models/Provider.js';
import VideoGenerationJobModel from '../../models/VideoGenerationJob.js';
import walletService from '../wallet/walletService.js';
import generationHistoryService from './generationHistoryService.js';
import generationLifecycleService from './generationLifecycleService.js';
import generationProviderService from './generationProviderService.js';
import generationQueueService from './generationQueueService.js';
import generationRefundService from './generationRefundService.js';
import generationSettlementService from './generationSettlementService.js';
import generationStorageService from './generationStorageService.js';
import generationStatusService from './generationStatusService.js';
import generationValidationService from './generationValidationService.js';
import { setRequestContextValue } from '../../utils/requestContext.js';

const buildJobLog = ({ level = 'info', message, context = {} }) => ({
  level,
  message,
  timestamp: new Date(),
  context,
});

const getStringToggle = (featureToggles, key) => {
  if (!featureToggles) {
    return null;
  }
  const raw = featureToggles.get ? featureToggles.get(key) : featureToggles[key];
  if (raw === undefined || raw === null || raw === '') {
    return null;
  }
  return String(raw).trim();
};

const computeEstimatedCompletionTime = ({ estimatedTimeMs }) => {
  if (!Number.isFinite(Number(estimatedTimeMs)) || Number(estimatedTimeMs) <= 0) {
    return null;
  }
  return new Date(Date.now() + Number(estimatedTimeMs));
};

const createJob = async ({
  userId,
  walletId,
  providerId,
  templateId,
  inputImages,
  credits,
  estimatedTimeMs,
  external,
  clientRequestKey = null,
  session = null,
}) => {
  const docs = await VideoGenerationJobModel.create(
    [
      {
        user: userId,
        wallet: walletId,
        provider: providerId,
        template: templateId,
        status: 'pending',
        progress: 0,
        inputImages,
        costInCredits: credits,
        estimatedCompletionTime: computeEstimatedCompletionTime({ estimatedTimeMs }),
        providerProcessingTimeMs: estimatedTimeMs,
        externalResponse: external || null,
        clientRequestKey: clientRequestKey || null,
        logs: [buildJobLog({ message: 'Job created.' })],
      },
    ],
    session ? { session } : undefined,
  );

  return docs[0];
};

const updateJobAfterStart = async ({ jobId, plan, result }) => {
  const nextStatus = result?.status === 'processing' ? 'processing' : 'queued';
  const current = await VideoGenerationJobModel.findById(jobId).select({ status: 1 }).lean();
  if (current?.status && current.status !== nextStatus) {
    generationLifecycleService.assertTransitionAllowed({ from: current.status, to: nextStatus });
  }
  await VideoGenerationJobModel.updateOne(
    { _id: jobId },
    {
      $set: {
        provider: plan.provider.id,
        externalJobId: result?.externalJobId || null,
        externalResponse: {
          ...(result || {}),
          providerSlug: plan.provider.slug,
          providerModelSlug: plan.model?.slug || null,
          plannedCredits: plan.credits?.finalCredits ?? null,
        },
        status: nextStatus,
        startedAt: nextStatus === 'processing' ? new Date() : null,
      },
      $push: { logs: buildJobLog({ message: 'Provider start requested.', context: { provider: plan.provider.slug } }) },
    },
  );
};

const getJobOrThrow = async ({ userId, jobId }) => generationStatusService.getJobForUser({ userId, jobId });

const startGeneration = async ({ userId, payload, idempotencyKey: requestIdempotencyKey = null }) => {
  const settings = await generationValidationService.getGenerationSettings();
  generationValidationService.assertGenerationEnabled(settings);

  const effectiveIdempotencyKey = requestIdempotencyKey || payload?.idempotencyKey || null;

  if (effectiveIdempotencyKey) {
    const existing = await VideoGenerationJobModel.findOne({ user: userId, clientRequestKey: effectiveIdempotencyKey }).lean();
    if (existing) {
      return {
        jobId: existing._id,
        status: existing.status,
        estimatedTimeMs: existing.providerProcessingTimeMs ?? null,
        creditsLocked: Number(existing.costInCredits || 0) || null,
        queuePosition: existing.queuePosition ?? null,
      };
    }
  }

  const template = await generationValidationService.resolveTemplateBySlug(payload.templateSlug);

  const strategy =
    payload.strategy ||
    getStringToggle(settings.featureToggles, 'generationSelectionStrategy') ||
    getStringToggle(settings.featureToggles, 'generation_selection_strategy') ||
    'priority';

  const normalizedImages = generationStorageService.validateInputImages({
    inputImages: payload.inputImages,
    requiredImages: template.requiredImages,
    uploadLimits: settings.uploadLimits,
    storageSettings: settings.storageSettings,
  });

  const maxConcurrentJobs = Number(settings.apiLimits?.maxConcurrentJobs);
  await generationValidationService.assertUserConcurrencyLimits({ userId, maxConcurrentJobs });

  const wallet = await generationValidationService.resolveWallet({ userId });

  const planned = await generationProviderService.planExecution({
    template,
    providerSlug: payload.providerSlug || null,
    providerModelSlug: payload.providerModelSlug || null,
    strategy,
  });

  const creditsToLock = planned.credits?.finalCredits ?? null;
  if (!Number.isFinite(Number(creditsToLock)) || Number(creditsToLock) <= 0) {
    throw new ApiError(400, 'Unable to resolve credits for this generation.', { code: 'CREDITS_UNRESOLVED' });
  }

  if (Number(wallet.currentCredits) < Number(creditsToLock)) {
    throw new ApiError(402, 'Not enough credits.', { code: 'INSUFFICIENT_CREDITS' });
  }

  const estimatedTimeMs = generationProviderService.computeEstimatedTimeMs({
    provider: await ProviderModel.findById(planned.provider.id).lean(),
    model: planned.model ? { estimatedTime: null, ...planned.model } : null,
  });

  const session = await mongoose.startSession();
  let job;
  let queuePosition = null;
  try {
    try {
      await session.withTransaction(async () => {
        job = await createJob({
          userId,
          walletId: wallet._id,
          providerId: planned.provider.id,
          templateId: template._id,
          inputImages: normalizedImages,
          credits: Number(creditsToLock),
          estimatedTimeMs,
          external: {
            providerSlug: planned.provider.slug,
            providerModelSlug: planned.model?.slug || null,
            strategy,
          },
          clientRequestKey: effectiveIdempotencyKey,
          session,
        });

        await generationSettlementService.lockCreditsForJob({
          session,
          userId,
          jobId: job._id,
          attempt: generationSettlementService.toAttemptNumber(job.retryCount || 0),
          credits: Number(creditsToLock),
          requestIdempotencyKey: effectiveIdempotencyKey,
        });

        generationLifecycleService.assertTransitionAllowed({ from: 'pending', to: 'queued' });
        const queued = await generationQueueService.enqueueJob({ jobId: job._id, session });
        queuePosition = queued.queuePosition ?? null;
      });
    } catch (error) {
      if (error?.code === 11000 && effectiveIdempotencyKey) {
        const existing = await VideoGenerationJobModel.findOne({ user: userId, clientRequestKey: effectiveIdempotencyKey }).lean();
        if (existing) {
          return {
            jobId: existing._id,
            status: existing.status,
            estimatedTimeMs: existing.providerProcessingTimeMs ?? null,
            creditsLocked: Number(existing.costInCredits || 0) || null,
            queuePosition: existing.queuePosition ?? null,
          };
        }
      }
      throw error;
    }
  } finally {
    session.endSession();
  }

  try {
    setRequestContextValue('generationJobId', String(job._id));
    setRequestContextValue('provider', planned.provider.slug);

    const started = await generationProviderService.startExecution({
      template,
      providerSlug: planned.provider.slug,
      providerModelSlug: planned.model?.slug || null,
      strategy,
      allowFailover: true,
    });

    setRequestContextValue('provider', started.plan?.provider?.slug || planned.provider.slug);

    await updateJobAfterStart({ jobId: job._id, plan: started.plan, result: started.result });

    return {
      jobId: job._id,
      status: started.result?.status === 'processing' ? 'processing' : 'queued',
      estimatedTimeMs: estimatedTimeMs ?? null,
      creditsLocked: Number(creditsToLock),
      queuePosition,
    };
  } catch (error) {
    await walletService.withTransaction(async (txSession) => {
      const current = await VideoGenerationJobModel.findById(job._id).select({ status: 1, retryCount: 1 }).lean();
      if (current?.status && current.status !== 'failed') {
        generationLifecycleService.assertTransitionAllowed({ from: current.status, to: 'failed' });
      }
      await VideoGenerationJobModel.updateOne(
        { _id: job._id },
        {
          $set: { status: 'failed', failureReason: error?.message || 'Generation start failed.' },
          $push: { logs: buildJobLog({ level: 'error', message: 'Provider start failed.', context: { error: error?.message } }) },
        },
        { session: txSession },
      );

      await generationRefundService.unlockIfLocked({
        userId,
        job: { ...job.toObject?.() },
        reason: 'Credits unlocked due to generation start failure.',
        requestIdempotencyKey: effectiveIdempotencyKey,
        session: txSession,
      });
    });

    throw error;
  }
};

const cancelJob = async ({ userId, jobId, idempotencyKey: requestIdempotencyKey = null }) => {
  const settings = await generationValidationService.getGenerationSettings();
  generationValidationService.assertGenerationEnabled(settings);

  const job = await getJobOrThrow({ userId, jobId });

  if (job.status === 'pending' || job.status === 'queued') {
    await walletService.withTransaction(async (session) => {
      generationLifecycleService.assertTransitionAllowed({ from: job.status, to: 'cancelled' });
      await VideoGenerationJobModel.updateOne(
        { _id: job._id, user: userId },
        { $set: { status: 'cancelled' }, $push: { logs: buildJobLog({ message: 'Job cancelled by user.' }) } },
        { session },
      );

      await generationRefundService.unlockIfLocked({
        userId,
        job,
        reason: 'Credits unlocked due to cancellation.',
        requestIdempotencyKey,
        session,
      });
    });

    return { jobId: job._id, status: 'cancelled', refunded: false };
  }

  if (job.status === 'processing') {
    const provider = await ProviderModel.findById(job.provider).lean();
    const supportsCancellation = Boolean(provider?.metadata?.supportsCancellation);
    if (!supportsCancellation) {
      throw new ApiError(400, 'Job cannot be cancelled while processing.', { code: 'CANCEL_NOT_SUPPORTED' });
    }

    await walletService.withTransaction(async (session) => {
      generationLifecycleService.assertTransitionAllowed({ from: job.status, to: 'cancelled' });
      await VideoGenerationJobModel.updateOne(
        { _id: job._id, user: userId },
        { $set: { status: 'cancelled' }, $push: { logs: buildJobLog({ message: 'Cancellation requested.' }) } },
        { session },
      );

      await generationRefundService.unlockIfLocked({
        userId,
        job,
        reason: 'Credits unlocked due to cancellation.',
        requestIdempotencyKey,
        session,
      });
    });

    return { jobId: job._id, status: 'cancelled', refunded: false };
  }

  throw new ApiError(400, 'Job cannot be cancelled.', { code: 'JOB_NOT_CANCELLABLE' });
};

const retryJob = async ({ userId, jobId, payload = {}, idempotencyKey: requestIdempotencyKey = null }) => {
  const settings = await generationValidationService.getGenerationSettings();
  generationValidationService.assertGenerationEnabled(settings);

  const job = await getJobOrThrow({ userId, jobId });

  if (job.status !== 'failed' && job.status !== 'cancelled') {
    throw new ApiError(400, 'Only failed or cancelled jobs can be retried.', { code: 'JOB_RETRY_NOT_ALLOWED' });
  }

  const retryLimit =
    generationValidationService.getNumericToggle(settings.featureToggles, 'generationRetryLimit') ??
    generationValidationService.getNumericToggle(settings.featureToggles, 'generation_retry_limit');

  if (retryLimit !== null && Number(job.retryCount || 0) >= retryLimit) {
    throw new ApiError(429, 'Retry limit reached.', { code: 'GENERATION_RETRY_LIMIT' });
  }

  const template = job.template ? await generationProviderService.resolveTemplateById(job.template) : null;
  if (!template || template.status !== 'active') {
    throw new ApiError(400, 'Template is not available for retry.', { code: 'TEMPLATE_NOT_AVAILABLE' });
  }

  const wallet = await generationValidationService.resolveWallet({ userId });

  const strategy =
    payload.strategy ||
    job.externalResponse?.strategy ||
    getStringToggle(settings.featureToggles, 'generationSelectionStrategy') ||
    'priority';

  const planned = await generationProviderService.planExecution({
    template,
    providerSlug: payload.providerSlug || job.externalResponse?.providerSlug || null,
    providerModelSlug: payload.providerModelSlug || job.externalResponse?.providerModelSlug || null,
    strategy,
  });

  const creditsToLock = planned.credits?.finalCredits ?? null;
  if (!Number.isFinite(Number(creditsToLock)) || Number(creditsToLock) <= 0) {
    throw new ApiError(400, 'Unable to resolve credits for this retry.', { code: 'CREDITS_UNRESOLVED' });
  }

  if (Number(wallet.currentCredits) < Number(creditsToLock)) {
    throw new ApiError(402, 'Not enough credits.', { code: 'INSUFFICIENT_CREDITS' });
  }

  const session = await mongoose.startSession();
  let queuePosition = null;
  let nextRetryCount = Number(job.retryCount || 0) + 1;
  try {
    await session.withTransaction(async () => {
      generationLifecycleService.assertTransitionAllowed({ from: job.status, to: 'pending' });
      await VideoGenerationJobModel.updateOne(
        { _id: job._id, user: userId },
        {
          $set: {
            status: 'pending',
            progress: 0,
            failureReason: null,
            outputVideo: {},
            externalJobId: null,
            creditsUsed: 0,
            costInCredits: Number(creditsToLock),
            externalResponse: {
              ...(job.externalResponse || {}),
              providerSlug: planned.provider.slug,
              providerModelSlug: planned.model?.slug || null,
              strategy,
            },
          },
          $inc: { retryCount: 1 },
          $push: { logs: buildJobLog({ message: 'Retry requested.' }) },
        },
        { session },
      );

      const updated = await VideoGenerationJobModel.findById(job._id).select({ retryCount: 1 }).lean();
      nextRetryCount = Number(updated?.retryCount || nextRetryCount);

      await generationSettlementService.lockCreditsForJob({
        session,
        userId,
        jobId: job._id,
        attempt: generationSettlementService.toAttemptNumber(nextRetryCount),
        credits: Number(creditsToLock),
        requestIdempotencyKey: requestIdempotencyKey || payload?.idempotencyKey || null,
      });

      generationLifecycleService.assertTransitionAllowed({ from: 'pending', to: 'queued' });
      const queued = await generationQueueService.enqueueJob({ jobId: job._id, session });
      queuePosition = queued.queuePosition ?? null;
    });
  } finally {
    session.endSession();
  }

  try {
    setRequestContextValue('generationJobId', String(job._id));
    setRequestContextValue('provider', planned.provider.slug);

    const started = await generationProviderService.startExecution({
      template,
      providerSlug: planned.provider.slug,
      providerModelSlug: planned.model?.slug || null,
      strategy,
      allowFailover: true,
    });

    setRequestContextValue('provider', started.plan?.provider?.slug || planned.provider.slug);

    await updateJobAfterStart({ jobId: job._id, plan: started.plan, result: started.result });

    return {
      jobId: job._id,
      status: started.result?.status === 'processing' ? 'processing' : 'queued',
      creditsLocked: Number(creditsToLock),
      queuePosition,
    };
  } catch (error) {
    await walletService.withTransaction(async (txSession) => {
      const current = await VideoGenerationJobModel.findById(job._id).select({ status: 1 }).lean();
      if (current?.status && current.status !== 'failed') {
        generationLifecycleService.assertTransitionAllowed({ from: current.status, to: 'failed' });
      }
      await VideoGenerationJobModel.updateOne(
        { _id: job._id, user: userId },
        {
          $set: { status: 'failed', failureReason: error?.message || 'Retry start failed.' },
          $push: { logs: buildJobLog({ level: 'error', message: 'Retry provider start failed.', context: { error: error?.message } }) },
        },
        { session: txSession },
      );

      await generationRefundService.unlockIfLocked({
        userId,
        job: { ...job },
        reason: 'Credits unlocked due to retry start failure.',
        requestIdempotencyKey: requestIdempotencyKey || payload?.idempotencyKey || null,
        session: txSession,
      });
    });

    throw error;
  }
};

const getStatus = async ({ userId, jobId }) => generationStatusService.getStatusResponse({ userId, jobId });

const getHistory = async ({ userId, query }) => generationHistoryService.listHistory({ userId, query });

const generationService = Object.freeze({
  startGeneration,
  cancelJob,
  retryJob,
  getStatus,
  getHistory,
});

export default generationService;
