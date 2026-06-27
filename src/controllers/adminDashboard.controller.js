import { formatSuccessResponse } from "../utils/responseFormatter.js";
import adminDashboardService from "../services/admin/adminDashboardService.js";

const getAdminDashboard = async (request, response) => {
  const data = await adminDashboardService.getDashboard();
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

export { getAdminDashboard };
