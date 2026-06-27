/**
 * Template controller.
 * Thin controller that delegates template business logic to services.
 */
import { formatSuccessResponse } from "../utils/responseFormatter.js";
import templateService from "../services/template/templateService.js";

const listTemplates = async (request, response) => {
  const data = await templateService.listTemplates({ query: request.query });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const getTemplateBySlug = async (request, response) => {
  const data = await templateService.getTemplateBySlug({
    slug: request.params.slug,
  });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const trending = async (request, response) => {
  const data = await templateService.listTrending({
    limit: request.query.limit,
  });
  response
    .status(200)
    .json(formatSuccessResponse({ statusCode: 200, data: { items: data } }));
};

const featured = async (request, response) => {
  const data = await templateService.listFeatured({
    limit: request.query.limit,
  });
  response
    .status(200)
    .json(formatSuccessResponse({ statusCode: 200, data: { items: data } }));
};

const recommended = async (request, response) => {
  const data = await templateService.listRecommended();
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const search = async (request, response) => {
  const data = await templateService.searchTemplates({ query: request.query });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

export {
  listTemplates,
  getTemplateBySlug,
  trending,
  featured,
  recommended,
  search,
};
