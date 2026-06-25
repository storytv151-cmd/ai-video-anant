import ApiError from '../../utils/ApiError.js';
import ProviderModel from '../../models/Provider.js';
import VideoGenerationJobModel from '../../models/VideoGenerationJob.js';
import ProviderModelModel from '../../models/ProviderModel.js';
import { buildGenerationJobDto } from '../../utils/generation.dto.js';
import walletService from '../wallet/walletService.js';
import generationLifecycleService from './generationLifecycleService.js';
import generationSettlementService from './generationSettlementService.js';

const getJobForUser = async ({ userId, jobId }) => {
  const job = await VideoGenerationJobModel.findOne({ _id: jobId, user: userId }).lean();
  if (!job) {
    throw new ApiError(404, 'Job not found.', { code: 'JOB_NOT_FOUND' });
  }
  return job;
};

const buildProviderSummary = async ({ job }) => {
  if (!job.provider) {
    return { provider: null, providerModel: null };
  }

  const provider = await ProviderModel.findById(job.provider).select({ name: 1, slug: 1, enabled: 1, healthStatus: 1 }).lean();
  const providerModelSlug = job.externalResponse?.providerModelSlug || null;

  let providerModel = null;
  if (provider && providerModelSlug) {
    providerModel = await ProviderModelModel.findOne({
      provider: provider._id,
      slug: String(providerModelSlug).toLowerCase(),
      enabled: true,
    })
      .select({ name: 1, slug: 1, enabled: 1, provider: 1 })
      .lean();
  }

  return {
    provider: provider
      ? { id: provider._id, name: provider.name, slug: provider.slug, enabled: provider.enabled, healthStatus: provider.healthStatus }
      : null,
    providerModel: providerModel ? { id: providerModel._id, name: providerModel.name, slug: providerModel.slug } : null,
  };
};

const getStatusResponse = async ({ userId, jobId }) => {
  const job = await getJobForUser({ userId, jobId });

  const now = Date.now();
  const ect = job.estimatedCompletionTime ? new Date(job.estimatedCompletionTime).getTime() : null;
  if (ect && Number.isFinite(ect) && ['pending', 'queued', 'processing'].includes(job.status) && now > ect) {
    await walletService.withTransaction(async (session) => {
      const current = await VideoGenerationJobModel.findOne({ _id: jobId, user: userId }).session(session);
      if (!current) {
        return;
      }
      if (!['pending', 'queued', 'processing'].includes(current.status)) {
        return;
      }

      generationLifecycleService.assertTransitionAllowed({ from: current.status, to: 'timeout' });
      await generationSettlementService.settleTerminalFailure({
        session,
        job: current,
        userId,
        terminalStatus: 'timeout',
        reason: 'Generation timed out.',
        requestIdempotencyKey: null,
      });
    });
  }

  if (job.status === 'completed' && Number(job.creditsUsed || 0) === 0 && Number(job.costInCredits || 0) > 0) {
    await walletService.withTransaction(async (session) => {
      const current = await VideoGenerationJobModel.findOne({ _id: jobId, user: userId }).session(session);
      if (!current) {
        return;
      }
      if (current.status !== 'completed') {
        return;
      }
      if (Number(current.creditsUsed || 0) > 0) {
        return;
      }

      await generationSettlementService.consumeLockedCreditsForJob({
        session,
        userId,
        jobId: current._id,
        attempt: generationSettlementService.toAttemptNumber(current.retryCount || 0),
        credits: Number(current.costInCredits || 0),
        requestIdempotencyKey: null,
      });

      await VideoGenerationJobModel.updateOne(
        { _id: current._id, user: userId },
        { $set: { creditsUsed: Number(current.costInCredits || 0), completedAt: current.completedAt || new Date() } },
        { session },
      );
    });
  }

  if (['failed', 'cancelled', 'timeout'].includes(job.status) && Number(job.costInCredits || 0) > 0) {
    await walletService.withTransaction(async (session) => {
      const current = await VideoGenerationJobModel.findOne({ _id: jobId, user: userId }).session(session);
      if (!current) {
        return;
      }
      if (!['failed', 'cancelled', 'timeout'].includes(current.status)) {
        return;
      }

      await generationSettlementService.unlockLockedCreditsForJob({
        session,
        userId,
        jobId: current._id,
        attempt: generationSettlementService.toAttemptNumber(current.retryCount || 0),
        credits: Number(current.costInCredits || 0),
        reason: 'Credits unlocked due to terminal generation state.',
        requestIdempotencyKey: null,
      });
    });
  }

  const refreshed = await getJobForUser({ userId, jobId });
  const providerInfo = await buildProviderSummary({ job: refreshed });
  const dto = buildGenerationJobDto(refreshed);

  return {
    ...dto,
    estimatedCompletionTime: refreshed.estimatedCompletionTime,
    provider: providerInfo.provider,
    providerModel: providerInfo.providerModel,
    outputVideo: refreshed.outputVideo || null,
    failureReason: refreshed.failureReason,
    createdAt: refreshed.createdAt,
    updatedAt: refreshed.updatedAt,
  };
};


const generationStatusService = Object.freeze({
  getJobForUser,
  getStatusResponse,
});

export default generationStatusService;
