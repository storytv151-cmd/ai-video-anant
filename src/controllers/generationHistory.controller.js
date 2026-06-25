import { formatSuccessResponse } from '../utils/responseFormatter.js';
import generationService from '../services/generation/generationService.js';

const getHistory = async (request, response) => {
  const data = await generationService.getHistory({ userId: request.user.id, query: request.query });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

export { getHistory };
