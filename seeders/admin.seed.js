import UserModel from "../src/models/User.js";
import WalletModel from "../src/models/Wallet.js";

const seed = async (_reseed = false) => {
  const existing = await UserModel.findOne({ email: "admin@example.com" });
  if (existing) {
    return { status: "skipped", created: 0, updated: 0, skipped: 1 };
  }

  const admin = await UserModel.create({
    googleId: "super_admin_google_placeholder",
    name: "Super Admin",
    email: "admin@example.com",
    role: "super-admin",
    accountStatus: "active",
    isEmailVerified: true,
  });

  const wallet = await WalletModel.create({
    user: admin._id,
    currentCredits: 100000,
    pendingCredits: 0,
    lockedCredits: 0,
  });

  admin.wallet = wallet._id;
  await admin.save();

  return { status: "created", created: 2, updated: 0, skipped: 0 };
};

export default { seed };
