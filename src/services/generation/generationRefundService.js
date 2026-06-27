import ApiError from "../../utils/ApiError.js";
import walletService from "../wallet/walletService.js";
import generationValidationService from "./generationValidationService.js";
import generationSettlementService from "./generationSettlementService.js";

const shouldRefundOnFailure = (settings) => {
  const flag =
    generationValidationService.getNumericToggle(
      settings?.featureToggles,
      "generationRefundOnFailure",
    ) ??
    generationValidationService.getNumericToggle(
      settings?.featureToggles,
      "generation_refund_on_failure",
    );
  if (flag === null) {
    return null;
  }
  return Boolean(flag);
};

const unlockIfLocked = async ({
  userId,
  job,
  reason = "Credits unlocked.",
  requestIdempotencyKey = null,
  session = null,
}) => {
  const credits = job?.costInCredits ?? null;
  if (!Number.isFinite(Number(credits)) || Number(credits) <= 0) {
    return null;
  }

  await generationSettlementService.unlockLockedCreditsForJob({
    session,
    userId,
    jobId: job._id,
    attempt: generationSettlementService.toAttemptNumber(job.retryCount || 0),
    credits: Number(credits),
    reason,
    requestIdempotencyKey,
  });

  return null;
};

const refundIfConsumed = async ({
  userId,
  job,
  reason = "Refund issued.",
  requestIdempotencyKey = null,
  session = null,
}) => {
  const used = Number(job?.creditsUsed || 0);
  if (!Number.isFinite(used) || used <= 0) {
    return null;
  }

  const refund = await walletService.refundCredits({
    userId,
    credits: used,
    originalTransactionId: job.refundTransaction || null,
    description: reason,
    idempotencyKey: requestIdempotencyKey
      ? `gen_refund:${String(job._id)}:${String(requestIdempotencyKey)}`
      : null,
    session,
  });

  return refund;
};

const refundForFailure = async ({
  settings,
  userId,
  job,
  reason,
  requestIdempotencyKey = null,
  session = null,
}) => {
  const refundFlag = shouldRefundOnFailure(settings);
  if (refundFlag === false) {
    return null;
  }

  if (Number(job?.creditsUsed || 0) > 0) {
    return refundIfConsumed({
      userId,
      job,
      reason,
      requestIdempotencyKey,
      session,
    });
  }

  return unlockIfLocked({
    userId,
    job,
    reason,
    requestIdempotencyKey,
    session,
  });
};

const assertRefundEligibleStatus = (job) => {
  const status = job?.status;
  if (!status) {
    throw new ApiError(400, "Invalid job.", { code: "JOB_INVALID" });
  }
  if (!["failed", "cancelled", "refunded"].includes(status)) {
    throw new ApiError(400, "Job is not eligible for refund.", {
      code: "JOB_REFUND_NOT_ELIGIBLE",
    });
  }
};

const generationRefundService = Object.freeze({
  unlockIfLocked,
  refundIfConsumed,
  refundForFailure,
  assertRefundEligibleStatus,
});

export default generationRefundService;
