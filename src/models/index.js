/**
 * Model namespace placeholder.
 * Future Mongoose schema definitions will live in this directory.
 */
import AppSettingModel from './AppSetting.js';
import CouponModel from './Coupon.js';
import CreditTransactionModel from './CreditTransaction.js';
import DailyCheckinModel from './DailyCheckin.js';
import NotificationModel from './Notification.js';
import PaymentModel from './Payment.js';
import ProviderModel from './Provider.js';
import ProviderModelModel from './ProviderModel.js';
import ProviderPricingModel from './ProviderPricing.js';
import RefreshTokenModel from './RefreshToken.js';
import RewardHistoryModel from './RewardHistory.js';
import TemplateCategoryModel from './TemplateCategory.js';
import UserDeviceModel from './UserDevice.js';
import UserModel from './User.js';
import VideoGenerationJobModel from './VideoGenerationJob.js';
import VideoTemplateModel from './VideoTemplate.js';
import WalletModel from './Wallet.js';

const models = Object.freeze({
  AppSettingModel,
  CouponModel,
  CreditTransactionModel,
  DailyCheckinModel,
  NotificationModel,
  PaymentModel,
  ProviderModel,
  ProviderModelModel,
  ProviderPricingModel,
  RefreshTokenModel,
  RewardHistoryModel,
  TemplateCategoryModel,
  UserDeviceModel,
  UserModel,
  VideoGenerationJobModel,
  VideoTemplateModel,
  WalletModel,
});

export default models;
