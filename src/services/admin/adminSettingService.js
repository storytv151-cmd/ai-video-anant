import AppSettingModel from '../../models/AppSetting.js';
import FileAssetModel from '../../models/FileAsset.js';
import ApiError from '../../utils/ApiError.js';
import adminAuditService from './adminAuditService.js';
import adminQueryService from './adminQueryService.js';

const listSettings = async ({ query = {} } = {}) => {
  const filter = {};
  if (query.section) {
    filter.section = String(query.section).trim().toUpperCase();
  }
  if (query.key) {
    filter.key = String(query.key).trim().toLowerCase();
  }

  const items = await AppSettingModel.find(filter).withDeleted().sort({ section: 1, key: 1 }).lean();
  return { items };
};

const getSetting = async ({ section = 'GENERAL', key = 'global' } = {}) => {
  const doc = await AppSettingModel.findOne({
    section: String(section).trim().toUpperCase(),
    key: String(key).trim().toLowerCase(),
  })
    .withDeleted()
    .lean();
  if (!doc) {
    throw new ApiError(404, 'Setting not found.', { code: 'SETTING_NOT_FOUND' });
  }
  return doc;
};

const updateSetting = async ({
  section = 'GENERAL',
  key = 'global',
  payload = {},
  adminUserId = null,
  request = null,
} = {}) => {
  const normalizedSection = String(section).trim().toUpperCase();
  const normalizedKey = String(key).trim().toLowerCase();

  let doc = await AppSettingModel.findOne({ section: normalizedSection, key: normalizedKey }).withDeleted();
  if (!doc) {
    doc = new AppSettingModel({ section: normalizedSection, key: normalizedKey });
  }

  const safePayload = { ...payload };
  delete safePayload.section;
  delete safePayload.key;
  Object.assign(doc, safePayload);
  await doc.save();

  await adminAuditService.logAdminAction({
    request,
    adminUserId,
    action: 'ADMIN_SETTING_UPDATED',
    targetType: 'AppSetting',
    targetId: doc._id,
    metadata: { section: normalizedSection, key: normalizedKey },
  });

  return doc.toObject();
};

const getStorageOverview = async ({ query = {} } = {}) => {
  const filter = {};
  if (query.status) {
    filter.status = String(query.status).trim();
  }
  if (query.folder) {
    filter.folder = String(query.folder).trim();
  }

  const items = await FileAssetModel.find(filter)
    .sort({ createdAt: -1 })
    .limit(Math.min(adminQueryService.parsePositiveInt(query.limit, 50), 200))
    .lean();

  const [summary] = await FileAssetModel.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        fileCount: { $sum: 1 },
        sizeInBytes: { $sum: '$sizeInBytes' },
      },
    },
  ]);

  return {
    summary: summary || { fileCount: 0, sizeInBytes: 0 },
    items,
  };
};

const adminSettingService = Object.freeze({
  listSettings,
  getSetting,
  updateSetting,
  getStorageOverview,
});

export default adminSettingService;
