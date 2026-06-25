const buildGenerationJobDto = (job) => {
  if (!job) {
    return null;
  }

  const id = job._id || job.id || null;
  return {
    jobId: id,
    status: job.status || null,
    progress: job.progress ?? 0,
    queuePosition: job.queuePosition ?? null,
    estimatedCompletionTime: job.estimatedCompletionTime || null,
    provider: job.provider || null,
    template: job.template || null,
    costInCredits: job.costInCredits ?? null,
    creditsUsed: job.creditsUsed ?? 0,
    externalJobId: job.externalJobId || null,
    outputVideo: job.outputVideo || null,
    failureReason: job.failureReason || null,
    retryCount: job.retryCount ?? 0,
    createdAt: job.createdAt || null,
    updatedAt: job.updatedAt || null,
  };
};

export { buildGenerationJobDto };

