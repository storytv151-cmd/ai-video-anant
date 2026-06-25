import AppSettingModel from '../../models/AppSetting.js';
import ApiError from '../../utils/ApiError.js';
import ADMIN_PERMISSIONS, {
  ADMIN_PERMISSION_DEFINITIONS,
  DEFAULT_ADMIN_ROLE_CONFIGS,
} from '../../constants/adminPermissions.js';
import ROLES from '../../constants/roles.js';

const mergeByCode = ({ defaults = [], overrides = [] } = {}) => {
  const map = new Map();

  for (const item of defaults) {
    if (!item?.code) {
      continue;
    }
    map.set(item.code, { ...item });
  }

  for (const item of overrides) {
    if (!item?.code) {
      continue;
    }
    const existing = map.get(item.code) || {};
    map.set(item.code, {
      ...existing,
      ...item,
      inherits: Array.isArray(item.inherits) ? item.inherits : existing.inherits || [],
      permissions: Array.isArray(item.permissions)
        ? item.permissions
        : existing.permissions || [],
    });
  }

  return Array.from(map.values());
};

const normalizePermission = (permission) => String(permission || '').trim().toLowerCase();
const normalizeRoleCode = (roleCode) => String(roleCode || '').trim().toLowerCase();

const getAdminAccessConfig = async () => {
  const setting = await AppSettingModel.findOne({ section: 'ADMIN', key: 'access' }).lean();
  const adminAccess = setting?.adminAccess || {};

  const permissions = mergeByCode({
    defaults: ADMIN_PERMISSION_DEFINITIONS,
    overrides: Array.isArray(adminAccess.permissions) ? adminAccess.permissions : [],
  }).filter((item) => item.enabled !== false);

  const roles = mergeByCode({
    defaults: DEFAULT_ADMIN_ROLE_CONFIGS,
    overrides: Array.isArray(adminAccess.roles) ? adminAccess.roles : [],
  }).filter((item) => item.enabled !== false);

  return {
    enabled: adminAccess.enabled !== false,
    allowCustomRoles: adminAccess.allowCustomRoles !== false,
    sensitiveActionConfirmationRequired: Boolean(adminAccess.sensitiveActionConfirmationRequired),
    allowedIpRanges: Array.isArray(adminAccess.allowedIpRanges) ? adminAccess.allowedIpRanges : [],
    rateLimit: adminAccess.rateLimit || { windowMs: 60000, maxRequests: 120 },
    futureScopes: Array.isArray(adminAccess.futureScopes) ? adminAccess.futureScopes : [],
    permissions,
    roles,
  };
};

const buildRoleMap = (roles = []) => {
  const map = new Map();
  for (const role of roles) {
    if (!role?.code) {
      continue;
    }
    map.set(normalizeRoleCode(role.code), role);
  }
  return map;
};

const resolveRoleCode = ({ role = null, adminRoleCode = null, metadata = {} } = {}) => {
  const normalizedRole = normalizeRoleCode(role);
  if (normalizedRole === normalizeRoleCode(ROLES.CUSTOM)) {
    return normalizeRoleCode(adminRoleCode || metadata?.adminRoleCode || null);
  }
  return normalizedRole;
};

const collectPermissions = ({ roleCode, roleMap, visited = new Set() } = {}) => {
  const normalizedRoleCode = normalizeRoleCode(roleCode);
  if (!normalizedRoleCode || visited.has(normalizedRoleCode)) {
    return new Set();
  }
  visited.add(normalizedRoleCode);

  const role = roleMap.get(normalizedRoleCode);
  if (!role) {
    return new Set();
  }

  const permissions = new Set(
    (Array.isArray(role.permissions) ? role.permissions : []).map(normalizePermission).filter(Boolean),
  );

  for (const inheritedRoleCode of Array.isArray(role.inherits) ? role.inherits : []) {
    const inheritedPermissions = collectPermissions({
      roleCode: inheritedRoleCode,
      roleMap,
      visited,
    });
    for (const permission of inheritedPermissions) {
      permissions.add(permission);
    }
  }

  return permissions;
};

const resolvePermissionContext = async ({ requestUser = null, user = null } = {}) => {
  const subject = user || requestUser || {};
  const config = await getAdminAccessConfig();
  const roleMap = buildRoleMap(config.roles);
  const roleCode = resolveRoleCode({
    role: subject.role,
    adminRoleCode: subject.adminRoleCode,
    metadata: subject.metadata || {},
  });
  const permissions = Array.from(collectPermissions({ roleCode, roleMap }));
  const isSuperAdmin = permissions.includes('*') || roleCode === normalizeRoleCode(ROLES.SUPER_ADMIN);
  const isAdmin =
    config.enabled &&
    Boolean(roleCode) &&
    roleCode !== normalizeRoleCode(ROLES.USER) &&
    (roleMap.has(roleCode) || isSuperAdmin);

  return {
    config,
    roleCode,
    role: roleMap.get(roleCode) || null,
    permissions,
    isAdmin,
    isSuperAdmin,
  };
};

const hasPermission = ({ context, permission } = {}) => {
  const normalizedPermission = normalizePermission(permission);
  if (!context?.enabled || !context?.isAdmin) {
    return false;
  }
  return (
    context.isSuperAdmin ||
    context.permissions.includes('*') ||
    context.permissions.includes(normalizedPermission)
  );
};

const assertPermission = ({ context, permission } = {}) => {
  if (!hasPermission({ context, permission })) {
    throw new ApiError(403, 'Admin permission denied.', {
      code: 'ADMIN_PERMISSION_DENIED',
      details: {
        permission: normalizePermission(permission),
        role: context?.roleCode || null,
      },
    });
  }
};

const listPermissionCatalog = async () => {
  const config = await getAdminAccessConfig();
  return config.permissions;
};

const listRoleCatalog = async () => {
  const config = await getAdminAccessConfig();
  return config.roles;
};

const adminPermissionService = Object.freeze({
  ADMIN_PERMISSIONS,
  getAdminAccessConfig,
  resolvePermissionContext,
  resolveRoleCode,
  hasPermission,
  assertPermission,
  listPermissionCatalog,
  listRoleCatalog,
});

export default adminPermissionService;
