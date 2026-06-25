/**
 * Credit transaction service.
 * Creates immutable-style ledger entries that record every credit movement.
 * This service does not decide business rules; it records the outcome of wallet mutations.
 */
import ApiError from '../../utils/ApiError.js';
import CreditTransactionModel from '../../models/CreditTransaction.js';

const normalizeObjectId = (value) => (value ? String(value) : null);

const assertValidAmount = (credits) => {
  if (!Number.isFinite(credits) || credits <= 0) {
    throw new ApiError(400, 'Credits must be a positive number.', { code: 'INVALID_CREDITS_AMOUNT' });
  }
};

const createTransaction = async ({
  session,
  walletId,
  userId,
  type,
  status = 'success',
  source = 'system',
  purpose,
  credits,
  balanceBefore,
  balanceAfter,
  referenceType = 'system',
  referenceId = null,
  description = null,
  createdBy = null,
}) => {
  assertValidAmount(credits);

  if (!type) {
    throw new ApiError(400, 'Transaction type is required.', { code: 'TRANSACTION_TYPE_REQUIRED' });
  }

  if (!purpose) {
    throw new ApiError(400, 'Transaction purpose is required.', { code: 'TRANSACTION_PURPOSE_REQUIRED' });
  }

  const docs = await CreditTransactionModel.create(
    [
      {
        wallet: walletId,
        user: userId,
        type,
        status,
        source,
        purpose,
        credits,
        balanceBefore,
        balanceAfter,
        referenceType,
        referenceId,
        description,
        createdBy: normalizeObjectId(createdBy),
      },
    ],
    { session },
  );

  return docs[0];
};

const creditTransactionService = Object.freeze({
  createTransaction,
});

export default creditTransactionService;

