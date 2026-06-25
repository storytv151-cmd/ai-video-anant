import ProviderModel from '../../models/Provider.js';

const buildAverageUpdatePipeline = ({ responseTimeMs, success }) => [
  {
    $set: {
      totalRequests: { $add: ['$totalRequests', 1] },
      successfulRequests: success ? { $add: ['$successfulRequests', 1] } : '$successfulRequests',
      failedRequests: success ? '$failedRequests' : { $add: ['$failedRequests', 1] },
      errorCount: success ? '$errorCount' : { $add: ['$errorCount', 1] },
      lastSuccessAt: success ? '$$NOW' : '$lastSuccessAt',
      lastFailureAt: success ? '$lastFailureAt' : '$$NOW',
      averageResponseTimeMs: {
        $cond: [
          { $lte: ['$totalRequests', 0] },
          Number(responseTimeMs),
          {
            $divide: [
              {
                $add: [{ $multiply: ['$averageResponseTimeMs', '$totalRequests'] }, Number(responseTimeMs)],
              },
              { $add: ['$totalRequests', 1] },
            ],
          },
        ],
      },
    },
  },
];

const recordProviderRequest = async ({ providerId, responseTimeMs = 0, success = true } = {}) => {
  if (!providerId) {
    return null;
  }

  const rt = Number.isFinite(Number(responseTimeMs)) && Number(responseTimeMs) >= 0 ? Number(responseTimeMs) : 0;

  try {
    await ProviderModel.updateOne({ _id: providerId }, buildAverageUpdatePipeline({ responseTimeMs: rt, success }));
    return null;
  } catch {
    const update = {
      $inc: {
        totalRequests: 1,
        successfulRequests: success ? 1 : 0,
        failedRequests: success ? 0 : 1,
        errorCount: success ? 0 : 1,
      },
      $set: {
        ...(success ? { lastSuccessAt: new Date() } : { lastFailureAt: new Date() }),
      },
    };
    await ProviderModel.updateOne({ _id: providerId }, update);
    return null;
  }
};

const providerMetricsService = Object.freeze({
  recordProviderRequest,
});

export default providerMetricsService;
