import { formatSuccessResponse } from '../utils/responseFormatter.js';
import adminSettingService from '../services/admin/adminSettingService.js';

const listAdminSettings = async (request, response) => {
  const data = await adminSettingService.listSettings({ query: request.query });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const getAdminSetting = async (request, response) => {
  const data = await adminSettingService.getSetting({
    section: request.params.section,
    key: request.params.key,
  });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const updateAdminSetting = async (request, response) => {
  const data = await adminSettingService.updateSetting({
    section: request.params.section,
    key: request.params.key,
    payload: request.body,
    adminUserId: request.user.id,
    request,
  });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const getAdminStorageOverview = async (request, response) => {
  const data = await adminSettingService.getStorageOverview({ query: request.query });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

export { listAdminSettings, getAdminSetting, updateAdminSetting, getAdminStorageOverview };
