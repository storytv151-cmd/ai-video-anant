import { formatSuccessResponse } from "../utils/responseFormatter.js";
import adminTemplateService from "../services/admin/adminTemplateService.js";

const listAdminTemplates = async (request, response) => {
  const data = await adminTemplateService.listTemplates({
    query: request.query,
  });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const getAdminTemplate = async (request, response) => {
  const data = await adminTemplateService.getTemplate({
    templateId: request.params.templateId,
  });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const createAdminTemplate = async (request, response) => {
  const data = await adminTemplateService.createTemplate({
    payload: request.body,
    adminUserId: request.user.id,
    request,
  });
  response.status(201).json(formatSuccessResponse({ statusCode: 201, data }));
};

const updateAdminTemplate = async (request, response) => {
  const data = await adminTemplateService.updateTemplate({
    templateId: request.params.templateId,
    payload: request.body,
    adminUserId: request.user.id,
    request,
  });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const deleteAdminTemplate = async (request, response) => {
  const data = await adminTemplateService.deleteTemplate({
    templateId: request.params.templateId,
    adminUserId: request.user.id,
    request,
  });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const listAdminCategories = async (request, response) => {
  const data = await adminTemplateService.listCategories({
    query: request.query,
  });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const getAdminCategory = async (request, response) => {
  const data = await adminTemplateService.getCategory({
    categoryId: request.params.categoryId,
  });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const createAdminCategory = async (request, response) => {
  const data = await adminTemplateService.createCategory({
    payload: request.body,
    adminUserId: request.user.id,
    request,
  });
  response.status(201).json(formatSuccessResponse({ statusCode: 201, data }));
};

const updateAdminCategory = async (request, response) => {
  const data = await adminTemplateService.updateCategory({
    categoryId: request.params.categoryId,
    payload: request.body,
    adminUserId: request.user.id,
    request,
  });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const deleteAdminCategory = async (request, response) => {
  const data = await adminTemplateService.deleteCategory({
    categoryId: request.params.categoryId,
    adminUserId: request.user.id,
    request,
  });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

export {
  listAdminTemplates,
  getAdminTemplate,
  createAdminTemplate,
  updateAdminTemplate,
  deleteAdminTemplate,
  listAdminCategories,
  getAdminCategory,
  createAdminCategory,
  updateAdminCategory,
  deleteAdminCategory,
};
