export const ROLE_KEYS = ["admin", "waiter", "kitchen", "cashier"] as const;

export type RoleKey = (typeof ROLE_KEYS)[number];

export const ROLE_LABELS: Record<RoleKey, string> = {
  admin: "Administrador",
  waiter: "Mozo",
  kitchen: "Cocina",
  cashier: "Cajero",
};

export const PERMISSIONS = {
  viewDashboard: "dashboard.view",
  manageCatalog: "catalog.manage",
  manageTables: "tables.manage",
  createOrders: "orders.create",
  editOwnOrders: "orders.edit_own",
  sendToKitchen: "orders.send_to_kitchen",
  manageKitchen: "kitchen.manage",
  managePayments: "payments.manage",
  verifyDigitalPayments: "payments.verify_digital",
  manageCash: "cash.manage",
  viewFinancials: "financials.view",
  manageExpenses: "expenses.manage",
  viewReports: "reports.view",
  manageUsers: "users.manage",
  viewAudit: "audit.view",
  reverseCriticalActions: "critical_actions.reverse",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const ROLE_PERMISSIONS: Record<RoleKey, readonly Permission[]> = {
  admin: Object.values(PERMISSIONS),
  waiter: [
    PERMISSIONS.viewDashboard,
    PERMISSIONS.createOrders,
    PERMISSIONS.editOwnOrders,
    PERMISSIONS.sendToKitchen,
  ],
  kitchen: [PERMISSIONS.viewDashboard, PERMISSIONS.manageKitchen],
  cashier: [
    PERMISSIONS.viewDashboard,
    PERMISSIONS.managePayments,
    PERMISSIONS.verifyDigitalPayments,
    PERMISSIONS.manageCash,
  ],
};

export function roleHasPermission(role: RoleKey, permission: Permission) {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function rolesHavePermission(
  roles: readonly RoleKey[],
  permission: Permission,
) {
  return roles.some((role) => roleHasPermission(role, permission));
}

export function getRoleLabel(role: string) {
  return ROLE_LABELS[role as RoleKey] ?? role;
}

