import ProviderModel from "../src/models/Provider.js";
import { isEmpty } from "./seederUtils.js";

const defaultProviders = [
  {
    name: "Nano Banana",
    slug: "nano-banana",
    enabled: true,
    priority: 1,
    healthStatus: "healthy",
    timeout: 30000,
    retryCount: 2,
    dailyLimit: 5000,
    supportsImage: true,
    supportsVideo: true,
    supportsAudio: false,
    supportsTextToImage: true,
    supportsImageToImage: true,
    supportsTextToVideo: true,
    supportsImageToVideo: true,
    metadata: {
      description: "Nano Banana engine for fast media synthesis.",
    },
  },
  {
    name: "Kling",
    slug: "kling",
    enabled: true,
    priority: 2,
    healthStatus: "healthy",
    timeout: 90000,
    retryCount: 1,
    dailyLimit: 2000,
    supportsImage: true,
    supportsVideo: true,
    supportsAudio: false,
    supportsTextToImage: true,
    supportsImageToImage: true,
    supportsTextToVideo: true,
    supportsImageToVideo: true,
    metadata: {
      description: "Kling AI video generation model.",
    },
  },
  {
    name: "Runway",
    slug: "runway",
    enabled: true,
    priority: 3,
    healthStatus: "healthy",
    timeout: 120000,
    retryCount: 1,
    dailyLimit: 2000,
    supportsImage: true,
    supportsVideo: true,
    supportsAudio: true,
    supportsTextToImage: true,
    supportsImageToImage: true,
    supportsTextToVideo: true,
    supportsImageToVideo: true,
    metadata: {
      description: "Runway Gen-3 and future model suites.",
    },
  },
  {
    name: "Pika",
    slug: "pika",
    enabled: true,
    priority: 4,
    healthStatus: "healthy",
    timeout: 60000,
    retryCount: 2,
    dailyLimit: 3000,
    supportsImage: true,
    supportsVideo: true,
    supportsAudio: true,
    supportsTextToImage: true,
    supportsImageToImage: true,
    supportsTextToVideo: true,
    supportsImageToVideo: true,
    metadata: {
      description: "Pika Labs animation provider.",
    },
  },
  {
    name: "Luma",
    slug: "luma",
    enabled: true,
    priority: 5,
    healthStatus: "healthy",
    timeout: 90000,
    retryCount: 2,
    dailyLimit: 4000,
    supportsImage: true,
    supportsVideo: true,
    supportsAudio: false,
    supportsTextToImage: true,
    supportsImageToImage: true,
    supportsTextToVideo: true,
    supportsImageToVideo: true,
    metadata: {
      description: "Luma Dream Machine engine.",
    },
  },
];

const seed = async (reseed = false) => {
  if (reseed) {
    await ProviderModel.deleteMany({});
  }

  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  for (const defaultProv of defaultProviders) {
    const existing = await ProviderModel.findOne({ slug: defaultProv.slug });
    if (!existing) {
      await ProviderModel.create(defaultProv);
      createdCount++;
    } else {
      let updated = false;
      for (const [key, val] of Object.entries(defaultProv)) {
        if (isEmpty(existing[key])) {
          existing[key] = val;
          updated = true;
        }
      }
      if (updated) {
        await existing.save();
        updatedCount++;
      } else {
        skippedCount++;
      }
    }
  }

  return {
    status:
      createdCount > 0 ? "created" : updatedCount > 0 ? "updated" : "skipped",
    created: createdCount,
    updated: updatedCount,
    skipped: skippedCount,
  };
};

export default { seed };
