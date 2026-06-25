import ApiError from '../../utils/ApiError.js';
import ROLES from '../../constants/roles.js';
import adminPermissionService from './adminPermissionService.js';

const listRoles = async () => {
  const roles = await adminPermissionService.listRoleCatalog();
  return { items: roles };
};

const listPermissions = async () => {
  const permissions = await adminPermissionService.listPermissionCatalog();
  return { items: permissions };
};

const assertAssignableRole = async ({ role, adminRoleCode = null } = {}) => {
  const normalizedRole = String(role || '').trim().toLowerCase();
  if (!normalizedRole) {
    throw new ApiError(400, 'role is required.', { code: 'ADMIN_ROLE_REQUIRED' });
  }

  const roles = await adminPermissionService.listRoleCatalog();
  const allowedRoleCodes = new Set(roles.map((item) => String(item.code || '').trim().toLowerCase()));
  if (normalizedRole === ROLES.CUSTOM && !adminRoleCode) {
    throw new ApiError(400, 'adminRoleCode is required for custom roles.', {
      code: 'ADMIN_CUSTOM_ROLE_CODE_REQUIRED',
    });
  }
  if (normalizedRole !== ROLES.CUSTOM && !allowedRoleCodes.has(normalizedRole)) {
    throw new ApiError(400, 'Admin role is not configured.', {
      code: 'ADMIN_ROLE_INVALID',
      details: { role: normalizedRole },
    });
  }

  if (normalizedRole === ROLES.CUSTOM) {
    const normalizedAdminRoleCode = String(adminRoleCode || '').trim().toLowerCase();
    if (!allowedRoleCodes.has(normalizedAdminRoleCode)) {
      throw new ApiError(400, 'Custom admin role code is not configured.', {
        code: 'ADMIN_CUSTOM_ROLE_INVALID',
        details: { adminRoleCode: normalizedAdminRoleCode },
      });
    }
  }
};

const resolveUserRoleAssignment = async ({ role, adminRoleCode = null } = {}) => {
  await assertAssignableRole({ role, adminRoleCode });

  return {
    role: String(role || '').trim().toLowerCase(),
    adminRoleCode: role === ROLES.CUSTOM ? String(adminRoleCode || '').trim().toLowerCase() : null,
  };
};

const adminRoleService = Object.freeze({
  listRoles,
  listPermissions,
  assertAssignableRole,
  resolveUserRoleAssignment,
});

export default adminRoleService;
