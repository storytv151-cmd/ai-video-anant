import { formatSuccessResponse } from '../utils/responseFormatter.js';
import googleRtdnService from '../services/subscription/googleRtdnService.js';

const handleGoogleRtdnWebhook = async (request, response) => {
  const data = await googleRtdnService.processWebhook({
    request,
    body: request.body,
  });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

export { handleGoogleRtdnWebhook };
