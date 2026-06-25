import AuditLogModel from '../../models/AuditLog.js';
import auditLogService from '../auditLog.service.js';
import adminQueryService from './adminQueryService.js';

const logAdminAction = async ({
  request = null,
  adminUserId = null,
  action,
  targetType = null,
  targetId = null,
  metadata = {},
} = {}) =>
  auditLogService.createAuditLog({
    actorType: 'admin',
    actorUserId: adminUserId,
    action,
    targetType,
    targetId,
    ip: request?.ip || null,
    userAgent: request?.headers?.['user-agent'] || null,
    requestId: request?.requestId || null,
    path: request?.originalUrl || null,
    method: request?.method || null,
    metadata,
  });

const listAuditLogs = async ({ query = {} } = {}) => {
  const { page, limit, skip } = adminQueryService.buildPagination({
    page: query.page,
    limit: query.limit,
    maxLimit: 200,
  });
  const filter = {};

  if (query.action) {
    filter.action = String(query.action).trim();
  }
  if (query.actorType) {
    filter['actor.type'] = String(query.actorType).trim().toLowerCase();
  }
  if (query.actorUserId) {
    filter['actor.user'] = query.actorUserId;
  }
  if (query.targetType) {
    filter['target.type'] = String(query.targetType).trim();
  }
  if (query.targetId) {
    filter['target.id'] = query.targetId;
  }

  const createdAt = adminQueryService.buildDateRange({
    from: query.dateFrom || query.from,
    to: query.dateTo || query.to,
  });
  if (createdAt) {
    filter.createdAt = createdAt;
  }

  const searchRegex = adminQueryService.buildRegexSearch(query.search);
  if (searchRegex) {
    filter.$or = [
      { action: searchRegex },
      { requestId: searchRegex },
      { path: searchRegex },
      { ip: searchRegex },
    ];
  }

  const [items, total] = await Promise.all([
    AuditLogModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    AuditLogModel.countDocuments(filter),
  ]);

  return adminQueryService.buildPaginatedResponse({ items, page, limit, total });
};

const adminAuditService = Object.freeze({
  logAdminAction,
  listAuditLogs,
});

export default adminAuditService;
