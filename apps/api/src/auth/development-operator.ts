import type { RoleCode } from "./roles";

/** Development login only. It assigns a role and does not satisfy MFA. */
export const DEVELOPMENT_FINANCE_EMAIL = "finanzas@comprausa.test";

export function developmentOperator(nodeEnv: "development" | "test" | "production"): { email: string; role: RoleCode } | null {
  if (nodeEnv !== "development") {
    return null;
  }
  return { email: DEVELOPMENT_FINANCE_EMAIL, role: "FINANCE_AGENT" };
}
