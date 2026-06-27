import { formatSuccessResponse } from "../utils/responseFormatter.js";
import generationService from "../services/generation/generationService.js";

const getStatus = async (request, response) => {
  const data = await generationService.getStatus({
    userId: request.user.id,
    jobId: request.params.jobId,
  });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

export { getStatus };
