/**
 * Wallet service (Wallet Engine).
 * All credit mutations must go through this service to maintain ledger safety:
 * Validate -> Create CreditTransaction -> Update Wallet -> Commit -> Return.
 */
import mongoose from 'mongoose';
import ApiError from '../../utils/ApiError.js';
import WalletModel from '../../models/Wallet.js';
import walletValidationService from './walletValidationService.js';
import creditTransactionService from './creditTransactionService.js';
import { setRequestContextValue } from '../../utils/requestContext.js';

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

const withOptionalSession = async ({ session } = {}, handler) => {
  if (session) {
    return handler(session);
  }
  return withTransaction(handler);
};

const buildWalletResponse = (wallet) => ({
  id: wallet._id,
  user: wallet.user,
  status: wallet.status,
  currentCredits: wallet.currentCredits,
  pendingCredits: wallet.pendingCredits,
  lockedCredits: wallet.lockedCredits,
  lifetimeCredits: wallet.lifetimeCredits,
  totalPurchased: wallet.totalPurchased,
  totalUsed: wallet.totalUsed,
  totalRewarded: wallet.totalRewarded,
  totalRefunded: wallet.totalRefunded,
  createdAt: wallet.createdAt,
  updatedAt: wallet.updatedAt,
});

const getWalletByUser = async ({ userId }) => {
  const wallet = await WalletModel.findOne({ user: userId });
  walletValidationService.assertActiveWallet(wallet);
  return wallet;
};

const applyMutation = async ({
  userId,
  type,
  status = 'success',
  source,
  purpose,
  credits,
  description,
  referenceType,
  referenceId,
  createdBy = null,
  idempotencyKey = null,
  session = null,
  mutate,
}) =>
  withOptionalSession({ session }, async (activeSession) => {
    const wallet = await walletValidationService.getWalletByUserId({ userId, session: activeSession });

    if (idempotencyKey) {
      const existing = await creditTransactionService.findSuccessfulByIdempotencyKey({
        userId,
        idempotencyKey,
        session: activeSession,
      });
      if (existing) {
        return { wallet: buildWalletResponse(wallet), transaction: existing };
      }
    }

    const before = wallet.currentCredits;
    const walletState = {
      currentCredits: wallet.currentCredits,
      pendingCredits: wallet.pendingCredits,
      lockedCredits: wallet.lockedCredits,
      lifetimeCredits: wallet.lifetimeCredits,
      totalPurchased: wallet.totalPurchased,
      totalUsed: wallet.totalUsed,
      totalRewarded: wallet.totalRewarded,
      totalRefunded: wallet.totalRefunded,
    };

    await mutate({ wallet: walletState, session: activeSession });
    const after = walletState.currentCredits;

    let transaction;
    try {
      transaction = await creditTransactionService.createTransaction({
        session: activeSession,
        walletId: wallet._id,
        userId,
        type,
        status,
        source,
        purpose,
        credits,
        balanceBefore: before,
        balanceAfter: after,
        referenceType,
        referenceId,
        description,
        createdBy,
        idempotencyKey,
      });
    } catch (error) {
      if (error?.code === 11000 && idempotencyKey) {
        const existing = await creditTransactionService.findSuccessfulByIdempotencyKey({
          userId,
          idempotencyKey,
          session: activeSession,
        });
        if (existing) {
          return { wallet: buildWalletResponse(wallet), transaction: existing };
        }
      }
      throw error;
    }

    if (transaction?._id) {
      setRequestContextValue('walletTransactionId', String(transaction._id));
    }

    if (
      walletState.currentCredits < 0 ||
      walletState.pendingCredits < 0 ||
      walletState.lockedCredits < 0 ||
      walletState.lifetimeCredits < 0
    ) {
      throw new ApiError(500, 'Wallet mutation produced invalid state.', { code: 'WALLET_STATE_INVALID' });
    }

    wallet.currentCredits = walletState.currentCredits;
    wallet.pendingCredits = walletState.pendingCredits;
    wallet.lockedCredits = walletState.lockedCredits;
    wallet.lifetimeCredits = walletState.lifetimeCredits;
    wallet.totalPurchased = walletState.totalPurchased;
    wallet.totalUsed = walletState.totalUsed;
    wallet.totalRewarded = walletState.totalRewarded;
    wallet.totalRefunded = walletState.totalRefunded;

    await wallet.save({ session: activeSession });

    return { wallet: buildWalletResponse(wallet), transaction };
  });

const addCredits = async ({
  userId,
  credits,
  type = 'reward',
  source = 'system',
  purpose = 'credit_add',
  description = null,
  referenceType = 'system',
  referenceId = null,
  idempotencyKey = null,
  session = null,
}) =>
  applyMutation({
    userId,
    type,
    source,
    purpose,
    credits,
    description,
    referenceType,
    referenceId,
    idempotencyKey,
    session,
    mutate: async ({ wallet }) => {
      if (!Number.isFinite(credits) || credits <= 0) {
        throw new ApiError(400, 'Credits must be a positive number.', { code: 'INVALID_CREDITS_AMOUNT' });
      }

      wallet.currentCredits += credits;

      if (type === 'purchase') {
        wallet.totalPurchased += credits;
      } else if (type === 'refund') {
        wallet.totalRefunded += credits;
      } else {
        wallet.totalRewarded += credits;
      }

      wallet.lifetimeCredits += credits;
    },
  });

const deductCredits = async ({
  userId,
  credits,
  type = 'generation',
  source = 'system',
  purpose = 'credit_deduct',
  description = null,
  referenceType = 'system',
  referenceId = null,
  idempotencyKey = null,
  session = null,
}) =>
  applyMutation({
    userId,
    type,
    source,
    purpose,
    credits,
    description,
    referenceType,
    referenceId,
    idempotencyKey,
    session,
    mutate: async ({ wallet }) => {
      if (!Number.isFinite(credits) || credits <= 0) {
        throw new ApiError(400, 'Credits must be a positive number.', { code: 'INVALID_CREDITS_AMOUNT' });
      }

      walletValidationService.assertEnoughCredits(wallet, credits);
      wallet.currentCredits -= credits;
      wallet.totalUsed += credits;
    },
  });

const lockCredits = async ({
  userId,
  credits,
  referenceType = 'system',
  referenceId = null,
  description = 'Credits locked for processing.',
  idempotencyKey = null,
  session = null,
}) =>
  applyMutation({
    userId,
    type: 'generation',
    status: 'pending',
    source: 'Generation',
    purpose: 'lock_credits',
    credits,
    description,
    referenceType,
    referenceId,
    idempotencyKey,
    session,
    mutate: async ({ wallet }) => {
      if (!Number.isFinite(credits) || credits <= 0) {
        throw new ApiError(400, 'Credits must be a positive number.', { code: 'INVALID_CREDITS_AMOUNT' });
      }

      walletValidationService.assertEnoughCredits(wallet, credits);
      wallet.currentCredits -= credits;
      wallet.lockedCredits += credits;
    },
  });

const unlockCredits = async ({
  userId,
  credits,
  referenceType = 'system',
  referenceId = null,
  description = 'Credits unlocked.',
  idempotencyKey = null,
  session = null,
}) =>
  applyMutation({
    userId,
    type: 'generation',
    status: 'cancelled',
    source: 'Generation',
    purpose: 'unlock_credits',
    credits,
    description,
    referenceType,
    referenceId,
    idempotencyKey,
    session,
    mutate: async ({ wallet }) => {
      if (!Number.isFinite(credits) || credits <= 0) {
        throw new ApiError(400, 'Credits must be a positive number.', { code: 'INVALID_CREDITS_AMOUNT' });
      }

      walletValidationService.assertEnoughLocked(wallet, credits);
      wallet.lockedCredits -= credits;
      wallet.currentCredits += credits;
    },
  });

const movePendingToBalance = async ({
  userId,
  credits,
  type = 'purchase',
  source = 'Purchase',
  purpose = 'pending_to_balance',
  description = 'Pending credits confirmed.',
  referenceType = 'system',
  referenceId = null,
  idempotencyKey = null,
  session = null,
}) =>
  applyMutation({
    userId,
    type,
    status: 'success',
    source,
    purpose,
    credits,
    description,
    referenceType,
    referenceId,
    idempotencyKey,
    session,
    mutate: async ({ wallet }) => {
      if (!Number.isFinite(credits) || credits <= 0) {
        throw new ApiError(400, 'Credits must be a positive number.', { code: 'INVALID_CREDITS_AMOUNT' });
      }

      walletValidationService.assertEnoughPending(wallet, credits);
      wallet.pendingCredits -= credits;
      wallet.currentCredits += credits;
      wallet.totalPurchased += credits;
      wallet.lifetimeCredits += credits;
    },
  });

const refundCredits = async ({
  userId,
  credits,
  originalTransactionId = null,
  description = 'Refund issued.',
  idempotencyKey = null,
  session = null,
}) =>
  addCredits({
    userId,
    credits,
    type: 'refund',
    source: 'Refund',
    purpose: 'refund',
    description,
    referenceType: originalTransactionId ? 'CreditTransaction' : 'system',
    referenceId: originalTransactionId,
    idempotencyKey,
    session,
  });

const consumeLockedCredits = async ({
  userId,
  credits,
  referenceType = 'system',
  referenceId = null,
  description = 'Locked credits consumed.',
  idempotencyKey = null,
  session = null,
} = {}) =>
  applyMutation({
    userId,
    type: 'generation',
    status: 'success',
    source: 'Generation',
    purpose: 'consume_locked',
    credits,
    description,
    referenceType,
    referenceId,
    idempotencyKey,
    session,
    mutate: async ({ wallet }) => {
      if (!Number.isFinite(credits) || credits <= 0) {
        throw new ApiError(400, 'Credits must be a positive number.', { code: 'INVALID_CREDITS_AMOUNT' });
      }

      walletValidationService.assertEnoughLocked(wallet, credits);
      wallet.lockedCredits -= credits;
      wallet.totalUsed += credits;
    },
  });

const transferCredits = async () => {
  throw new ApiError(501, 'Transfer credits is not implemented yet.', { code: 'TRANSFER_NOT_IMPLEMENTED' });
};

const walletService = Object.freeze({
  withTransaction,
  getWalletByUser,
  addCredits,
  deductCredits,
  lockCredits,
  unlockCredits,
  movePendingToBalance,
  refundCredits,
  consumeLockedCredits,
  transferCredits,
  buildWalletResponse,
});

export default walletService;
