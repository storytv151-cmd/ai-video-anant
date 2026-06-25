import AppSettingModel from '../../models/AppSetting.js';
import FileAssetModel from '../../models/FileAsset.js';
import { applicationLogger as infoLogger } from '../../config/logger.js';
import storageService from './storageService.js';

const parseRetentionHours = (settings) => {
  const hours = Number(settings?.storageSettings?.temporaryRetentionHours ?? settings?.temporaryRetentionHours ?? 24);
  return Number.isFinite(hours) && hours > 0 ? Math.min(hours, 24 * 30) : 24;
};

const cleanupTemporaryAssetsOnce = async () => {
  const settings = await AppSettingModel.findOne({ section: 'STORAGE', key: 'global' }).lean();
  const retentionHours = parseRetentionHours(settings);
  const cutoff = new Date(Date.now() - retentionHours * 60 * 60 * 1000);

  const candidates = await FileAssetModel.find({
    status: { $in: ['Temporary', 'Uploaded', 'Processing', 'Failed'] },
    createdAt: { $lt: cutoff },
  })
    .limit(250)
    .lean();

  let deletedCount = 0;
  for (const asset of candidates) {
    try {
      await storageService.deleteByKey({ storageKey: asset.storageKey });
      await FileAssetModel.updateOne(
        { _id: asset._id },
        { $set: { status: 'Deleted', isDeleted: true, deletedAt: new Date() } },
      );
      deletedCount += 1;
    } catch {
      await FileAssetModel.updateOne({ _id: asset._id }, { $set: { status: 'Failed' } });
    }
  }

  infoLogger.info('Temporary asset cleanup completed.', { retentionHours, deletedCount, scanned: candidates.length });
  return { deletedCount, scanned: candidates.length, retentionHours };
};

const cleanupService = Object.freeze({
  cleanupTemporaryAssetsOnce,
});

export default cleanupService;

