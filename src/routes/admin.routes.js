import { Router } from "express";
import ADMIN_PERMISSIONS from "../constants/adminPermissions.js";
import { authenticate } from "../middleware/auth.js";
import {
  requireAdminAccess,
  requireAdminPermission,
} from "../middleware/adminAccess.js";
import validation from "../middleware/validation.js";
import asyncHandler from "../utils/asyncHandler.js";
import { REQUEST_SOURCES } from "../utils/constants.js";
import { getAdminAnalytics } from "../controllers/adminAnalytics.controller.js";
import { getAdminDashboard } from "../controllers/adminDashboard.controller.js";
import {
  createAdminCoupon,
  createAdminNotifications,
  deleteAdminCoupon,
  getAdminGenerationJob,
  listAdminAuditLogs,
  listAdminCoupons,
  listAdminGenerationJobs,
  listAdminNotifications,
  listAdminPermissions,
  listAdminRewards,
  listAdminRoles,
  updateAdminCoupon,
  updateAdminGenerationStatus,
} from "../controllers/adminOperations.controller.js";
import {
  getAdminPayment,
  getAdminRevenueSummary,
  listAdminPayments,
  refundAdminPayment,
} from "../controllers/adminPayment.controller.js";
import {
  getAdminProvider,
  getAdminProviderHealth,
  getAdminProviderPricingSummary,
  listAdminProviderModels,
  listAdminProviderPricing,
  listAdminProviders,
  updateAdminProvider,
  updateAdminProviderModel,
  upsertAdminProviderPricing,
} from "../controllers/adminProvider.controller.js";
import {
  getAdminSetting,
  getAdminStorageOverview,
  listAdminSettings,
  updateAdminSetting,
} from "../controllers/adminSetting.controller.js";
import {
  cancelAdminSubscription,
  extendAdminSubscription,
  getAdminSubscription,
  grantAdminSubscription,
  listAdminSubscriptions,
  removeAdminSubscription,
  renewAdminSubscription,
  trialAdminSubscription,
} from "../controllers/adminSubscription.controller.js";
import {
  createAdminCategory,
  createAdminTemplate,
  deleteAdminCategory,
  deleteAdminTemplate,
  getAdminCategory,
  getAdminTemplate,
  listAdminCategories,
  listAdminTemplates,
  updateAdminCategory,
  updateAdminTemplate,
} from "../controllers/adminTemplate.controller.js";
import {
  assignAdminUserRole,
  deductAdminUserCredits,
  getAdminUserDetail,
  getAdminUserSubscriptions,
  grantAdminUserCredits,
  listAdminUserDevices,
  listAdminUserGenerations,
  listAdminUserLoginHistory,
  listAdminUserPayments,
  listAdminUsers,
  resetAdminUserWallet,
  updateAdminUserStatus,
} from "../controllers/adminUser.controller.js";
import {
  deductAdminWalletCredits,
  getAdminWallet,
  getAdminWalletHistory,
  grantAdminWalletCredits,
  listAdminWallets,
  refundAdminWalletCredits,
  searchAdminWalletTransactions,
  updateAdminWalletStatus,
} from "../controllers/adminWallet.controller.js";
import adminValidator from "../validators/admin.validator.js";
import {
  getOrganizations,
  createOrganization,
  getTeams,
  createTeam,
  getRegionalAdmins,
  updateWhiteLabelConfig,
  getTenants,
  getSupportTickets,
  addInternalNote,
  submitApprovalWorkflow,
  executeBulkOperation,
  exportCsv,
} from "../controllers/adminFutureReady.controller.js";

const adminRouter = Router();

adminRouter.use(authenticate, requireAdminAccess);

adminRouter.get(
  "/dashboard",
  requireAdminPermission(ADMIN_PERMISSIONS.DASHBOARD_READ),
  asyncHandler(getAdminDashboard),
);
adminRouter.get(
  "/analytics",
  requireAdminPermission(ADMIN_PERMISSIONS.ANALYTICS_READ),
  validation(adminValidator.validateAdminListQuery, REQUEST_SOURCES.QUERY),
  asyncHandler(getAdminAnalytics),
);

adminRouter.get(
  "/users",
  requireAdminPermission(ADMIN_PERMISSIONS.USERS_READ),
  validation(adminValidator.validateAdminListQuery, REQUEST_SOURCES.QUERY),
  asyncHandler(listAdminUsers),
);
adminRouter.get(
  "/users/:userId",
  requireAdminPermission(ADMIN_PERMISSIONS.USERS_READ),
  validation(adminValidator.validateUserIdParam, REQUEST_SOURCES.PARAMS),
  asyncHandler(getAdminUserDetail),
);
adminRouter.patch(
  "/users/:userId/status",
  requireAdminPermission(ADMIN_PERMISSIONS.USERS_STATUS),
  validation(adminValidator.validateUserIdParam, REQUEST_SOURCES.PARAMS),
  validation(adminValidator.validateStatusBody, REQUEST_SOURCES.BODY),
  asyncHandler(updateAdminUserStatus),
);
adminRouter.patch(
  "/users/:userId/role",
  requireAdminPermission(ADMIN_PERMISSIONS.USERS_ROLE_ASSIGN),
  validation(adminValidator.validateUserIdParam, REQUEST_SOURCES.PARAMS),
  validation(adminValidator.validateRoleAssignmentBody, REQUEST_SOURCES.BODY),
  asyncHandler(assignAdminUserRole),
);
adminRouter.get(
  "/users/:userId/devices",
  requireAdminPermission(ADMIN_PERMISSIONS.USERS_DEVICES_READ),
  validation(adminValidator.validateUserIdParam, REQUEST_SOURCES.PARAMS),
  asyncHandler(listAdminUserDevices),
);
adminRouter.get(
  "/users/:userId/login-history",
  requireAdminPermission(ADMIN_PERMISSIONS.USERS_LOGIN_HISTORY_READ),
  validation(adminValidator.validateUserIdParam, REQUEST_SOURCES.PARAMS),
  asyncHandler(listAdminUserLoginHistory),
);
adminRouter.get(
  "/users/:userId/generation-history",
  requireAdminPermission(ADMIN_PERMISSIONS.USERS_GENERATIONS_READ),
  validation(adminValidator.validateUserIdParam, REQUEST_SOURCES.PARAMS),
  asyncHandler(listAdminUserGenerations),
);
adminRouter.get(
  "/users/:userId/payments",
  requireAdminPermission(ADMIN_PERMISSIONS.USERS_PAYMENTS_READ),
  validation(adminValidator.validateUserIdParam, REQUEST_SOURCES.PARAMS),
  asyncHandler(listAdminUserPayments),
);
adminRouter.get(
  "/users/:userId/subscriptions",
  requireAdminPermission(ADMIN_PERMISSIONS.USERS_SUBSCRIPTIONS_READ),
  validation(adminValidator.validateUserIdParam, REQUEST_SOURCES.PARAMS),
  asyncHandler(getAdminUserSubscriptions),
);
adminRouter.post(
  "/users/:userId/grant-credits",
  requireAdminPermission(ADMIN_PERMISSIONS.WALLETS_ADJUST),
  validation(adminValidator.validateUserIdParam, REQUEST_SOURCES.PARAMS),
  validation(adminValidator.validateCreditsBody, REQUEST_SOURCES.BODY),
  asyncHandler(grantAdminUserCredits),
);
adminRouter.post(
  "/users/:userId/deduct-credits",
  requireAdminPermission(ADMIN_PERMISSIONS.WALLETS_ADJUST),
  validation(adminValidator.validateUserIdParam, REQUEST_SOURCES.PARAMS),
  validation(adminValidator.validateCreditsBody, REQUEST_SOURCES.BODY),
  asyncHandler(deductAdminUserCredits),
);
adminRouter.post(
  "/users/:userId/reset-wallet",
  requireAdminPermission(ADMIN_PERMISSIONS.WALLETS_ADJUST),
  validation(adminValidator.validateUserIdParam, REQUEST_SOURCES.PARAMS),
  asyncHandler(resetAdminUserWallet),
);

adminRouter.get(
  "/wallets",
  requireAdminPermission(ADMIN_PERMISSIONS.WALLETS_READ),
  asyncHandler(listAdminWallets),
);
adminRouter.get(
  "/wallets/transactions",
  requireAdminPermission(ADMIN_PERMISSIONS.WALLETS_TRANSACTIONS_READ),
  asyncHandler(searchAdminWalletTransactions),
);
adminRouter.get(
  "/wallets/:userId",
  requireAdminPermission(ADMIN_PERMISSIONS.WALLETS_READ),
  validation(adminValidator.validateUserIdParam, REQUEST_SOURCES.PARAMS),
  asyncHandler(getAdminWallet),
);
adminRouter.get(
  "/wallets/:userId/history",
  requireAdminPermission(ADMIN_PERMISSIONS.WALLETS_READ),
  validation(adminValidator.validateUserIdParam, REQUEST_SOURCES.PARAMS),
  asyncHandler(getAdminWalletHistory),
);
adminRouter.post(
  "/wallets/:userId/grant",
  requireAdminPermission(ADMIN_PERMISSIONS.WALLETS_ADJUST),
  validation(adminValidator.validateUserIdParam, REQUEST_SOURCES.PARAMS),
  validation(adminValidator.validateCreditsBody, REQUEST_SOURCES.BODY),
  asyncHandler(grantAdminWalletCredits),
);
adminRouter.post(
  "/wallets/:userId/deduct",
  requireAdminPermission(ADMIN_PERMISSIONS.WALLETS_ADJUST),
  validation(adminValidator.validateUserIdParam, REQUEST_SOURCES.PARAMS),
  validation(adminValidator.validateCreditsBody, REQUEST_SOURCES.BODY),
  asyncHandler(deductAdminWalletCredits),
);
adminRouter.post(
  "/wallets/:userId/refund",
  requireAdminPermission(ADMIN_PERMISSIONS.WALLETS_REFUND),
  validation(adminValidator.validateUserIdParam, REQUEST_SOURCES.PARAMS),
  validation(adminValidator.validateCreditsBody, REQUEST_SOURCES.BODY),
  asyncHandler(refundAdminWalletCredits),
);
adminRouter.patch(
  "/wallets/:userId/status",
  requireAdminPermission(ADMIN_PERMISSIONS.WALLETS_LOCK),
  validation(adminValidator.validateUserIdParam, REQUEST_SOURCES.PARAMS),
  validation(adminValidator.validateStatusBody, REQUEST_SOURCES.BODY),
  asyncHandler(updateAdminWalletStatus),
);

adminRouter.get(
  "/templates",
  requireAdminPermission(ADMIN_PERMISSIONS.TEMPLATES_READ),
  asyncHandler(listAdminTemplates),
);
adminRouter.post(
  "/templates",
  requireAdminPermission(ADMIN_PERMISSIONS.TEMPLATES_WRITE),
  validation(adminValidator.validateTemplateCreateBody, REQUEST_SOURCES.BODY),
  asyncHandler(createAdminTemplate),
);
adminRouter.get(
  "/templates/:templateId",
  requireAdminPermission(ADMIN_PERMISSIONS.TEMPLATES_READ),
  validation(adminValidator.validateTemplateIdParam, REQUEST_SOURCES.PARAMS),
  asyncHandler(getAdminTemplate),
);
adminRouter.patch(
  "/templates/:templateId",
  requireAdminPermission(ADMIN_PERMISSIONS.TEMPLATES_WRITE),
  validation(adminValidator.validateTemplateIdParam, REQUEST_SOURCES.PARAMS),
  validation(adminValidator.validateTemplateUpdateBody, REQUEST_SOURCES.BODY),
  asyncHandler(updateAdminTemplate),
);
adminRouter.delete(
  "/templates/:templateId",
  requireAdminPermission(ADMIN_PERMISSIONS.TEMPLATES_WRITE),
  validation(adminValidator.validateTemplateIdParam, REQUEST_SOURCES.PARAMS),
  asyncHandler(deleteAdminTemplate),
);

adminRouter.get(
  "/categories",
  requireAdminPermission(ADMIN_PERMISSIONS.CATEGORIES_READ),
  asyncHandler(listAdminCategories),
);
adminRouter.post(
  "/categories",
  requireAdminPermission(ADMIN_PERMISSIONS.CATEGORIES_WRITE),
  validation(adminValidator.validateCategoryBody, REQUEST_SOURCES.BODY),
  asyncHandler(createAdminCategory),
);
adminRouter.get(
  "/categories/:categoryId",
  requireAdminPermission(ADMIN_PERMISSIONS.CATEGORIES_READ),
  validation(adminValidator.validateCategoryIdParam, REQUEST_SOURCES.PARAMS),
  asyncHandler(getAdminCategory),
);
adminRouter.patch(
  "/categories/:categoryId",
  requireAdminPermission(ADMIN_PERMISSIONS.CATEGORIES_WRITE),
  validation(adminValidator.validateCategoryIdParam, REQUEST_SOURCES.PARAMS),
  asyncHandler(updateAdminCategory),
);
adminRouter.delete(
  "/categories/:categoryId",
  requireAdminPermission(ADMIN_PERMISSIONS.CATEGORIES_WRITE),
  validation(adminValidator.validateCategoryIdParam, REQUEST_SOURCES.PARAMS),
  asyncHandler(deleteAdminCategory),
);

adminRouter.get(
  "/providers",
  requireAdminPermission(ADMIN_PERMISSIONS.PROVIDERS_READ),
  asyncHandler(listAdminProviders),
);
adminRouter.get(
  "/providers/health",
  requireAdminPermission(ADMIN_PERMISSIONS.PROVIDERS_READ),
  asyncHandler(getAdminProviderHealth),
);
adminRouter.get(
  "/providers/pricing-summary",
  requireAdminPermission(ADMIN_PERMISSIONS.PROVIDERS_READ),
  asyncHandler(getAdminProviderPricingSummary),
);
adminRouter.get(
  "/providers/pricing",
  requireAdminPermission(ADMIN_PERMISSIONS.PROVIDERS_READ),
  asyncHandler(listAdminProviderPricing),
);
adminRouter.post(
  "/providers/pricing",
  requireAdminPermission(ADMIN_PERMISSIONS.PROVIDER_PRICING_WRITE),
  validation(adminValidator.validateProviderPricingBody, REQUEST_SOURCES.BODY),
  asyncHandler(upsertAdminProviderPricing),
);
adminRouter.get(
  "/providers/:providerId",
  requireAdminPermission(ADMIN_PERMISSIONS.PROVIDERS_READ),
  validation(adminValidator.validateProviderIdParam, REQUEST_SOURCES.PARAMS),
  asyncHandler(getAdminProvider),
);
adminRouter.patch(
  "/providers/:providerId",
  requireAdminPermission(ADMIN_PERMISSIONS.PROVIDERS_WRITE),
  validation(adminValidator.validateProviderIdParam, REQUEST_SOURCES.PARAMS),
  asyncHandler(updateAdminProvider),
);
adminRouter.get(
  "/provider-models",
  requireAdminPermission(ADMIN_PERMISSIONS.PROVIDER_MODELS_READ),
  asyncHandler(listAdminProviderModels),
);
adminRouter.patch(
  "/provider-models/:modelId",
  requireAdminPermission(ADMIN_PERMISSIONS.PROVIDER_MODELS_WRITE),
  validation(adminValidator.validateModelIdParam, REQUEST_SOURCES.PARAMS),
  asyncHandler(updateAdminProviderModel),
);

adminRouter.get(
  "/subscriptions",
  requireAdminPermission(ADMIN_PERMISSIONS.SUBSCRIPTIONS_READ),
  asyncHandler(listAdminSubscriptions),
);
adminRouter.get(
  "/subscriptions/:userId",
  requireAdminPermission(ADMIN_PERMISSIONS.SUBSCRIPTIONS_READ),
  validation(adminValidator.validateUserIdParam, REQUEST_SOURCES.PARAMS),
  asyncHandler(getAdminSubscription),
);
adminRouter.post(
  "/subscriptions/:userId/cancel",
  requireAdminPermission(ADMIN_PERMISSIONS.SUBSCRIPTIONS_WRITE),
  validation(adminValidator.validateUserIdParam, REQUEST_SOURCES.PARAMS),
  asyncHandler(cancelAdminSubscription),
);
adminRouter.post(
  "/subscriptions/:userId/extend",
  requireAdminPermission(ADMIN_PERMISSIONS.SUBSCRIPTIONS_WRITE),
  validation(adminValidator.validateUserIdParam, REQUEST_SOURCES.PARAMS),
  validation(
    adminValidator.validateSubscriptionActionBody,
    REQUEST_SOURCES.BODY,
  ),
  asyncHandler(extendAdminSubscription),
);
adminRouter.post(
  "/subscriptions/:userId/grant",
  requireAdminPermission(ADMIN_PERMISSIONS.SUBSCRIPTIONS_WRITE),
  validation(adminValidator.validateUserIdParam, REQUEST_SOURCES.PARAMS),
  validation(
    adminValidator.validateSubscriptionActionBody,
    REQUEST_SOURCES.BODY,
  ),
  asyncHandler(grantAdminSubscription),
);
adminRouter.post(
  "/subscriptions/:userId/remove",
  requireAdminPermission(ADMIN_PERMISSIONS.SUBSCRIPTIONS_WRITE),
  validation(adminValidator.validateUserIdParam, REQUEST_SOURCES.PARAMS),
  asyncHandler(removeAdminSubscription),
);
adminRouter.post(
  "/subscriptions/:userId/trial",
  requireAdminPermission(ADMIN_PERMISSIONS.SUBSCRIPTIONS_WRITE),
  validation(adminValidator.validateUserIdParam, REQUEST_SOURCES.PARAMS),
  validation(
    adminValidator.validateSubscriptionActionBody,
    REQUEST_SOURCES.BODY,
  ),
  asyncHandler(trialAdminSubscription),
);
adminRouter.post(
  "/subscriptions/:userId/renew",
  requireAdminPermission(ADMIN_PERMISSIONS.SUBSCRIPTIONS_WRITE),
  validation(adminValidator.validateUserIdParam, REQUEST_SOURCES.PARAMS),
  validation(
    adminValidator.validateSubscriptionActionBody,
    REQUEST_SOURCES.BODY,
  ),
  asyncHandler(renewAdminSubscription),
);

adminRouter.get(
  "/payments",
  requireAdminPermission(ADMIN_PERMISSIONS.PAYMENTS_READ),
  asyncHandler(listAdminPayments),
);
adminRouter.get(
  "/payments/revenue-summary",
  requireAdminPermission(ADMIN_PERMISSIONS.PAYMENTS_READ),
  asyncHandler(getAdminRevenueSummary),
);
adminRouter.get(
  "/payments/:paymentId",
  requireAdminPermission(ADMIN_PERMISSIONS.PAYMENTS_READ),
  validation(adminValidator.validatePaymentIdParam, REQUEST_SOURCES.PARAMS),
  asyncHandler(getAdminPayment),
);
adminRouter.post(
  "/payments/:paymentId/refund",
  requireAdminPermission(ADMIN_PERMISSIONS.PAYMENTS_REFUND),
  validation(adminValidator.validatePaymentIdParam, REQUEST_SOURCES.PARAMS),
  asyncHandler(refundAdminPayment),
);

adminRouter.get(
  "/settings",
  requireAdminPermission(ADMIN_PERMISSIONS.SETTINGS_READ),
  asyncHandler(listAdminSettings),
);
adminRouter.get(
  "/settings/:section/:key",
  requireAdminPermission(ADMIN_PERMISSIONS.SETTINGS_READ),
  asyncHandler(getAdminSetting),
);
adminRouter.patch(
  "/settings/:section/:key",
  requireAdminPermission(ADMIN_PERMISSIONS.SETTINGS_WRITE),
  asyncHandler(updateAdminSetting),
);

adminRouter.get(
  "/coupons",
  requireAdminPermission(ADMIN_PERMISSIONS.COUPONS_READ),
  asyncHandler(listAdminCoupons),
);
adminRouter.post(
  "/coupons",
  requireAdminPermission(ADMIN_PERMISSIONS.COUPONS_WRITE),
  asyncHandler(createAdminCoupon),
);
adminRouter.patch(
  "/coupons/:couponId",
  requireAdminPermission(ADMIN_PERMISSIONS.COUPONS_WRITE),
  validation(adminValidator.validateCouponIdParam, REQUEST_SOURCES.PARAMS),
  asyncHandler(updateAdminCoupon),
);
adminRouter.delete(
  "/coupons/:couponId",
  requireAdminPermission(ADMIN_PERMISSIONS.COUPONS_WRITE),
  validation(adminValidator.validateCouponIdParam, REQUEST_SOURCES.PARAMS),
  asyncHandler(deleteAdminCoupon),
);

adminRouter.get(
  "/rewards",
  requireAdminPermission(ADMIN_PERMISSIONS.REWARDS_READ),
  asyncHandler(listAdminRewards),
);
adminRouter.get(
  "/notifications",
  requireAdminPermission(ADMIN_PERMISSIONS.NOTIFICATIONS_READ),
  asyncHandler(listAdminNotifications),
);
adminRouter.post(
  "/notifications",
  requireAdminPermission(ADMIN_PERMISSIONS.NOTIFICATIONS_WRITE),
  validation(adminValidator.validateNotificationBody, REQUEST_SOURCES.BODY),
  asyncHandler(createAdminNotifications),
);
adminRouter.get(
  "/audit-logs",
  requireAdminPermission(ADMIN_PERMISSIONS.AUDIT_LOGS_READ),
  asyncHandler(listAdminAuditLogs),
);

adminRouter.get(
  "/generation",
  requireAdminPermission(ADMIN_PERMISSIONS.GENERATION_READ),
  asyncHandler(listAdminGenerationJobs),
);
adminRouter.get(
  "/generation/:jobId",
  requireAdminPermission(ADMIN_PERMISSIONS.GENERATION_READ),
  validation(adminValidator.validateJobIdParam, REQUEST_SOURCES.PARAMS),
  asyncHandler(getAdminGenerationJob),
);
adminRouter.patch(
  "/generation/:jobId/status",
  requireAdminPermission(ADMIN_PERMISSIONS.GENERATION_WRITE),
  validation(adminValidator.validateJobIdParam, REQUEST_SOURCES.PARAMS),
  validation(adminValidator.validateStatusBody, REQUEST_SOURCES.BODY),
  asyncHandler(updateAdminGenerationStatus),
);

adminRouter.get(
  "/storage",
  requireAdminPermission(ADMIN_PERMISSIONS.STORAGE_READ),
  asyncHandler(getAdminStorageOverview),
);
adminRouter.get(
  "/roles",
  requireAdminPermission(ADMIN_PERMISSIONS.ROLES_READ),
  asyncHandler(listAdminRoles),
);
adminRouter.get(
  "/permissions",
  requireAdminPermission(ADMIN_PERMISSIONS.PERMISSIONS_READ),
  asyncHandler(listAdminPermissions),
);

// Future-Ready Enterprise Placeholder APIs
adminRouter.get(
  "/future/organizations",
  requireAdminPermission(ADMIN_PERMISSIONS.SETTINGS_READ),
  asyncHandler(getOrganizations),
);
adminRouter.post(
  "/future/organizations",
  requireAdminPermission(ADMIN_PERMISSIONS.SETTINGS_WRITE),
  asyncHandler(createOrganization),
);
adminRouter.get(
  "/future/teams",
  requireAdminPermission(ADMIN_PERMISSIONS.SETTINGS_READ),
  asyncHandler(getTeams),
);
adminRouter.post(
  "/future/teams",
  requireAdminPermission(ADMIN_PERMISSIONS.SETTINGS_WRITE),
  asyncHandler(createTeam),
);
adminRouter.get(
  "/future/regional-admins",
  requireAdminPermission(ADMIN_PERMISSIONS.ROLES_READ),
  asyncHandler(getRegionalAdmins),
);
adminRouter.post(
  "/future/white-label",
  requireAdminPermission(ADMIN_PERMISSIONS.SETTINGS_WRITE),
  asyncHandler(updateWhiteLabelConfig),
);
adminRouter.get(
  "/future/multi-tenant",
  requireAdminPermission(ADMIN_PERMISSIONS.SETTINGS_READ),
  asyncHandler(getTenants),
);
adminRouter.get(
  "/future/support-tickets",
  requireAdminPermission(ADMIN_PERMISSIONS.AUDIT_LOGS_READ),
  asyncHandler(getSupportTickets),
);
adminRouter.post(
  "/future/internal-notes",
  requireAdminPermission(ADMIN_PERMISSIONS.USERS_WRITE),
  asyncHandler(addInternalNote),
);
adminRouter.post(
  "/future/approval-workflow",
  requireAdminPermission(ADMIN_PERMISSIONS.SETTINGS_WRITE),
  asyncHandler(submitApprovalWorkflow),
);
adminRouter.post(
  "/future/bulk-operations",
  requireAdminPermission(ADMIN_PERMISSIONS.SETTINGS_WRITE),
  asyncHandler(executeBulkOperation),
);
adminRouter.get(
  "/future/csv-export",
  requireAdminPermission(ADMIN_PERMISSIONS.ANALYTICS_READ),
  asyncHandler(exportCsv),
);

export default adminRouter;
