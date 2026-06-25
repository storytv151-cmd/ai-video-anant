/**
 * Wallet bootstrap service handles initial wallet creation and optional welcome bonus.
 * It keeps credit mutations consistent with the wallet rule:
 * CreditTransaction -> Wallet update -> commit.
 */
import mongoose from 'mongoose';
import AppSettingModel from '../../models/AppSetting.js';
import CreditTransactionModel from '../../models/CreditTransaction.js';
import WalletModel from '../../models/Wallet.js';

const getRewardSettings = async ({ session } = {}) => {
  const query = AppSettingModel.findOne({ section: 'REWARDS', key: 'global' });
  if (session) {
    query.session(session);
  }
  return query;
};

const ensureWalletForUser = async ({ user, session }) => {
  if (user.wallet) {
    const existing = await WalletModel.findById(user.wallet).session(session);
    if (existing) {
      return existing;
    }
  }

  const createdWallet = await WalletModel.create(
    [
      {
        user: user._id,
      },
    ],
    { session },
  );

  const wallet = createdWallet[0];
  user.wallet = wallet._id;
  await user.save({ session });

  return wallet;
};

const applyWelcomeBonusIfEligible = async ({ user, wallet, createdBy = null, session }) => {
  const settings = await getRewardSettings({ session });
  const enabled = Boolean(settings?.welcomeBonus?.enabled);
  const credits = Number(settings?.welcomeBonus?.credits || 0);

  if (!enabled) {
    return { applied: false, creditsGranted: 0 };
  }

  if (!Number.isFinite(credits) || credits <= 0) {
    return { applied: false, creditsGranted: 0 };
  }

  const balanceBefore = wallet.currentCredits;
  const balanceAfter = balanceBefore + credits;

  await CreditTransactionModel.create(
    [
      {
        wallet: wallet._id,
        user: user._id,
        type: 'welcome_bonus',
        status: 'success',
        source: 'WelcomeBonus',
        purpose: 'welcome_bonus',
        credits,
        balanceBefore,
        balanceAfter,
        referenceType: 'system',
        referenceId: null,
        description: 'Welcome bonus credits granted.',
        createdBy,
      },
    ],
    { session },
  );

  wallet.currentCredits = balanceAfter;
  wallet.totalRewarded += credits;
  wallet.lifetimeCredits += credits;
  await wallet.save({ session });

  return { applied: true, creditsGranted: credits };
};

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

const walletBootstrapService = Object.freeze({
  withTransaction,
  ensureWalletForUser,
  applyWelcomeBonusIfEligible,
});

export default walletBootstrapService;
