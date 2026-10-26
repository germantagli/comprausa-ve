export const ROLE_CODES = [
  "SUPER_ADMIN",
  "OPERATIONS_ADMIN",
  "PROCUREMENT_AGENT",
  "FINANCE_AGENT",
  "LOGISTICS_AGENT",
  "SUPPORT_AGENT",
  "CUSTOMER",
] as const;

export type RoleCode = (typeof ROLE_CODES)[number];

const ADMIN_ROLES = new Set<RoleCode>(ROLE_CODES.filter((code) => code !== "CUSTOMER"));

export function isRoleCode(value: string): value is RoleCode {
  return (ROLE_CODES as readonly string[]).includes(value);
}

export function isAdminRole(role: RoleCode): boolean {
  return ADMIN_ROLES.has(role);
}

const PAYMENT_REVIEW_ROLES = new Set<RoleCode>(["SUPER_ADMIN", "OPERATIONS_ADMIN", "FINANCE_AGENT"]);

export function canReviewPayments(role: RoleCode): boolean {
  return PAYMENT_REVIEW_ROLES.has(role);
}

export function selectRole(codes: readonly string[]): RoleCode {
  const known = codes.filter(isRoleCode);
  return known.find((code) => code !== "CUSTOMER") ?? "CUSTOMER";
}
