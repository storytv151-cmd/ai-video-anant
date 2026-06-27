import VideoGenerationJobModel from "../../models/VideoGenerationJob.js";
import generationQueueProvider from "./generationQueueProvider.js";

const enqueueJob = async ({ jobId, session } = {}) => {
  const queuePosition = await generationQueueProvider.getQueuePosition({
    session,
  });
  const query = VideoGenerationJobModel.updateOne(
    { _id: jobId },
    { $set: { status: "queued", queuePosition } },
  );
  if (session) {
    query.session(session);
  }
  await query;
  return { queuePosition };
};

const generationQueueService = Object.freeze({
  enqueueJob,
});

export default generationQueueService;
