import { OAuth2Client } from 'google-auth-library';
import GoogleWebhookEventModel from '../../models/GoogleWebhookEvent.js';
import ApiError from '../../utils/ApiError.js';
import paymentAuditService from '../payment/paymentAuditService.js';
import paymentSettingsService from '../payment/paymentSettingsService.js';
import subscriptionFraudService from './subscriptionFraudService.js';
import subscriptionSyncService from './subscriptionSyncService.js';

const oidcClient = new OAuth2Client();

const NOTIFICATION_TYPE_MAP = Object.freeze({
  1: { label: 'subscription_recovered', syncReason: 'rtdn_recovered' },
  2: { label: 'subscription_renewed', syncReason: 'renewal' },
  3: { label: 'subscription_cancelled', syncReason: 'rtdn_cancel' },
  4: { label: 'subscription_purchased', syncReason: 'rtdn_purchase' },
  5: { label: 'subscription_on_hold', syncReason: 'rtdn_on_hold' },
  6: { label: 'subscription_in_grace_period', syncReason: 'rtdn_grace_period' },
  7: { label: 'subscription_restarted', syncReason: 'rtdn_resume' },
  10: { label: 'subscription_paused', syncReason: 'rtdn_pause' },
  12: { label: 'subscription_revoked', syncReason: 'rtdn_revoke' },
  13: { label: 'subscription_expired', syncReason: 'rtdn_expire' },
});

const getAuthorizationToken = (request) => {
  const header = request?.headers?.authorization || request?.headers?.Authorization || '';
  if (!header) {
    return null;
  }
  const [scheme, token] = String(header).split(' ');
  if (/^bearer$/i.test(scheme) && token) {
    return token;
  }
  return null;
};

const verifyWebhookAuthorization = async ({ request, settings } = {}) => {
  const bearerToken = getAuthorizationToken(request);
  const staticToken = String(settings?.googlePlay?.rtdnVerificationToken || '').trim();

  if (staticToken && bearerToken === staticToken) {
    return { mode: 'static_token' };
  }

  if (!bearerToken) {
    throw new ApiError(401, 'Google RTDN authorization token is required.', {
      code: 'GOOGLE_RTDN_AUTH_REQUIRED',
    });
  }

  const expectedAudience =
    String(settings?.googlePlay?.rtdnAudience || '').trim() ||
    `${request.protocol}://${request.get('host')}${request.originalUrl}`;

  const ticket = await oidcClient.verifyIdToken({
    idToken: bearerToken,
    audience: expectedAudience,
  });
  const payload = ticket.getPayload();
  const issuer = payload?.iss || '';
  if (!['https://accounts.google.com', 'accounts.google.com'].includes(issuer)) {
    throw new ApiError(401, 'Invalid Google RTDN issuer.', {
      code: 'GOOGLE_RTDN_ISSUER_INVALID',
    });
  }
  if (payload?.email_verified !== true) {
    throw new ApiError(401, 'Google RTDN email is not verified.', {
      code: 'GOOGLE_RTDN_EMAIL_UNVERIFIED',
    });
  }

  const allowedEmails = Array.isArray(settings?.googlePlay?.rtdnAuthorizedEmails)
    ? settings.googlePlay.rtdnAuthorizedEmails.filter(Boolean)
    : [];
  if (allowedEmails.length > 0 && !allowedEmails.includes(payload?.email)) {
    throw new ApiError(401, 'Google RTDN email is not authorized.', {
      code: 'GOOGLE_RTDN_EMAIL_UNAUTHORIZED',
    });
  }

  return {
    mode: 'google_oidc',
    audience: expectedAudience,
    email: payload?.email || null,
  };
};

const decodePubSubMessage = (body = {}) => {
  const message = body?.message || {};
  if (!message?.data) {
    throw new ApiError(400, 'Pub/Sub message data is required.', {
      code: 'GOOGLE_RTDN_MESSAGE_DATA_REQUIRED',
    });
  }

  let decoded;
  try {
    decoded = JSON.parse(Buffer.from(String(message.data), 'base64').toString('utf8'));
  } catch {
    throw new ApiError(400, 'Pub/Sub message data is invalid.', {
      code: 'GOOGLE_RTDN_MESSAGE_INVALID',
    });
  }

  return {
    notificationId: String(message.messageId || '').trim() || null,
    publishTime: message.publishTime ? new Date(message.publishTime) : null,
    attributes: message.attributes || {},
    decoded,
  };
};

const getNotificationDescriptor = (notificationType) =>
  NOTIFICATION_TYPE_MAP[Number(notificationType)] || {
    label: 'subscription_unknown',
    syncReason: 'rtdn_unknown',
  };

const createWebhookEvent = async ({ notificationId, packageName, purchaseTokenHash, notificationType, payload }) => {
  if (!notificationId) {
    return null;
  }

  try {
    return await GoogleWebhookEventModel.create({
      provider: 'google_play',
      messageId: notificationId,
      packageName: packageName || null,
      purchaseTokenHash: purchaseTokenHash || null,
      notificationType: notificationType || null,
      payload,
      status: 'pending',
    });
  } catch (error) {
    if (error?.code === 11000) {
      const existing = await GoogleWebhookEventModel.findOne({
        provider: 'google_play',
        messageId: notificationId,
      }).lean();
      return { duplicate: true, existing };
    }
    throw error;
  }
};

const processWebhook = async ({ request, body } = {}) => {
  const settings = await paymentSettingsService.getPaymentSettings();
  await verifyWebhookAuthorization({ request, settings });

  const envelope = decodePubSubMessage(body);
  const decoded = envelope.decoded || {};

  if (decoded.testNotification) {
    await paymentAuditService
      .logEvent({
        action: 'GOOGLE_RTDN_TEST_RECEIVED',
        request,
        metadata: {
          notificationId: envelope.notificationId,
          packageName: decoded.packageName || null,
        },
      })
      .catch(() => null);

    return {
      processed: true,
      ignored: true,
      reason: 'test_notification',
      notificationId: envelope.notificationId,
    };
  }

  if (!decoded.subscriptionNotification) {
    return {
      processed: true,
      ignored: true,
      reason: 'non_subscription_notification',
      notificationId: envelope.notificationId,
    };
  }

  const descriptor = getNotificationDescriptor(decoded.subscriptionNotification.notificationType);
  const purchaseToken = decoded.subscriptionNotification.purchaseToken;
  const purchaseTokenHash = subscriptionFraudService.hashPurchaseToken(purchaseToken);
  const webhookEvent = await createWebhookEvent({
    notificationId: envelope.notificationId,
    packageName: decoded.packageName || null,
    purchaseTokenHash,
    notificationType: descriptor.label,
    payload: decoded,
  });

  if (webhookEvent?.duplicate) {
    return {
      processed: true,
      duplicate: true,
      ignored: true,
      notificationId: envelope.notificationId,
      notificationType: descriptor.label,
    };
  }

  try {
    const result = await subscriptionSyncService.synchronizeByPurchaseToken({
      purchaseToken,
      packageName: decoded.packageName || null,
      request,
      notification: {
        notificationId: envelope.notificationId,
        notificationType: Number(decoded.subscriptionNotification.notificationType),
        notificationTypeLabel: descriptor.label,
        eventTime: decoded.eventTimeMillis ? new Date(Number(decoded.eventTimeMillis)) : envelope.publishTime,
      },
      syncReason: descriptor.syncReason,
    });

    if (webhookEvent?._id) {
      await GoogleWebhookEventModel.findByIdAndUpdate(webhookEvent._id, {
        $set: {
          status: 'processed',
          processedAt: new Date(),
          user: result.userId,
        },
      });
    }

    await paymentAuditService
      .logEvent({
        action: 'GOOGLE_RTDN_PROCESSED',
        actorUserId: result.userId || null,
        request,
        metadata: {
          notificationId: envelope.notificationId,
          notificationType: descriptor.label,
          packageName: decoded.packageName || null,
          userId: result.userId || null,
          paymentId: result.paymentId || null,
        },
      })
      .catch(() => null);

    return {
      processed: true,
      duplicate: false,
      notificationId: envelope.notificationId,
      notificationType: descriptor.label,
      userId: result.userId || null,
      paymentId: result.paymentId || null,
    };
  } catch (error) {
    if (webhookEvent?._id) {
      await GoogleWebhookEventModel.findByIdAndUpdate(webhookEvent._id, {
        $set: {
          status: error?.code === 'SUBSCRIPTION_USER_MAPPING_NOT_FOUND' ? 'ignored' : 'failed',
          processedAt: new Date(),
          error: {
            code: error.code || 'GOOGLE_RTDN_PROCESSING_FAILED',
            message: error.message,
          },
        },
      });
    }

    await paymentAuditService
      .logEvent({
        action: 'GOOGLE_RTDN_FAILED',
        request,
        metadata: {
          notificationId: envelope.notificationId,
          notificationType: descriptor.label,
          packageName: decoded.packageName || null,
          code: error.code || 'GOOGLE_RTDN_PROCESSING_FAILED',
          message: error.message,
        },
      })
      .catch(() => null);

    if (error?.code === 'SUBSCRIPTION_USER_MAPPING_NOT_FOUND') {
      return {
        processed: true,
        ignored: true,
        reason: 'user_mapping_not_found',
        notificationId: envelope.notificationId,
        notificationType: descriptor.label,
      };
    }

    throw error;
  }
};

const googleRtdnService = Object.freeze({
  processWebhook,
  verifyWebhookAuthorization,
  decodePubSubMessage,
});

export default googleRtdnService;
