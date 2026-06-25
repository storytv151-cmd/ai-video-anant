import { formatSuccessResponse } from '../utils/responseFormatter.js';
import generationService from '../services/generation/generationService.js';
import auditLogService from '../services/auditLog.service.js';

const start = async (request, response) => {
  const data = await generationService.startGeneration({
    userId: request.user.id,
    payload: request.body,
    idempotencyKey: request.idempotencyKey || null,
  });

  auditLogService
    .createAuditLog({
      actorType: 'user',
      actorUserId: request.user.id,
      action: 'GENERATION_START',
      targetType: 'VideoGenerationJob',
      targetId: data?.jobId || null,
      ip: request.ip,
      userAgent: request.headers['user-agent'] || null,
      requestId: request.requestId || null,
      path: request.originalUrl,
      method: request.method,
      metadata: { idempotencyKey: request.idempotencyKey || null, status: data?.status || null },
    })
    .catch(() => null);
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const cancel = async (request, response) => {
  const data = await generationService.cancelJob({
    userId: request.user.id,
    jobId: request.params.jobId,
    idempotencyKey: request.idempotencyKey || null,
  });

  auditLogService
    .createAuditLog({
      actorType: 'user',
      actorUserId: request.user.id,
      action: 'GENERATION_CANCEL',
      targetType: 'VideoGenerationJob',
      targetId: data?.jobId || request.params.jobId || null,
      ip: request.ip,
      userAgent: request.headers['user-agent'] || null,
      requestId: request.requestId || null,
      path: request.originalUrl,
      method: request.method,
      metadata: { idempotencyKey: request.idempotencyKey || null, status: data?.status || null },
    })
    .catch(() => null);
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const retry = async (request, response) => {
  const data = await generationService.retryJob({
    userId: request.user.id,
    jobId: request.params.jobId,
    payload: request.body,
    idempotencyKey: request.idempotencyKey || null,
  });

  auditLogService
    .createAuditLog({
      actorType: 'user',
      actorUserId: request.user.id,
      action: 'GENERATION_RETRY',
      targetType: 'VideoGenerationJob',
      targetId: data?.jobId || request.params.jobId || null,
      ip: request.ip,
      userAgent: request.headers['user-agent'] || null,
      requestId: request.requestId || null,
      path: request.originalUrl,
      method: request.method,
      metadata: { idempotencyKey: request.idempotencyKey || null, status: data?.status || null },
    })
    .catch(() => null);
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

export { start, cancel, retry };
