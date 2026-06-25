import AuditLogModel from '../models/AuditLog.js';
import { getRequestContext } from '../utils/requestContext.js';

const safeString = (value, max = 200) => {
  if (value === undefined || value === null) {
    return null;
  }
  const s = String(value);
  return s.length > max ? s.slice(0, max) : s;
};

const createAuditLog = async ({
  actorType = 'system',
  actorUserId = null,
  actorDeviceId = null,
  action,
  targetType = null,
  targetId = null,
  ip = null,
  userAgent = null,
  requestId = null,
  path = null,
  method = null,
  metadata = {},
} = {}) => {
  const ctx = getRequestContext();
  const doc = {
    actor: { type: actorType, user: actorUserId, device: actorDeviceId },
    action: String(action),
    target: { type: targetType, id: targetId },
    requestId: requestId || ctx?.requestId || null,
    ip: ip || ctx?.ip || null,
    userAgent: safeString(userAgent, 300),
    path: safeString(path || ctx?.path, 300),
    method: safeString(method || ctx?.method, 20),
    metadata: metadata || {},
  };

  const docs = await AuditLogModel.create([doc]);
  return docs[0];
};

const auditLogService = Object.freeze({
  createAuditLog,
});

export default auditLogService;
