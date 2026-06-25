/**
 * Reward service.
 * Implements reward and incentive credit operations using AppSetting-driven configuration.
 * All wallet changes follow the engine flow:
 * Validate -> Create CreditTransaction -> Update Wallet -> Commit -> Return.
 */
import ApiError from '../../utils/ApiError.js';
import AppSettingModel from '../../models/AppSetting.js';
import CouponModel from '../../models/Coupon.js';
import CreditTransactionModel from '../../models/CreditTransaction.js';
import DailyCheckinModel from '../../models/DailyCheckin.js';
import RewardHistoryModel from '../../models/RewardHistory.js';
import creditTransactionService from './creditTransactionService.js';
import walletValidationService from './walletValidationService.js';
import walletBootstrapService from './walletBootstrapService.js';

const getRewardsSettings = async ({ session } = {}) => {
  const query = AppSettingModel.findOne({ section: 'REWARDS', key: 'global' });
  if (session) {
    query.session(session);
  }
  return query.lean();
};

const getPaymentsSettings = async ({ session } = {}) => {
  const query = AppSettingModel.findOne({ section: 'PAYMENTS', key: 'global' });
  if (session) {
    query.session(session);
  }
  return query.lean();
};

const getStartOfTodayUtc = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
};

const createRewardHistory = async ({ session, userId, rewardType, credits, source, referenceType, referenceId }) => {
  const docs = await RewardHistoryModel.create(
    [
      {
        user: userId,
        rewardType,
        credits,
        source,
        reference: {
          type: referenceType || null,
          id: referenceId || null,
        },
      },
    ],
    { session },
  );
  return docs[0];
};

const grantCredits = async ({
  session,
  userId,
  wallet,
  credits,
  type,
  source,
  purpose,
  description,
  referenceType,
  referenceId,
}) => {
  const balanceBefore = wallet.currentCredits;
  const balanceAfter = balanceBefore + credits;

  const transaction = await creditTransactionService.createTransaction({
    session,
    walletId: wallet._id,
    userId,
    type,
    status: 'success',
    source,
    purpose,
    credits,
    balanceBefore,
    balanceAfter,
    referenceType,
    referenceId,
    description,
  });

  wallet.currentCredits = balanceAfter;
  wallet.totalRewarded += credits;
  wallet.lifetimeCredits += credits;
  await wallet.save({ session });

  return transaction;
};

const claimWelcomeBonus = async ({ userId }) =>
  walletBootstrapService.withTransaction(async (session) => {
    const [wallet, rewardsSettings] = await Promise.all([
      walletBootstrapService.ensureWallet({ userId, session }),
      getRewardsSettings({ session }),
    ]);

    const enabled = Boolean(rewardsSettings?.welcomeBonus?.enabled);
    const credits = Number(rewardsSettings?.welcomeBonus?.credits || 0);

    if (!enabled) {
      throw new ApiError(403, 'Welcome bonus is disabled.', { code: 'REWARD_DISABLED' });
    }

    if (!Number.isFinite(credits) || credits <= 0) {
      throw new ApiError(500, 'Welcome bonus credits are not configured.', { code: 'REWARD_CONFIG_INVALID' });
    }

    const alreadyClaimed = await RewardHistoryModel.countDocuments({
      user: userId,
      rewardType: 'welcome',
      createdAt: { $gte: new Date(0) },
    }).session(session);

    if (alreadyClaimed > 0) {
      throw new ApiError(409, 'Welcome bonus already claimed.', { code: 'REWARD_ALREADY_CLAIMED' });
    }

    const transaction = await grantCredits({
      session,
      userId,
      wallet,
      credits,
      type: 'welcome_bonus',
      source: 'WelcomeBonus',
      purpose: 'welcome_bonus',
      description: 'Welcome bonus credits granted.',
      referenceType: 'system',
      referenceId: null,
    });

    await createRewardHistory({
      session,
      userId,
      rewardType: 'welcome',
      credits,
      source: 'WelcomeBonus',
      referenceType: 'CreditTransaction',
      referenceId: transaction._id,
    });

    return { credits, transactionId: transaction._id };
  });

const claimDailyBonus = async ({ userId }) =>
  walletBootstrapService.withTransaction(async (session) => {
    const [wallet, rewardsSettings] = await Promise.all([
      walletBootstrapService.ensureWallet({ userId, session }),
      getRewardsSettings({ session }),
    ]);

    const enabled = Boolean(rewardsSettings?.dailyCheckin?.enabled);
    const rewards = Array.isArray(rewardsSettings?.dailyCheckin?.rewards) ? rewardsSettings.dailyCheckin.rewards : [];
    const streakResetHours = Number(rewardsSettings?.dailyCheckin?.streakResetHours || 24);

    if (!enabled) {
      throw new ApiError(403, 'Daily bonus is disabled.', { code: 'REWARD_DISABLED' });
    }

    if (rewards.length === 0) {
      throw new ApiError(500, 'Daily bonus rewards are not configured.', { code: 'REWARD_CONFIG_INVALID' });
    }

    const startOfToday = getStartOfTodayUtc();
    const alreadyClaimed = await RewardHistoryModel.countDocuments({
      user: userId,
      rewardType: 'daily',
      createdAt: { $gte: startOfToday },
    }).session(session);

    if (alreadyClaimed > 0) {
      throw new ApiError(409, 'Daily bonus already claimed today.', { code: 'REWARD_ALREADY_CLAIMED' });
    }

    const dailyDoc =
      (await DailyCheckinModel.findOne({ user: userId }).session(session)) ||
      (await DailyCheckinModel.create([{ user: userId }], { session }).then((docs) => docs[0]));

    const lastCheckin = dailyDoc.lastCheckin ? new Date(dailyDoc.lastCheckin) : null;
    const isSameDay = lastCheckin && lastCheckin >= startOfToday;

    if (isSameDay) {
      throw new ApiError(409, 'Daily bonus already claimed today.', { code: 'REWARD_ALREADY_CLAIMED' });
    }

    const canContinueStreak =
      lastCheckin &&
      Number.isFinite(streakResetHours) &&
      streakResetHours > 0 &&
      Date.now() - lastCheckin.getTime() <= streakResetHours * 60 * 60 * 1000;

    const nextStreak = canContinueStreak ? (Number(dailyDoc.currentStreak || 0) + 1) : 1;
    const rewardIndex = (nextStreak - 1) % rewards.length;
    const credits = Number(rewards[rewardIndex] || 0);

    if (!Number.isFinite(credits) || credits <= 0) {
      throw new ApiError(500, 'Daily bonus reward value is invalid.', { code: 'REWARD_CONFIG_INVALID' });
    }

    const transaction = await grantCredits({
      session,
      userId,
      wallet,
      credits,
      type: 'daily_bonus',
      source: 'DailyBonus',
      purpose: 'daily_bonus',
      description: 'Daily bonus credits granted.',
      referenceType: 'DailyCheckin',
      referenceId: dailyDoc._id,
    });

    dailyDoc.currentStreak = nextStreak;
    dailyDoc.longestStreak = Math.max(dailyDoc.longestStreak || 0, nextStreak);
    dailyDoc.lastCheckin = new Date();
    dailyDoc.todaysReward = credits;
    await dailyDoc.save({ session });

    await createRewardHistory({
      session,
      userId,
      rewardType: 'daily',
      credits,
      source: 'DailyBonus',
      referenceType: 'CreditTransaction',
      referenceId: transaction._id,
    });

    return { credits, streak: nextStreak, transactionId: transaction._id };
  });

const claimRewardAd = async ({ userId }) =>
  walletBootstrapService.withTransaction(async (session) => {
    const [wallet, rewardsSettings] = await Promise.all([
      walletBootstrapService.ensureWallet({ userId, session }),
      getRewardsSettings({ session }),
    ]);

    const config = rewardsSettings?.rewardAds || {};
    const enabled = Boolean(config.enabled);
    const creditsPerView = Number(config.creditsPerView || 0);
    const dailyLimit = Number(config.dailyLimit || 0);
    const cooldownSeconds = Number(config.cooldownSeconds || 0);

    if (!enabled) {
      throw new ApiError(403, 'Reward ads are disabled.', { code: 'REWARD_DISABLED' });
    }

    if (!Number.isFinite(creditsPerView) || creditsPerView <= 0) {
      throw new ApiError(500, 'Reward ad credits are not configured.', { code: 'REWARD_CONFIG_INVALID' });
    }

    const startOfToday = getStartOfTodayUtc();
    const todayCount = await RewardHistoryModel.countDocuments({
      user: userId,
      rewardType: 'advertisement',
      createdAt: { $gte: startOfToday },
    }).session(session);

    if (Number.isFinite(dailyLimit) && dailyLimit > 0 && todayCount >= dailyLimit) {
      throw new ApiError(429, 'Daily reward ad limit reached.', { code: 'REWARD_DAILY_LIMIT' });
    }

    if (Number.isFinite(cooldownSeconds) && cooldownSeconds > 0) {
      const last = await RewardHistoryModel.findOne({
        user: userId,
        rewardType: 'advertisement',
      })
        .sort({ createdAt: -1 })
        .session(session);

      if (last?.createdAt) {
        const elapsedMs = Date.now() - new Date(last.createdAt).getTime();
        if (elapsedMs < cooldownSeconds * 1000) {
          throw new ApiError(429, 'Reward ad cooldown active.', { code: 'REWARD_COOLDOWN' });
        }
      }
    }

    const transaction = await grantCredits({
      session,
      userId,
      wallet,
      credits: creditsPerView,
      type: 'reward',
      source: 'RewardAd',
      purpose: 'reward_ad',
      description: 'Reward ad credits granted.',
      referenceType: 'system',
      referenceId: null,
    });

    await createRewardHistory({
      session,
      userId,
      rewardType: 'advertisement',
      credits: creditsPerView,
      source: 'RewardAd',
      referenceType: 'CreditTransaction',
      referenceId: transaction._id,
    });

    return { credits: creditsPerView, transactionId: transaction._id };
  });

const redeemPromoCode = async ({ userId, code }) =>
  walletBootstrapService.withTransaction(async (session) => {
    const paymentsSettings = await getPaymentsSettings({ session });
    const couponsEnabled = Boolean(paymentsSettings?.coupons?.enabled);
    if (!couponsEnabled) {
      throw new ApiError(403, 'Coupons are disabled.', { code: 'COUPON_DISABLED' });
    }

    const normalizedCode = String(code || '').trim().toUpperCase();
    if (!normalizedCode) {
      throw new ApiError(400, 'Coupon code is required.', { code: 'COUPON_INVALID' });
    }

    const coupon = await CouponModel.findOne({ code: normalizedCode, enabled: true }).session(session);
    if (!coupon) {
      throw new ApiError(404, 'Coupon invalid.', { code: 'COUPON_INVALID' });
    }

    if (coupon.expiry && new Date(coupon.expiry).getTime() < Date.now()) {
      throw new ApiError(409, 'Coupon expired.', { code: 'COUPON_EXPIRED' });
    }

    if (coupon.usageLimit > 0 && coupon.usageCount >= coupon.usageLimit) {
      throw new ApiError(409, 'Coupon usage limit reached.', { code: 'COUPON_LIMIT' });
    }

    const perUserLimit = Number(coupon.perUserLimit || 0);
    if (perUserLimit > 0) {
      const perUserUsed = await CreditTransactionModel.countDocuments({
        user: userId,
        referenceType: 'Coupon',
        referenceId: coupon._id,
        status: 'success',
      }).session(session);

      if (perUserUsed >= perUserLimit) {
        throw new ApiError(409, 'Coupon per-user limit reached.', { code: 'COUPON_PER_USER_LIMIT' });
      }
    }

    const credits = coupon.type === 'credits' ? Number(coupon.credits || 0) : Number(coupon.credits || 0);
    if (!Number.isFinite(credits) || credits <= 0) {
      throw new ApiError(409, 'Coupon does not grant credits.', { code: 'COUPON_INVALID' });
    }

    const wallet = await walletValidationService.getWalletByUserId({ userId, session });

    const transaction = await grantCredits({
      session,
      userId,
      wallet,
      credits,
      type: 'promo',
      source: 'Coupon',
      purpose: 'promo_code',
      description: `Promo code redeemed: ${coupon.code}`,
      referenceType: 'Coupon',
      referenceId: coupon._id,
    });

    coupon.usageCount += 1;
    await coupon.save({ session });

    await createRewardHistory({
      session,
      userId,
      rewardType: 'campaign',
      credits,
      source: 'Coupon',
      referenceType: 'CreditTransaction',
      referenceId: transaction._id,
    });

    return { credits, coupon: { code: coupon.code, id: coupon._id }, transactionId: transaction._id };
  });

const rewardService = Object.freeze({
  claimWelcomeBonus,
  claimDailyBonus,
  claimRewardAd,
  redeemPromoCode,
});

export default rewardService;
