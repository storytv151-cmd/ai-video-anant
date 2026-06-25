import auditLogService from '../auditLog.service.js';

const logEvent = async ({
  action,
  actorUserId = null,
  targetId = null,
  request = null,
  metadata = {},
} = {}) =>
  auditLogService.createAuditLog({
    actorType: actorUserId ? 'user' : 'system',
    actorUserId,
    action,
    targetType: 'Payment',
    targetId,
    ip: request?.ip || null,
    userAgent: request?.headers?.['user-agent'] || null,
    requestId: request?.requestId || null,
    path: request?.originalUrl || null,
    method: request?.method || null,
    metadata,
  });

const logGoogleVerifyRequested = async ({ userId, request, metadata = {} } = {}) =>
  logEvent({
    action: 'PAYMENT_GOOGLE_VERIFY_REQUESTED',
    actorUserId: userId,
    request,
    metadata,
  });

const logRestoreRequested = async ({ userId, request, metadata = {} } = {}) =>
  logEvent({
    action: 'PAYMENT_RESTORE_REQUESTED',
    actorUserId: userId,
    request,
    metadata,
  });

const logSubscriptionViewed = async ({ userId, request, metadata = {} } = {}) =>
  auditLogService.createAuditLog({
    actorType: userId ? 'user' : 'system',
    actorUserId: userId,
    action: 'SUBSCRIPTION_CURRENT_VIEWED',
    targetType: 'UserSubscription',
    targetId: userId,
    ip: request?.ip || null,
    userAgent: request?.headers?.['user-agent'] || null,
    requestId: request?.requestId || null,
    path: request?.originalUrl || null,
    method: request?.method || null,
    metadata,
  });

const paymentAuditService = Object.freeze({
  logEvent,
  logGoogleVerifyRequested,
  logRestoreRequested,
  logSubscriptionViewed,
});

export default paymentAuditService;
