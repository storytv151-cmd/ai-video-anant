import { formatSuccessResponse } from "../utils/responseFormatter.js";
import adminAnalyticsService from "../services/admin/adminAnalyticsService.js";

const getAdminAnalytics = async (request, response) => {
  const data = await adminAnalyticsService.getAnalyticsOverview({
    query: request.query,
  });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

export { getAdminAnalytics };
