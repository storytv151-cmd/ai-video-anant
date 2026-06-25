/**
 * Transaction routes.
 * Provides transaction listing and retrieval for the authenticated user.
 */
import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import validation from '../middleware/validation.js';
import asyncHandler from '../utils/asyncHandler.js';
import { REQUEST_SOURCES } from '../utils/constants.js';
import transactionValidator from '../validators/transaction.validator.js';
import { getTransactionById, listTransactions } from '../controllers/transaction.controller.js';

const transactionRouter = Router();

transactionRouter.get(
  '/',
  authenticate,
  validation(transactionValidator.validateList, REQUEST_SOURCES.QUERY),
  asyncHandler(listTransactions),
);
transactionRouter.get(
  '/:id',
  authenticate,
  validation(transactionValidator.validateGetById, REQUEST_SOURCES.PARAMS),
  asyncHandler(getTransactionById),
);

export default transactionRouter;
