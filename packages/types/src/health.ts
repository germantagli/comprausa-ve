export interface HealthReport {
  status: "ok";
  service: "api";
  displayName: string;
  catalog: "internal-demo";
  otp: "simulated" | "not_configured";
  payments: "not_configured";
  stores: "no_external_connector";
}
