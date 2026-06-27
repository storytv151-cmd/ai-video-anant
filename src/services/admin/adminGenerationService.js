import VideoGenerationJobModel from "../../models/VideoGenerationJob.js";
import ApiError from "../../utils/ApiError.js";
import adminAuditService from "./adminAuditService.js";
import adminQueryService from "./adminQueryService.js";

const listGenerationJobs = async ({ query = {} } = {}) => {
  const { page, limit, skip } = adminQueryService.buildPagination({
    page: query.page,
    limit: query.limit,
    maxLimit: 100,
  });
  const filter = {};
  if (query.userId) {
    filter.user = query.userId;
  }
  if (query.providerId) {
    filter.provider = query.providerId;
  }
  if (query.status) {
    filter.status = String(query.status).trim().toLowerCase();
  }
  if (query.generationType) {
    filter.generationType = String(query.generationType).trim().toLowerCase();
  }
  const createdAt = adminQueryService.buildDateRange({
    from: query.dateFrom || query.from,
    to: query.dateTo || query.to,
  });
  if (createdAt) {
    filter.createdAt = createdAt;
  }

  const [items, total] = await Promise.all([
    VideoGenerationJobModel.find(filter)
      .withDeleted()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    VideoGenerationJobModel.countDocuments(filter).setOptions({
      withDeleted: true,
    }),
  ]);

  return adminQueryService.buildPaginatedResponse({
    items,
    page,
    limit,
    total,
  });
};

const getGenerationJob = async ({ jobId } = {}) => {
  const job = await VideoGenerationJobModel.findById(jobId)
    .withDeleted()
    .lean();
  if (!job) {
    throw new ApiError(404, "Generation job not found.", {
      code: "GENERATION_JOB_NOT_FOUND",
    });
  }
  return job;
};

const updateGenerationStatus = async ({
  jobId,
  status,
  reason = null,
  adminUserId = null,
  request = null,
} = {}) => {
  const job = await VideoGenerationJobModel.findById(jobId).withDeleted();
  if (!job) {
    throw new ApiError(404, "Generation job not found.", {
      code: "GENERATION_JOB_NOT_FOUND",
    });
  }
  job.status = String(status || "")
    .trim()
    .toLowerCase();
  if (job.status === "cancelled") {
    job.cancelledAt = new Date();
  }
  await job.save();

  await adminAuditService.logAdminAction({
    request,
    adminUserId,
    action: "ADMIN_GENERATION_STATUS_UPDATED",
    targetType: "VideoGenerationJob",
    targetId: job._id,
    metadata: { status: job.status, reason },
  });

  return job.toObject();
};

const adminGenerationService = Object.freeze({
  listGenerationJobs,
  getGenerationJob,
  updateGenerationStatus,
});

export default adminGenerationService;
