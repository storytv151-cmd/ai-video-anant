import FileAssetModel from '../../models/FileAsset.js';
import PaymentModel from '../../models/Payment.js';
import ProviderModel from '../../models/Provider.js';
import UserModel from '../../models/User.js';
import VideoGenerationJobModel from '../../models/VideoGenerationJob.js';
import WalletModel from '../../models/Wallet.js';

const startOfTodayUtc = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
};

const getDashboard = async () => {
  const today = startOfTodayUtc();

  const [
    paymentRows,
    todayUsers,
    todayGenerations,
    todayPurchases,
    todaySubscriptions,
    providerHealthRows,
    queueRows,
    storageRows,
    walletRows,
  ] = await Promise.all([
    PaymentModel.aggregate([
      { $match: { status: 'success', createdAt: { $gte: today } } },
      { $group: { _id: null, amount: { $sum: '$amount' } } },
    ]),
    UserModel.countDocuments({ createdAt: { $gte: today } }),
    VideoGenerationJobModel.countDocuments({ createdAt: { $gte: today } }),
    PaymentModel.countDocuments({ createdAt: { $gte: today } }),
    UserModel.countDocuments({ 'subscription.currentPeriodStartAt': { $gte: today } }),
    ProviderModel.aggregate([
      { $group: { _id: '$healthStatus', count: { $sum: 1 } } },
    ]),
    VideoGenerationJobModel.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    FileAssetModel.aggregate([
      { $group: { _id: '$status', files: { $sum: 1 }, sizeInBytes: { $sum: '$sizeInBytes' } } },
    ]),
    WalletModel.aggregate([
      {
        $group: {
          _id: null,
          currentCredits: { $sum: '$currentCredits' },
          pendingCredits: { $sum: '$pendingCredits' },
          lockedCredits: { $sum: '$lockedCredits' },
          totalPurchased: { $sum: '$totalPurchased' },
          totalUsed: { $sum: '$totalUsed' },
          totalRewarded: { $sum: '$totalRewarded' },
          totalRefunded: { $sum: '$totalRefunded' },
          walletCount: { $sum: 1 },
        },
      },
    ]),
  ]);

  return {
    todaysRevenue: paymentRows?.[0]?.amount || 0,
    todaysUsers: todayUsers,
    todaysGenerations: todayGenerations,
    todaysPurchases: todayPurchases,
    todaysSubscriptions: todaySubscriptions,
    providerHealth: providerHealthRows.map((item) => ({ status: item._id, count: item.count })),
    queueStatus: queueRows.map((item) => ({ status: item._id, count: item.count })),
    storageUsage: storageRows.map((item) => ({
      status: item._id,
      files: item.files,
      sizeInBytes: item.sizeInBytes,
    })),
    walletStatistics: walletRows?.[0] || {
      currentCredits: 0,
      pendingCredits: 0,
      lockedCredits: 0,
      totalPurchased: 0,
      totalUsed: 0,
      totalRewarded: 0,
      totalRefunded: 0,
      walletCount: 0,
    },
  };
};

const adminDashboardService = Object.freeze({
  getDashboard,
});

export default adminDashboardService;
