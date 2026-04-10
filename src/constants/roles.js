export const ROLES = {
  ADMINISTRADOR: "ADMINISTRADOR",
  BOSS: "BOSS",
  SUPERVISOR: "SUPERVISOR",
  EMPLOYEE: "EMPLOYEE",
};

export const EXCEL_ROLES = [ROLES.ADMINISTRADOR, ROLES.BOSS, ROLES.SUPERVISOR];
export const MANAGER_ROLES = [ROLES.ADMINISTRADOR, ROLES.BOSS];

export function canDownloadExcel(role) {
  return EXCEL_ROLES.includes(role);
}

export function isAdmin(role) {
  return role === ROLES.ADMINISTRADOR;
}

export function isBoss(role) {
  return role === ROLES.BOSS;
}

export function canManage(role) {
  return MANAGER_ROLES.includes(role);
}

export function canAssignAdminRole(role) {
  return isAdmin(role);
}

export function canChangeTargetUserRole(currentUserRole, targetUserRole) {
  return !(isBoss(currentUserRole) && targetUserRole === ROLES.ADMINISTRADOR);
}

export function getAvailableRoles(currentUserRole) {
  return Object.values(ROLES).filter((role) => {
    if (isBoss(currentUserRole) && role === ROLES.ADMINISTRADOR) {
      return false;
    }

    return true;
  });
}
