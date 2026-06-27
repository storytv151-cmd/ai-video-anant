import { connectDatabase, disconnectDatabase } from "../src/config/database.js";
import environment from "../src/config/environment.js";

// Import seeders
import appSettingsSeeder from "./appSettings.seed.js";
import membershipSeeder from "./membership.seed.js";
import creditPackagesSeeder from "./creditPackages.seed.js";
import providersSeeder from "./providers.seed.js";
import providerModelsSeeder from "./providerModels.seed.js";
import categoriesSeeder from "./categories.seed.js";
import featureTogglesSeeder from "./featureToggles.seed.js";
import rewardSettingsSeeder from "./rewardSettings.seed.js";
import couponSeeder from "./coupon.seed.js";
import adminSeeder from "./admin.seed.js";

const run = async () => {
  const args = process.argv.slice(2);
  const reseed = args.includes("--reseed");
  const onlyAdmin = args.includes("--admin");

  // Production safety: block --reseed unless FORCE_RESEED=true in environment/.env
  if (environment.app.env === "production" && reseed) {
    if (process.env.FORCE_RESEED !== "true") {
      console.error(
        "\nERROR: Destructive reseeding (--reseed) is blocked in production environment.",
      );
      console.error(
        "To proceed, set FORCE_RESEED=true in your environment or .env file.\n",
      );
      process.exit(1);
    }
  }

  console.log("Seeding Started...\n");
  const startTime = Date.now();

  try {
    await connectDatabase();
  } catch (error) {
    console.error("Failed to connect to the database:", error);
    process.exit(1);
  }

  const seeders = [
    { name: "App Settings", runner: appSettingsSeeder, runAlways: false },
    { name: "Membership Plans", runner: membershipSeeder, runAlways: false },
    { name: "Credit Packages", runner: creditPackagesSeeder, runAlways: false },
    { name: "Providers", runner: providersSeeder, runAlways: false },
    { name: "Provider Models", runner: providerModelsSeeder, runAlways: false },
    { name: "Categories", runner: categoriesSeeder, runAlways: false },
    { name: "Feature Toggles", runner: featureTogglesSeeder, runAlways: false },
    { name: "Rewards", runner: rewardSettingsSeeder, runAlways: false },
    { name: "Coupons", runner: couponSeeder, runAlways: false },
    { name: "Super Admin", runner: adminSeeder, runAlways: true },
  ];

  let totalCreated = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;
  let failedCount = 0;
  const failedSeeders = [];

  for (const seeder of seeders) {
    if (onlyAdmin && !seeder.runAlways) {
      continue;
    }

    console.log(`Running ${seeder.name} Seeder...`);

    try {
      const result = await seeder.runner.seed(reseed);
      totalCreated += result.created || 0;
      totalUpdated += result.updated || 0;
      totalSkipped += result.skipped || 0;

      if (result.status === "created") {
        console.log("✓ Created\n");
      } else if (result.status === "updated") {
        console.log("✓ Updated\n");
      } else {
        console.log("✓ Skipped\n");
      }
    } catch (error) {
      console.error(`✗ Failed: ${error.message}`);
      console.error(error.stack);
      console.log();
      failedCount++;
      failedSeeders.push(seeder.name);
    }
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log("======================================");
  if (failedCount === 0) {
    console.log("Seeding Completed Successfully");
  } else {
    console.log(`Seeding Completed with ${failedCount} failure(s)`);
    console.log(`Failed Seeders: ${failedSeeders.join(", ")}`);
  }
  console.log("--------------------------------------");
  console.log(`Created Records: ${totalCreated}`);
  console.log(`Updated Records: ${totalUpdated}`);
  console.log(`Skipped Records: ${totalSkipped}`);
  console.log(`Failed Records : ${failedCount}`);
  console.log(`Execution Time : ${durationSec}s`);
  console.log("======================================\n");

  try {
    await disconnectDatabase();
  } catch (error) {
    console.error("Failed to disconnect database gracefully:", error);
  }

  process.exit(failedCount > 0 ? 1 : 0);
};

run();
