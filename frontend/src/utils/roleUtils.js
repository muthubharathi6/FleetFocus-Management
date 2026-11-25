/**
 * Role & Permission Helpers aligned strictly with Spring Boot @PreAuthorize rules.
 * Ensures the frontend never issues unauthorized API calls for restricted roles.
 */

export function resolveUserRole(authUser) {
  if (authUser?.role) {
    return String(authUser.role).toUpperCase();
  }
  try {
    const storedRole = localStorage.getItem('role');
    if (storedRole) return String(storedRole).toUpperCase();
    const rawUser = localStorage.getItem('user');
    if (rawUser) {
      const parsed = JSON.parse(rawUser);
      if (parsed?.role) return String(parsed.role).toUpperCase();
    }
  } catch {
    // Ignore storage parse issues
  }
  return null;
}

export function resolveUsername(authUser) {
  if (authUser?.username) return authUser.username;
  try {
    const stored = localStorage.getItem('username');
    if (stored) return stored;
    const rawUser = localStorage.getItem('user');
    if (rawUser) {
      const parsed = JSON.parse(rawUser);
      if (parsed?.username) return parsed.username;
    }
  } catch {
    // Ignore storage parse issues
  }
  return 'User';
}

export function getPermissions(role) {
  const r = String(role || '').toUpperCase();
  return {
    // GET /api/vehicles — all authenticated
    canViewVehicles: Boolean(r),
    // POST/PUT/DELETE /api/vehicles — FLEET_MANAGER, ADMIN
    canManageVehicles: r === 'FLEET_MANAGER' || r === 'ADMIN',
    // GET /api/vehicles/available & GET /api/drivers/available — FLEET_MANAGER, DISPATCHER
    canDispatchTrips: r === 'FLEET_MANAGER' || r === 'DISPATCHER',
    // GET /api/trips — all authenticated (DRIVER receives own trips)
    canViewTrips: Boolean(r),
    // GET /api/monitoring/live — FLEET_MANAGER, DISPATCHER
    canViewLiveFleet: r === 'FLEET_MANAGER' || r === 'DISPATCHER',
    // GET /api/drivers — FLEET_MANAGER, DISPATCHER, ADMIN
    canViewDrivers: r === 'FLEET_MANAGER' || r === 'DISPATCHER' || r === 'ADMIN',
    // POST/PUT/DELETE /api/drivers — FLEET_MANAGER
    canManageDrivers: r === 'FLEET_MANAGER',
    // GET /api/maintenance & POST /api/maintenance/log — FLEET_MANAGER, MAINTENANCE_TECH
    canViewMaintenance: r === 'FLEET_MANAGER' || r === 'MAINTENANCE_TECH',
    canManageMaintenance: r === 'FLEET_MANAGER' || r === 'MAINTENANCE_TECH',
    // GET /api/users — ADMIN, FLEET_MANAGER
    canViewUsers: r === 'ADMIN' || r === 'FLEET_MANAGER',
    // DELETE /api/users/{id} — ADMIN
    canDeleteUsers: r === 'ADMIN',
    // GET /api/users/technicians — FLEET_MANAGER, MAINTENANCE_TECH, ADMIN
    canViewTechnicians: r === 'FLEET_MANAGER' || r === 'MAINTENANCE_TECH' || r === 'ADMIN',
  };
}

export function formatRoleLabel(role) {
  if (!role) return 'Unknown Role';
  return String(role)
    .toUpperCase()
    .replaceAll('_', ' ');
}
