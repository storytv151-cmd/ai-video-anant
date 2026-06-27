/**
 * Wallet bootstrap service for wallet module.
 * Ensures a wallet exists for a user and provides transaction helper scaffolding.
 */
import mongoose from "mongoose";
import UserModel from "../../models/User.js";
import WalletModel from "../../models/Wallet.js";
import ApiError from "../../utils/ApiError.js";

const withTransaction = async (handler) => {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await handler(session);
    });
    return result;
  } finally {
    session.endSession();
  }
};

const ensureWallet = async ({ userId, session }) => {
  const user = await UserModel.findById(userId).session(session);
  if (!user) {
    throw new ApiError(404, "User not found.", { code: "USER_NOT_FOUND" });
  }

  let wallet = await WalletModel.findOne({ user: userId }).session(session);
  if (wallet) {
    return wallet;
  }

  const created = await WalletModel.create([{ user: userId }], { session });
  wallet = created[0];

  user.wallet = wallet._id;
  await user.save({ session });

  return wallet;
};

const walletBootstrapService = Object.freeze({ withTransaction, ensureWallet });

export default walletBootstrapService;
