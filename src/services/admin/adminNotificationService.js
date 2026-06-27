import NotificationModel from "../../models/Notification.js";
import UserModel from "../../models/User.js";
import adminAuditService from "./adminAuditService.js";
import adminQueryService from "./adminQueryService.js";

const listNotifications = async ({ query = {} } = {}) => {
  const { page, limit, skip } = adminQueryService.buildPagination({
    page: query.page,
    limit: query.limit,
    maxLimit: 100,
  });
  const filter = {};
  if (query.userId) {
    filter.user = query.userId;
  }
  if (query.type) {
    filter.type = String(query.type).trim().toLowerCase();
  }
  if (query.read !== undefined) {
    filter.read = adminQueryService.parseBoolean(query.read, false);
  }
  const [items, total] = await Promise.all([
    NotificationModel.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    NotificationModel.countDocuments(filter),
  ]);
  return adminQueryService.buildPaginatedResponse({
    items,
    page,
    limit,
    total,
  });
};

const createNotifications = async ({
  payload = {},
  adminUserId = null,
  request = null,
} = {}) => {
  const userIds = Array.isArray(payload.userIds)
    ? payload.userIds
    : payload.userId
      ? [payload.userId]
      : [];
  const targets =
    userIds.length > 0
      ? userIds
      : (
          await UserModel.find({ accountStatus: "active" })
            .select({ _id: 1 })
            .limit(
              Math.min(
                adminQueryService.parsePositiveInt(payload.limit, 100),
                500,
              ),
            )
            .lean()
        ).map((user) => user._id);

  const docs = targets.map((userId) => ({
    user: userId,
    title: payload.title,
    message: payload.message,
    type: payload.type || "system",
    payload: payload.payload || {},
    scheduledAt: payload.scheduledAt || null,
  }));
  const items = docs.length > 0 ? await NotificationModel.insertMany(docs) : [];

  await adminAuditService.logAdminAction({
    request,
    adminUserId,
    action: "ADMIN_NOTIFICATION_CREATED",
    targetType: "Notification",
    targetId: items?.[0]?._id || null,
    metadata: { count: items.length, type: payload.type || "system" },
  });

  return { items, count: items.length };
};

const adminNotificationService = Object.freeze({
  listNotifications,
  createNotifications,
});

export default adminNotificationService;
