# Admin Management & Permission Engine Documentation

This document describes the design, architecture, implementation, and future expansion path of the Admin Management subsystem on the AI Media Generation Platform.

---

## 1. Permission & Role Engine

The platform operates a dynamic, permission-based access control system (PBAC) instead of hardcoded role checks.

### Roles & Inheritance

We support standard system roles and accommodate dynamic role configurations loaded from the database:

- **Super Admin (`super_admin`)**: Grants wild-card access (`*`) to all system functions.
- **Admin (`admin`)**: Operational control over all subsystems excluding role assignments/modifications of other Super Admins.
- **Support (`support`)**: User resolution, account management, basic wallet adjustments, and view-only diagnostics.
- **Moderator (`moderator`)**: Content moderation, category mapping, and template management.
- **Finance (`finance`)**: Revenue tracking, payment refunds, and wallet credit actions.
- **Analytics (`analytics`)**: Read-only metrics, system storage reports, and audit logs.
- **Read Only (`read_only`)**: System-wide view access without write permissions.

### Permission Mapping

Permissions are stored in [adminPermissions.js](file:///d:/jayesh2/backand/ai%20video%20ananat/backend/src/constants/adminPermissions.js) and resolved recursively through roles (supporting nested/inherited role permissions):

- `users.read`, `users.write`, `users.status`, `users.role.assign`, `users.devices.read`, `users.login_history.read`, `users.generations.read`, `users.payments.read`, `users.subscriptions.read`
- `wallets.read`, `wallets.adjust`, `wallets.refund`, `wallets.lock`, `wallets.transactions.read`
- `templates.read`, `templates.write`, `templates.publish`
- `categories.read`, `categories.write`
- `providers.read`, `providers.write`, `provider_models.read`, `provider_models.write`, `providers.pricing.write`
- `subscriptions.read`, `subscriptions.write`
- `payments.read`, `payments.refund`, `payments.tokens.read`
- `settings.read`, `settings.write`
- `coupons.read`, `coupons.write`
- `rewards.read`
- `notifications.read`, `notifications.write`
- `audit_logs.read`
- `analytics.read`
- `storage.read`
- `generation.read`, `generation.write`
- `roles.read`, `roles.write`, `permissions.read`

---

## 2. Admin Flow & Security Middleware

Every API endpoint under the admin router is protected using JWT authentication and authorized via permission-checking middleware in [adminAccess.js](file:///d:/jayesh2/backand/ai%20video%20ananat/backend/src/middleware/adminAccess.js):

1. **`authenticate`**: Verifies the JWT signature, loads the token payload, and sets `request.user`.
2. **`requireAdminAccess`**: Resolves the user's admin permission context from the database settings. Confirms that the admin console and the admin user accounts are enabled.
3. **`requireAdminPermission(permission)`**: Asserts that the authenticated admin possesses the specific permission token (or has a wildcard `*`).
4. **IP Restrictions & Rate Limiting**: The configuration settings (`ADMIN.access`) allow restricting admin requests to allowed IP ranges and enforcing strict rate limits (`windowMs`, `maxRequests`).

---

## 3. Dashboard & Analytics APIs

Dashboard and analytics APIs compile complex MongoDB aggregation states into fast administrative reports:

- **Dashboard API** (`GET /api/v1/admin/dashboard`): Returns daily metrics including today's revenue, registered users, generation counts, purchase activities, active subscriptions, external provider health checks, active processing queues, and storage capacities.
- **Analytics API** (`GET /api/v1/admin/analytics`): Supports pagination, date range filtering, and custom search filters to analyze revenue trends, customer lifetime value, top-performing media generation templates, error rates per provider, and regional distribution.

---

## 4. Audit Log System

Security compliance requires logging every admin action. The `adminAuditService` logs:

- Admin logins / logouts
- User profile updates (suspend, block, role adjustments)
- Wallet transactions (credit grant, deduction, locks)
- Payment activities (refunds, overrides)
- Operational setting overrides (provider weight shifts, maintenance toggles)
- Permission adjustments

Logs include the Request ID (`X-Request-ID`), Admin User ID, Client IP, Target Resource, Action, and a detailed metadata diff payload.

---

## 5. Future-Ready Enterprise Integrations

Placeholder interfaces are exposed on `/api/v1/admin/future/*` to enable quick integration of future enterprise capabilities:

| Endpoint                          | Method        | Service Method                           | Integration Target                                            |
| :-------------------------------- | :------------ | :--------------------------------------- | :------------------------------------------------------------ |
| `/admin/future/organizations`     | `GET`, `POST` | `getOrganizations`, `createOrganization` | B2B organizational hierarchies & accounts                     |
| `/admin/future/teams`             | `GET`, `POST` | `getTeams`, `createTeam`                 | Multi-user team workflows and shared credits                  |
| `/admin/future/regional-admins`   | `GET`         | `getRegionalAdmins`                      | Country/regional admin boundary mappings                      |
| `/admin/future/white-label`       | `POST`        | `updateWhiteLabelConfig`                 | Custom branding, domain masking, email SMTPs                  |
| `/admin/future/multi-tenant`      | `GET`         | `getTenants`                             | Multi-tenant database routing & tenant configurations         |
| `/admin/future/support-tickets`   | `GET`         | `getSupportTickets`                      | Zendesk/Freshdesk/Internal support ticket syncing             |
| `/admin/future/internal-notes`    | `POST`        | `addInternalNote`                        | Contextual notes on user profiles or support issues           |
| `/admin/future/approval-workflow` | `POST`        | `submitApprovalWorkflow`                 | Maker-Checker (dual approval) for high-value wallet changes   |
| `/admin/future/bulk-operations`   | `POST`        | `executeBulkOperation`                   | Bulk user suspension, package updates, or template publishing |
| `/admin/future/csv-export`        | `GET`         | `exportCsv`                              | Direct CSV data exports for spreadsheets                      |
