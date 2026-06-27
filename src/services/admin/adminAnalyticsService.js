import FileAssetModel from "../../models/FileAsset.js";
import PaymentModel from "../../models/Payment.js";
import ProviderModel from "../../models/Provider.js";
import UserModel from "../../models/User.js";
import VideoGenerationJobModel from "../../models/VideoGenerationJob.js";
import adminQueryService from "./adminQueryService.js";

const defaultDateRange = () => {
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(end.getUTCDate() - 30);
  return { start, end };
};

const resolveDateRange = ({ query = {} } = {}) => {
  const fallback = defaultDateRange();
  return {
    start:
      adminQueryService.buildDateRange({ from: query.dateFrom || query.from })
        ?.$gte || fallback.start,
    end:
      adminQueryService.buildDateRange({ to: query.dateTo || query.to })
        ?.$lte || fallback.end,
  };
};

const getAnalyticsOverview = async ({ query = {} } = {}) => {
  const { start, end } = resolveDateRange({ query });
  const matchCreated = { createdAt: { $gte: start, $lte: end } };

  const [
    revenueRows,
    usersRows,
    generationCount,
    providerUsage,
    subscriptionRevenueRows,
    topCountries,
    topTemplates,
    topProviders,
    storageRows,
    failedJobs,
    totalJobs,
  ] = await Promise.all([
    PaymentModel.aggregate([
      { $match: { ...matchCreated, status: "success" } },
      {
        $group: {
          _id: null,
          revenue: { $sum: "$amount" },
          paymentRevenue: {
            $sum: {
              $cond: [
                { $eq: ["$paymentType", "credit_purchase"] },
                "$amount",
                0,
              ],
            },
          },
          subscriptionRevenue: {
            $sum: {
              $cond: [{ $eq: ["$paymentType", "subscription"] }, "$amount", 0],
            },
          },
        },
      },
    ]),
    UserModel.aggregate([
      { $match: matchCreated },
      {
        $group: {
          _id: null,
          dailyUsers: { $sum: 1 },
          monthlyUsers: { $sum: 1 },
        },
      },
    ]),
    VideoGenerationJobModel.countDocuments(matchCreated),
    VideoGenerationJobModel.aggregate([
      { $match: matchCreated },
      {
        $group: {
          _id: "$provider",
          count: { $sum: 1 },
          creditsUsed: { $sum: "$creditsCharged" },
        },
      },
      { $sort: { count: -1 } },
    ]),
    PaymentModel.aggregate([
      {
        $match: {
          ...matchCreated,
          status: "success",
          paymentType: "subscription",
        },
      },
      { $group: { _id: null, revenue: { $sum: "$amount" } } },
    ]),
    UserModel.aggregate([
      { $match: { ...matchCreated, country: { $ne: null } } },
      { $group: { _id: "$country", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
    VideoGenerationJobModel.aggregate([
      { $match: { ...matchCreated, template: { $ne: null } } },
      { $group: { _id: "$template", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
    ProviderModel.find({})
      .select({ _id: 1, name: 1, slug: 1, totalRequests: 1, failedRequests: 1 })
      .lean(),
    FileAssetModel.aggregate([
      {
        $group: {
          _id: null,
          sizeInBytes: { $sum: "$sizeInBytes" },
          fileCount: { $sum: 1 },
        },
      },
    ]),
    VideoGenerationJobModel.countDocuments({
      ...matchCreated,
      status: "failed",
    }),
    VideoGenerationJobModel.countDocuments(matchCreated),
  ]);

  const revenue = revenueRows?.[0] || {
    revenue: 0,
    paymentRevenue: 0,
    subscriptionRevenue: 0,
  };
  return {
    range: { start, end },
    revenue: revenue.revenue || 0,
    paymentRevenue: revenue.paymentRevenue || 0,
    subscriptionRevenue:
      subscriptionRevenueRows?.[0]?.revenue || revenue.subscriptionRevenue || 0,
    dailyUsers: usersRows?.[0]?.dailyUsers || 0,
    monthlyUsers: usersRows?.[0]?.monthlyUsers || 0,
    generationCount,
    creditsUsed: providerUsage.reduce(
      (sum, item) => sum + Number(item.creditsUsed || 0),
      0,
    ),
    providerUsage,
    topTemplates,
    topProviders,
    topCountries,
    storageUsage: storageRows?.[0] || { sizeInBytes: 0, fileCount: 0 },
    errorRate: totalJobs > 0 ? failedJobs / totalJobs : 0,
  };
};

const adminAnalyticsService = Object.freeze({
  getAnalyticsOverview,
});

export default adminAnalyticsService;
