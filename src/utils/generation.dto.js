const buildGenerationJobDto = (job) => {
  if (!job) {
    return null;
  }

  const id = job._id || job.id || null;
  return {
    jobId: id,
    generationType: job.generationType || null,
    outputType: job.outputType || null,
    status: job.status || null,
    progress: job.progress ?? 0,
    queuePosition: job.queuePosition ?? null,
    estimatedCompletionTime: job.estimatedCompletionTime || null,
    provider: job.provider || null,
    template: job.template || null,
    prompt: job.prompt || null,
    negativePrompt: job.negativePrompt || null,
    inputImages: Array.isArray(job.inputImages) ? job.inputImages : [],
    inputVideos: Array.isArray(job.inputVideos) ? job.inputVideos : [],
    inputAudio: Array.isArray(job.inputAudio) ? job.inputAudio : [],
    referenceImages: Array.isArray(job.referenceImages)
      ? job.referenceImages
      : [],
    maskImages: Array.isArray(job.maskImages) ? job.maskImages : [],
    multipleOutputs: Boolean(job.multipleOutputs),
    outputAssets: Array.isArray(job.outputAssets) ? job.outputAssets : [],
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
