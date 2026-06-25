import ApiError from '../utils/ApiError.js';
import adminPermissionService from '../services/admin/adminPermissionService.js';

const ensureAdminContext = async (request) => {
  const context =
    request.adminAccess ||
    (await adminPermissionService.resolvePermissionContext({
      requestUser: request.user,
    }));

  request.adminAccess = context;
  return context;
};

const requireAdminAccess = async (request, response, next) => {
  try {
    if (!request.user) {
      next(new ApiError(401, 'Authentication required.', { code: 'AUTH_REQUIRED' }));
      return;
    }

    const context = await ensureAdminContext(request);
    if (!context.config.enabled) {
      next(new ApiError(403, 'Admin access is disabled.', { code: 'ADMIN_ACCESS_DISABLED' }));
      return;
    }

    if (!context.isAdmin) {
      next(new ApiError(403, 'Admin access required.', { code: 'ADMIN_ACCESS_REQUIRED' }));
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
};

const requireAdminPermission =
  (permission) =>
  async (request, response, next) => {
    try {
      const context = await ensureAdminContext(request);
      if (!context.isAdmin) {
        next(new ApiError(403, 'Admin access required.', { code: 'ADMIN_ACCESS_REQUIRED' }));
        return;
      }
      adminPermissionService.assertPermission({ context, permission });
      next();
    } catch (error) {
      next(error);
    }
  };

const requireAdminAnyPermission =
  (...permissions) =>
  async (request, response, next) => {
    try {
      const context = await ensureAdminContext(request);
      if (!context.isAdmin) {
        next(new ApiError(403, 'Admin access required.', { code: 'ADMIN_ACCESS_REQUIRED' }));
        return;
      }

      const granted = permissions.some((permission) =>
        adminPermissionService.hasPermission({ context, permission }),
      );
      if (!granted) {
        next(new ApiError(403, 'Admin permission denied.', { code: 'ADMIN_PERMISSION_DENIED' }));
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };

const requireAdminRole =
  (...roles) =>
  async (request, response, next) => {
    try {
      const context = await ensureAdminContext(request);
      if (!context.isAdmin) {
        next(new ApiError(403, 'Admin access required.', { code: 'ADMIN_ACCESS_REQUIRED' }));
        return;
      }

      const allowedRoles = roles.map((item) => String(item || '').trim().toLowerCase()).filter(Boolean);
      if (allowedRoles.length > 0 && !allowedRoles.includes(context.roleCode)) {
        next(new ApiError(403, 'Admin role denied.', { code: 'ADMIN_ROLE_DENIED' }));
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };

export { requireAdminAccess, requireAdminPermission, requireAdminAnyPermission, requireAdminRole };
