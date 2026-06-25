/**
 * Wallet routes.
 * Implements wallet read APIs and promo redemption.
 */
import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import validation from '../middleware/validation.js';
import asyncHandler from '../utils/asyncHandler.js';
import { REQUEST_SOURCES } from '../utils/constants.js';
import walletValidator from '../validators/wallet.validator.js';
import { getWallet, getWalletHistory, getWalletSummary, redeemPromo } from '../controllers/wallet.controller.js';

const walletRouter = Router();

walletRouter.get('/', authenticate, validation(walletValidator.validateGetWallet), asyncHandler(getWallet));
walletRouter.get(
  '/history',
  authenticate,
  validation(walletValidator.validateGetWalletHistory, REQUEST_SOURCES.QUERY),
  asyncHandler(getWalletHistory),
);
walletRouter.get(
  '/summary',
  authenticate,
  validation(walletValidator.validateGetWalletSummary),
  asyncHandler(getWalletSummary),
);
walletRouter.post(
  '/promo',
  authenticate,
  validation(walletValidator.validateRedeemPromo, REQUEST_SOURCES.BODY),
  asyncHandler(redeemPromo),
);

export default walletRouter;
