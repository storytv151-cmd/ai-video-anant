import { formatSuccessResponse } from "../utils/responseFormatter.js";
import adminFutureReadyService from "../services/admin/adminFutureReadyService.js";

const getOrganizations = async (request, response) => {
  const data = await adminFutureReadyService.getOrganizations({
    query: request.query,
  });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const createOrganization = async (request, response) => {
  const data = await adminFutureReadyService.createOrganization({
    payload: request.body,
    adminUserId: request.user.id,
    request,
  });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const getTeams = async (request, response) => {
  const data = await adminFutureReadyService.getTeams({ query: request.query });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const createTeam = async (request, response) => {
  const data = await adminFutureReadyService.createTeam({
    payload: request.body,
    adminUserId: request.user.id,
    request,
  });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const getRegionalAdmins = async (request, response) => {
  const data = await adminFutureReadyService.getRegionalAdmins({
    query: request.query,
  });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const updateWhiteLabelConfig = async (request, response) => {
  const data = await adminFutureReadyService.updateWhiteLabelConfig({
    payload: request.body,
    adminUserId: request.user.id,
    request,
  });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const getTenants = async (request, response) => {
  const data = await adminFutureReadyService.getTenants({
    query: request.query,
  });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const getSupportTickets = async (request, response) => {
  const data = await adminFutureReadyService.getSupportTickets({
    query: request.query,
  });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const addInternalNote = async (request, response) => {
  const data = await adminFutureReadyService.addInternalNote({
    targetType: request.body.targetType,
    targetId: request.body.targetId,
    note: request.body.note,
    adminUserId: request.user.id,
    request,
  });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const submitApprovalWorkflow = async (request, response) => {
  const data = await adminFutureReadyService.submitApprovalWorkflow({
    actionType: request.body.actionType,
    targetId: request.body.targetId,
    payload: request.body.payload,
    adminUserId: request.user.id,
    request,
  });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const executeBulkOperation = async (request, response) => {
  const data = await adminFutureReadyService.executeBulkOperation({
    operation: request.body.operation,
    targetIds: request.body.targetIds,
    payload: request.body.payload,
    adminUserId: request.user.id,
    request,
  });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const exportCsv = async (request, response) => {
  const data = await adminFutureReadyService.exportCsv({
    resource: request.query.resource || "users",
    query: request.query,
    adminUserId: request.user.id,
    request,
  });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

export {
  getOrganizations,
  createOrganization,
  getTeams,
  createTeam,
  getRegionalAdmins,
  updateWhiteLabelConfig,
  getTenants,
  getSupportTickets,
  addInternalNote,
  submitApprovalWorkflow,
  executeBulkOperation,
  exportCsv,
};
