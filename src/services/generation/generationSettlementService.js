import ApiError from "../../utils/ApiError.js";
import VideoGenerationJobModel from "../../models/VideoGenerationJob.js";
import walletService from "../wallet/walletService.js";

const toAttemptNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
};

const buildKey = ({ jobId, attempt, action, requestKey = null }) => {
  const base = `gen_${action}:${String(jobId)}:r${attempt}`;
  if (!requestKey) {
    return base;
  }
  return `${base}:${String(requestKey)}`;
};

const lockCreditsForJob = async ({
  session,
  userId,
  jobId,
  attempt = 0,
  credits,
  requestIdempotencyKey = null,
}) => {
  const idempotencyKey = buildKey({
    jobId,
    attempt,
    action: "lock",
    requestKey: requestIdempotencyKey,
  });

  const { transaction } = await walletService.lockCredits({
    userId,
    credits: Number(credits),
    referenceType: "VideoGenerationJob",
    referenceId: jobId,
    description: "Credits locked for generation.",
    idempotencyKey,
    session,
  });

  await VideoGenerationJobModel.updateOne(
    { _id: jobId, user: userId },
    { $set: { lockTransaction: transaction?._id || null } },
    { session },
  );

  return transaction;
};

const consumeLockedCreditsForJob = async ({
  session,
  userId,
  jobId,
  attempt = 0,
  credits,
  requestIdempotencyKey = null,
}) => {
  const idempotencyKey = buildKey({
    jobId,
    attempt,
    action: "consume",
    requestKey: requestIdempotencyKey,
  });

  const { transaction } = await walletService.consumeLockedCredits({
    userId,
    credits: Number(credits),
    referenceType: "VideoGenerationJob",
    referenceId: jobId,
    description: "Locked credits consumed for generation.",
    idempotencyKey,
    session,
  });

  await VideoGenerationJobModel.updateOne(
    { _id: jobId, user: userId },
    { $set: { consumeTransaction: transaction?._id || null } },
    { session },
  );

  return transaction;
};

const unlockLockedCreditsForJob = async ({
  session,
  userId,
  jobId,
  attempt = 0,
  credits,
  reason = "Credits unlocked.",
  requestIdempotencyKey = null,
}) => {
  const idempotencyKey = buildKey({
    jobId,
    attempt,
    action: "unlock",
    requestKey: requestIdempotencyKey,
  });

  const { transaction } = await walletService.unlockCredits({
    userId,
    credits: Number(credits),
    referenceType: "VideoGenerationJob",
    referenceId: jobId,
    description: reason,
    idempotencyKey,
    session,
  });

  await VideoGenerationJobModel.updateOne(
    { _id: jobId, user: userId },
    { $set: { unlockTransaction: transaction?._id || null } },
    { session },
  );

  return transaction;
};

const assertCreditsValid = (credits) => {
  if (!Number.isFinite(Number(credits)) || Number(credits) <= 0) {
    throw new ApiError(400, "Invalid credits amount.", {
      code: "INVALID_CREDITS_AMOUNT",
    });
  }
};

const settleCompletedJob = async ({
  session,
  job,
  userId,
  outputVideo = null,
  requestIdempotencyKey = null,
} = {}) => {
  if (!job?._id) {
    throw new ApiError(400, "Invalid generation job.", { code: "JOB_INVALID" });
  }

  const attempt = toAttemptNumber(job.retryCount || 0);
  const credits = Number(job.costInCredits || 0);
  assertCreditsValid(credits);

  await consumeLockedCreditsForJob({
    session,
    userId,
    jobId: job._id,
    attempt,
    credits,
    requestIdempotencyKey,
  });

  await VideoGenerationJobModel.updateOne(
    { _id: job._id, user: userId },
    {
      $set: {
        status: "completed",
        creditsUsed: credits,
        completedAt: new Date(),
        outputVideo: outputVideo || job.outputVideo || {},
        failureReason: null,
        progress: 100,
      },
      $push: {
        logs: {
          level: "info",
          message: "Job completed.",
          timestamp: new Date(),
          context: {},
        },
      },
    },
    { session },
  );
};

const settleTerminalFailure = async ({
  session,
  job,
  userId,
  terminalStatus,
  reason,
  requestIdempotencyKey = null,
} = {}) => {
  if (!job?._id) {
    throw new ApiError(400, "Invalid generation job.", { code: "JOB_INVALID" });
  }

  const attempt = toAttemptNumber(job.retryCount || 0);
  const credits = Number(job.costInCredits || 0);
  if (Number.isFinite(credits) && credits > 0) {
    await unlockLockedCreditsForJob({
      session,
      userId,
      jobId: job._id,
      attempt,
      credits,
      reason,
      requestIdempotencyKey,
    });
  }

  await VideoGenerationJobModel.updateOne(
    { _id: job._id, user: userId },
    {
      $set: {
        status: terminalStatus,
        failureReason: terminalStatus === "failed" ? reason : job.failureReason,
        completedAt:
          terminalStatus === "timeout" ? new Date() : job.completedAt,
      },
      $push: {
        logs: {
          level: terminalStatus === "failed" ? "error" : "warn",
          message: reason,
          timestamp: new Date(),
          context: {},
        },
      },
    },
    { session },
  );
};

const generationSettlementService = Object.freeze({
  toAttemptNumber,
  lockCreditsForJob,
  consumeLockedCreditsForJob,
  unlockLockedCreditsForJob,
  settleCompletedJob,
  settleTerminalFailure,
});

export default generationSettlementService;
