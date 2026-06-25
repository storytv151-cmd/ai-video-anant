import ProviderModel from '../../models/Provider.js';
import VideoGenerationJobModel from '../../models/VideoGenerationJob.js';

const buildCompletedOutputUnitsExpression = (outputType) => ({
  $cond: [
    {
      $and: [
        { $eq: ['$status', 'completed'] },
        { $eq: ['$outputType', outputType] },
      ],
    },
    {
      $cond: [
        { $gt: [{ $size: { $ifNull: ['$outputAssets', []] } }, 0] },
        { $size: { $ifNull: ['$outputAssets', []] } },
        1,
      ],
    },
    0,
  ],
});

const buildProcessingTimeExpression = () => ({
  $cond: [
    { $gt: ['$actualProcessingTimeMs', 0] },
    '$actualProcessingTimeMs',
    {
      $cond: [
        {
          $and: [
            { $ne: ['$startedAt', null] },
            { $ne: ['$completedAt', null] },
          ],
        },
        { $subtract: ['$completedAt', '$startedAt'] },
        null,
      ],
    },
  ],
});

const summarizeByFilter = async ({ filter = {} } = {}) => {
  const [totalsRows, providerUsageRows, generationTypeRows] = await Promise.all([
    VideoGenerationJobModel.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalJobs: { $sum: 1 },
          completedJobs: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          failedJobs: { $sum: { $cond: [{ $in: ['$status', ['failed', 'timeout']] }, 1, 0] } },
          creditsUsed: { $sum: { $ifNull: ['$creditsUsed', 0] } },
          imagesGenerated: { $sum: buildCompletedOutputUnitsExpression('image') },
          videosGenerated: { $sum: buildCompletedOutputUnitsExpression('video') },
          audioGenerated: { $sum: buildCompletedOutputUnitsExpression('audio') },
          averageGenerationTimeMs: { $avg: buildProcessingTimeExpression() },
        },
      },
    ]),
    VideoGenerationJobModel.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$provider',
          totalJobs: { $sum: 1 },
          completedJobs: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          failedJobs: { $sum: { $cond: [{ $in: ['$status', ['failed', 'timeout']] }, 1, 0] } },
          creditsUsed: { $sum: { $ifNull: ['$creditsUsed', 0] } },
        },
      },
      { $sort: { totalJobs: -1, completedJobs: -1 } },
    ]),
    VideoGenerationJobModel.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$generationType',
          totalJobs: { $sum: 1 },
          completedJobs: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          failedJobs: { $sum: { $cond: [{ $in: ['$status', ['failed', 'timeout']] }, 1, 0] } },
          creditsUsed: { $sum: { $ifNull: ['$creditsUsed', 0] } },
        },
      },
      { $sort: { totalJobs: -1, completedJobs: -1 } },
    ]),
  ]);

  const totals = totalsRows[0] || {};
  const providerIds = providerUsageRows.map((row) => row._id).filter(Boolean);
  const providers = providerIds.length
    ? await ProviderModel.find({ _id: { $in: providerIds } }).select({ name: 1, slug: 1 }).lean()
    : [];
  const providerMap = new Map(providers.map((provider) => [String(provider._id), provider]));

  const totalJobs = Number(totals.totalJobs || 0);
  const failedJobs = Number(totals.failedJobs || 0);

  return {
    totals: {
      totalJobs,
      completedJobs: Number(totals.completedJobs || 0),
      failedJobs,
      imagesGenerated: Number(totals.imagesGenerated || 0),
      videosGenerated: Number(totals.videosGenerated || 0),
      audioGenerated: Number(totals.audioGenerated || 0),
      averageGenerationTimeMs: totals.averageGenerationTimeMs ? Math.round(Number(totals.averageGenerationTimeMs)) : null,
      failureRate: totalJobs > 0 ? Number((failedJobs / totalJobs).toFixed(4)) : 0,
      creditsUsed: Number(totals.creditsUsed || 0),
    },
    providerUsage: providerUsageRows.map((row) => {
      const provider = providerMap.get(String(row._id));
      return {
        providerId: row._id || null,
        providerSlug: provider?.slug || null,
        providerName: provider?.name || null,
        totalJobs: Number(row.totalJobs || 0),
        completedJobs: Number(row.completedJobs || 0),
        failedJobs: Number(row.failedJobs || 0),
        creditsUsed: Number(row.creditsUsed || 0),
      };
    }),
    generationTypeUsage: generationTypeRows.map((row) => ({
      generationType: row._id || null,
      totalJobs: Number(row.totalJobs || 0),
      completedJobs: Number(row.completedJobs || 0),
      failedJobs: Number(row.failedJobs || 0),
      creditsUsed: Number(row.creditsUsed || 0),
    })),
  };
};

const generationAnalyticsService = Object.freeze({
  summarizeByFilter,
});

export default generationAnalyticsService;
