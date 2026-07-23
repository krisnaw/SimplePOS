# Simple RBAC Plan

## Goal

Keep **Admin** as the unrestricted role and initially give **Cashier** access only to the Sales page. Model access as granular permissions, so a future Cashier inventory capability is an assignment change—not a new role or a large rewrite. Enforce the policy in both the UI and Electron main process so hiding a screen is not the only protection.

## Initial cashier access

| Area | Cashier access | Admin access |
| --- | --- | --- |
| Dashboard | No access | Full |
| Sales | Create and update drafts, checkout, preview, and print receipts | Full |
| Invoices | No access | Full |
| Customers, vehicles, and work orders | No access | Full |
| Products and services | Read-only lookup only when required by the Sales page | Full management |
| Inventory, purchases, stock movements, and stock counts | No access | Full |
| Suppliers | No access | Full |
| Reports | No access | Full |
| Users and settings | No access | Full |

> Confirm the exact Sales-page actions before implementation, especially whether cashiers may create customers/vehicles from checkout and whether they may void or refund completed sales.

## Permission model

- A role is a named collection of permissions; it is not synonymous with a workspace.
- Permissions are action-level and additive. Examples: `sales.read`, `sales.drafts.manage`, `sales.checkout`, `sales.receipts.print`, `inventory.read`, `inventory.products.manage`, and `inventory.purchases.manage`.
- The initial `cashier` assignment contains only the permissions needed by Sales. To grant later access to Inventory, assign only the required inventory permissions (for example, `inventory.read` first, then `inventory.products.manage` if editing is approved).
- `admin` remains a system role with every permission. Do not duplicate a long admin permission list unless custom admin roles are introduced later.
- Keep role-to-permission assignments in the database, seeded by a migration. This allows future assignments to change without redeploying the application. Per-user overrides are out of scope initially, but the schema should leave room for them later.

## Implementation plan

1. Define permissions in one shared module.
   - Create a typed permission catalog grouped by capability, such as `sales.checkout`, `invoices.read`, `inventory.products.read`, and `inventory.products.manage`.
   - Avoid broad permissions such as `inventory.manage` when reading, counting stock, purchasing, and editing products need separate future control.
   - Expose small helpers such as `can(role, permission)` and `canAccessSection(role, section)`; do not scatter `role === 'admin'` checks across screens.

2. Add persistent role-permission assignments.
   - Add `permissions` and `role_permissions` tables, with a unique role/permission pair and a migration that seeds the initial assignments.
   - Seed `cashier` with the exact Sales permissions above and treat `admin` as an allow-all system role.
   - Read and cache the authenticated user's effective permissions at login; refresh them on the next login after an admin changes assignments.
   - Keep a narrow internal service for modifying assignments. Its UI can be deferred, but only admins may invoke it.

3. Establish an authenticated Electron session.
   - When `auth:login` succeeds, store the authenticated user against the calling `webContents` in the main process.
   - Add `auth:logout`, clear the session when the window closes, and reject protected IPC calls when no active session exists.
   - Do not treat the user object in React Router navigation state as proof of authorization; it is only display state.

4. Authorize every IPC handler in the main process.
   - Wrap handlers with a `requirePermission(event, permission)` guard before calling services or repositories.
   - Authorize read operations as well as mutations when their data is restricted (for example costs, reports, users, suppliers, and settings).
   - Derive audit fields such as `createdById` and `updatedById` from the authenticated session instead of trusting renderer-supplied user IDs.
   - Return a consistent `Forbidden` result/error that the renderer can present without leaking data.

5. Restrict navigation and direct section access in the renderer.
   - Filter `navigationItems` using `canAccessSection`; keyboard shortcuts must use the filtered list too.
   - Cashiers should see Sales as their only navigation item and initial section; admins keep the existing full navigation.
   - If the active section becomes unavailable, redirect a cashier to Sales and an admin to Dashboard.
   - Add a small `AccessDenied` fallback for deep links or stale UI state rather than mounting an unauthorized workspace.

6. Apply action-level UI permissions.
   - Pass a permission-aware user/capabilities object into workspaces instead of each workspace reimplementing role checks.
   - Hide or disable create/edit/delete, price/cost, refund/void, export, and settings controls according to the permission map.
   - Keep read-only product/service search available only within the Sales workflow; do not expose inventory navigation or any other workspace.

7. Limit Cashier IPC access to Sales dependencies.
   - Allow only the handlers Sales requires: product/service lookup, sales drafts, checkout, and any explicitly approved customer/vehicle lookup or quick-create flow.
   - Deny dashboard, invoice history, reporting, inventory, suppliers, users, settings, and work-order handlers before they call a service or repository.

8. Add tests.
   - Unit-test the permission matrix for both roles and any new permission.
   - Test main-process IPC guards: cashier denial for restricted handlers, cashier success for permitted workflows, and admin success everywhere.
   - Add renderer tests for visible navigation, blocked keyboard navigation, action controls, and the access-denied fallback.
   - Run a manual Electron smoke test with one admin and one cashier account, including logout/login and a cashier attempting a denied action through DevTools.

9. Roll out safely.
   - Ship the permission map and main-process guards together; do not release UI-only restrictions first.
   - Keep the current `admin`/`cashier` user role values and add a database migration only for permission assignments.
   - Update `roles.md`, the in-app user guide, and release notes once the final cashier matrix is approved.

## Future expansion example: grant Cashier limited Inventory access

1. Add the requested inventory permissions to the catalog if they do not already exist.
2. Assign only the approved permissions to `cashier` in `role_permissions`, for example `inventory.products.read`.
3. Expand navigation and the Inventory workspace UI only when the section-level and action-level checks pass.
4. The existing main-process IPC guards automatically permit the new approved handlers and continue to deny stock adjustments, purchases, or product edits unless those specific permissions are also assigned.
5. Add or update the permission-matrix tests before shipping the new access level.

## Acceptance criteria

- An admin can access every existing section and action.
- A cashier sees Sales as the only available section and cannot navigate to another workspace.
- Adding a new Cashier capability requires assigning narrowly scoped permissions, with no change to the user role schema or authorization architecture.
- A cashier cannot retrieve restricted data or perform restricted mutations by directly invoking IPC.
- Cashier Sales flows—including drafts, checkout, receipt preview, and printing—work end to end.
- Signing out clears the Electron session, and reopening the dashboard without a valid session returns the user to login.
