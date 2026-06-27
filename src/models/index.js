/**
 * Model namespace placeholder.
 * Future Mongoose schema definitions will live in this directory.
 */
import AppSettingModel from "./AppSetting.js";
import AuditLogModel from "./AuditLog.js";
import CouponModel from "./Coupon.js";
import CreditTransactionModel from "./CreditTransaction.js";
import DailyCheckinModel from "./DailyCheckin.js";
import FileAssetModel from "./FileAsset.js";
import GoogleWebhookEventModel from "./GoogleWebhookEvent.js";
import NotificationModel from "./Notification.js";
import PaymentModel from "./Payment.js";
import ProviderModel from "./Provider.js";
import ProviderModelModel from "./ProviderModel.js";
import ProviderPricingModel from "./ProviderPricing.js";
import RefreshTokenModel from "./RefreshToken.js";
import RewardHistoryModel from "./RewardHistory.js";
import TemplateCategoryModel from "./TemplateCategory.js";
import UserDeviceModel from "./UserDevice.js";
import UserModel from "./User.js";
import VideoGenerationJobModel from "./VideoGenerationJob.js";
import VideoTemplateModel from "./VideoTemplate.js";
import WalletModel from "./Wallet.js";

const models = Object.freeze({
  AppSettingModel,
  AuditLogModel,
  CouponModel,
  CreditTransactionModel,
  DailyCheckinModel,
  FileAssetModel,
  GoogleWebhookEventModel,
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
