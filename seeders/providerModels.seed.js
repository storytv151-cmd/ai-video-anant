import ProviderModel from "../src/models/Provider.js";
import ProviderModelModel from "../src/models/ProviderModel.js";
import { isEmpty } from "./seederUtils.js";

const modelsDefinition = [
  {
    providerSlug: "nano-banana",
    models: [
      {
        name: "Fast",
        slug: "fast",
        credits: 5,
        estimatedTime: 10,
        supportsImage: true,
        supportsVideo: true,
        supportsTextToVideo: true,
        supportsImageToVideo: true,
        maximumDuration: 5,
        maximumResolution: {
          width: 1024,
          height: 768,
          label: "Standard resolution",
        },
      },
      {
        name: "Quality",
        slug: "quality",
        credits: 10,
        estimatedTime: 20,
        supportsImage: true,
        supportsVideo: true,
        supportsTextToVideo: true,
        supportsImageToVideo: true,
        maximumDuration: 10,
        maximumResolution: {
          width: 1920,
          height: 1080,
          label: "High definition",
        },
      },
    ],
  },
  {
    providerSlug: "runway",
    models: [
      {
        name: "Gen4",
        slug: "gen4",
        credits: 25,
        estimatedTime: 45,
        supportsImage: true,
        supportsVideo: true,
        supportsTextToVideo: true,
        supportsImageToVideo: true,
        maximumDuration: 15,
        maximumResolution: { width: 1920, height: 1080, label: "HD Cinematic" },
      },
      {
        name: "Turbo",
        slug: "turbo",
        credits: 15,
        estimatedTime: 15,
        supportsImage: true,
        supportsVideo: true,
        supportsTextToVideo: true,
        supportsImageToVideo: true,
        maximumDuration: 10,
        maximumResolution: { width: 1280, height: 720, label: "Fast HD" },
      },
    ],
  },
  {
    providerSlug: "pika",
    models: [
      {
        name: "Standard",
        slug: "standard",
        credits: 8,
        estimatedTime: 25,
        supportsImage: true,
        supportsVideo: true,
        supportsTextToVideo: true,
        supportsImageToVideo: true,
        maximumDuration: 4,
        maximumResolution: { width: 1280, height: 720, label: "720p" },
      },
      {
        name: "Pro",
        slug: "pro",
        credits: 18,
        estimatedTime: 50,
        supportsImage: true,
        supportsVideo: true,
        supportsTextToVideo: true,
        supportsImageToVideo: true,
        maximumDuration: 8,
        maximumResolution: { width: 1920, height: 1080, label: "1080p" },
      },
    ],
  },
  {
    providerSlug: "luma",
    models: [
      {
        name: "Dream",
        slug: "dream",
        credits: 12,
        estimatedTime: 30,
        supportsImage: true,
        supportsVideo: true,
        supportsTextToVideo: true,
        supportsImageToVideo: true,
        maximumDuration: 5,
        maximumResolution: { width: 1280, height: 720, label: "720p" },
      },
      {
        name: "Dream Pro",
        slug: "dream-pro",
        credits: 22,
        estimatedTime: 60,
        supportsImage: true,
        supportsVideo: true,
        supportsTextToVideo: true,
        supportsImageToVideo: true,
        maximumDuration: 10,
        maximumResolution: { width: 1920, height: 1080, label: "1080p" },
      },
    ],
  },
  {
    providerSlug: "kling",
    models: [
      {
        name: "Standard",
        slug: "standard",
        credits: 10,
        estimatedTime: 30,
        supportsImage: true,
        supportsVideo: true,
        supportsTextToVideo: true,
        supportsImageToVideo: true,
        maximumDuration: 5,
        maximumResolution: { width: 1280, height: 720, label: "720p" },
      },
      {
        name: "Ultra",
        slug: "ultra",
        credits: 20,
        estimatedTime: 60,
        supportsImage: true,
        supportsVideo: true,
        supportsTextToVideo: true,
        supportsImageToVideo: true,
        maximumDuration: 10,
        maximumResolution: { width: 1920, height: 1080, label: "1080p" },
      },
    ],
  },
];

const seed = async (reseed = false) => {
  if (reseed) {
    await ProviderModelModel.deleteMany({});
  }

  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  for (const group of modelsDefinition) {
    const provider = await ProviderModel.findOne({ slug: group.providerSlug });
    if (!provider) {
      continue;
    }

    for (const modelDef of group.models) {
      const existing = await ProviderModelModel.findOne({
        provider: provider._id,
        slug: modelDef.slug,
      });
      const payload = {
        ...modelDef,
        provider: provider._id,
      };

      if (!existing) {
        await ProviderModelModel.create(payload);
        createdCount++;
      } else {
        let updated = false;
        for (const [key, val] of Object.entries(payload)) {
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
