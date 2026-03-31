export const ROLES = {
  ADMINISTRADOR: "ADMINISTRADOR",
  BOSS: "BOSS",
  SUPERVISOR: "SUPERVISOR",
  EMPLOYEE: "EMPLOYEE",
};

export const EXCEL_ROLES = [ROLES.ADMINISTRADOR, ROLES.BOSS, ROLES.SUPERVISOR];

export function canDownloadExcel(role) {
  return EXCEL_ROLES.includes(role);
}

export function isAdmin(role) {
  return role === ROLES.ADMINISTRADOR;
}
