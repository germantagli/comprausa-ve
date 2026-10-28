export interface HealthReport {
  status: "ok";
  service: "api";
  displayName: string;
  catalog: "internal-demo";
  otp: "simulated" | "resend" | "twilio" | "not_configured";
  oauth: {
    google: boolean;
    apple: boolean;
  };
  payments: "not_configured";
  stores: "no_external_connector";
}
