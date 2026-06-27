/**
 * Bootstrap controller.
 * Returns the full dynamic configuration payload required to initialize the client.
 * Authentication is optional; when present, user-specific summary is included.
 */
import { formatSuccessResponse } from "../utils/responseFormatter.js";
import bootstrapService from "../services/settings/bootstrapService.js";

const getBootstrap = async (request, response) => {
  const userId = request.user?.id || null;
  const data = await bootstrapService.getBootstrap({ userId });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

export { getBootstrap };
