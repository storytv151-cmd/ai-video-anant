/**
 * Wallet validation service.
 * Enforces wallet invariants before mutations (existence, status, and balance constraints).
 * This service contains only validation logic and does not mutate state.
 */
import ApiError from '../../utils/ApiError.js';
import WalletModel from '../../models/Wallet.js';

const assertActiveWallet = (wallet) => {
  if (!wallet) {
    throw new ApiError(404, 'Wallet not found.', { code: 'WALLET_NOT_FOUND' });
  }

  if (wallet.status !== 'active') {
    throw new ApiError(403, 'Wallet is disabled.', { code: 'WALLET_DISABLED' });
  }
};

const assertNonNegative = (value, message, code) => {
  if (!Number.isFinite(value) || value < 0) {
    throw new ApiError(400, message, { code });
  }
};

const assertEnoughCredits = (wallet, amount) => {
  assertNonNegative(amount, 'Invalid credits amount.', 'INVALID_CREDITS_AMOUNT');
  if (wallet.currentCredits < amount) {
    throw new ApiError(409, 'Insufficient credits.', { code: 'INSUFFICIENT_CREDITS' });
  }
};

const assertEnoughPending = (wallet, amount) => {
  assertNonNegative(amount, 'Invalid credits amount.', 'INVALID_CREDITS_AMOUNT');
  if (wallet.pendingCredits < amount) {
    throw new ApiError(409, 'Insufficient pending credits.', { code: 'INSUFFICIENT_PENDING_CREDITS' });
  }
};

const assertEnoughLocked = (wallet, amount) => {
  assertNonNegative(amount, 'Invalid credits amount.', 'INVALID_CREDITS_AMOUNT');
  if (wallet.lockedCredits < amount) {
    throw new ApiError(409, 'Insufficient locked credits.', { code: 'INSUFFICIENT_LOCKED_CREDITS' });
  }
};

const getWalletByUserId = async ({ userId, session }) => {
  const query = WalletModel.findOne({ user: userId });
  if (session) {
    query.session(session);
  }
  const wallet = await query;
  assertActiveWallet(wallet);
  return wallet;
};

const walletValidationService = Object.freeze({
  assertActiveWallet,
  assertEnoughCredits,
  assertEnoughPending,
  assertEnoughLocked,
  getWalletByUserId,
});

export default walletValidationService;

