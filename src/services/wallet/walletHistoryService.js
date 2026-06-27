/**
 * Wallet history service.
 * Provides paginated access to transaction history and time-bounded wallet summaries.
 */
import CreditTransactionModel from "../../models/CreditTransaction.js";
import walletValidationService from "./walletValidationService.js";
import { buildPaginationMeta } from "../../utils/pagination.js";
import { buildCreditTransactionDto } from "../../utils/wallet.dto.js";

const parsePositiveInt = (value, fallback) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.floor(parsed);
};

const buildDateRange = ({ dateFrom, dateTo }) => {
  const createdAt = {};

  if (dateFrom) {
    const from = new Date(dateFrom);
    if (!Number.isNaN(from.getTime())) {
      createdAt.$gte = from;
    }
  }

  if (dateTo) {
    const to = new Date(dateTo);
    if (!Number.isNaN(to.getTime())) {
      createdAt.$lte = to;
    }
  }

  return Object.keys(createdAt).length > 0 ? createdAt : null;
};

const listHistory = async ({
  userId,
  page = 1,
  limit = 20,
  type,
  status,
  dateFrom,
  dateTo,
  sort = "-createdAt",
}) => {
  const wallet = await walletValidationService.getWalletByUserId({ userId });

  const safePage = parsePositiveInt(page, 1);
  const safeLimit = Math.min(parsePositiveInt(limit, 20), 100);
  const skip = (safePage - 1) * safeLimit;

  const filter = {
    user: userId,
    wallet: wallet._id,
  };

  if (type) {
    filter.type = type;
  }

  if (status) {
    filter.status = status;
  }

  const createdAtRange = buildDateRange({ dateFrom, dateTo });
  if (createdAtRange) {
    filter.createdAt = createdAtRange;
  }

  const sortMap = sort === "createdAt" ? { createdAt: 1 } : { createdAt: -1 };

  const [items, total] = await Promise.all([
    CreditTransactionModel.find(filter)
      .sort(sortMap)
      .skip(skip)
      .limit(safeLimit)
      .lean(),
    CreditTransactionModel.countDocuments(filter),
  ]);

  return {
    items: items.map(buildCreditTransactionDto),
    meta: buildPaginationMeta({ page: safePage, limit: safeLimit, total }),
  };
};

const buildSummary = async ({ userId }) => {
  const wallet = await walletValidationService.getWalletByUserId({ userId });

  const now = new Date();
  const startOfToday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const startOfMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );

  const matchBase = {
    user: wallet.user,
    wallet: wallet._id,
    status: "success",
  };

  const [todayAgg, monthAgg] = await Promise.all([
    CreditTransactionModel.aggregate([
      { $match: { ...matchBase, createdAt: { $gte: startOfToday } } },
      {
        $group: {
          _id: null,
          used: {
            $sum: {
              $cond: [{ $eq: ["$type", "generation"] }, "$credits", 0],
            },
          },
          rewards: {
            $sum: {
              $cond: [
                {
                  $in: [
                    "$type",
                    [
                      "reward",
                      "welcome_bonus",
                      "daily_bonus",
                      "referral",
                      "promo",
                      "admin",
                    ],
                  ],
                },
                "$credits",
                0,
              ],
            },
          },
        },
      },
    ]),
    CreditTransactionModel.aggregate([
      { $match: { ...matchBase, createdAt: { $gte: startOfMonth } } },
      {
        $group: {
          _id: null,
          purchased: {
            $sum: { $cond: [{ $eq: ["$type", "purchase"] }, "$credits", 0] },
          },
          used: {
            $sum: { $cond: [{ $eq: ["$type", "generation"] }, "$credits", 0] },
          },
        },
      },
    ]),
  ]);

  const today = todayAgg?.[0] || { used: 0, rewards: 0 };
  const month = monthAgg?.[0] || { purchased: 0, used: 0 };

  return {
    todayCreditsUsed: today.used,
    todayRewards: today.rewards,
    monthlyPurchased: month.purchased,
    monthlyUsed: month.used,
    currentBalance: wallet.currentCredits,
    lifetimeBalance: wallet.lifetimeCredits,
  };
};

const walletHistoryService = Object.freeze({
  listHistory,
  buildSummary,
});

export default walletHistoryService;
