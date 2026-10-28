import { Controller, Get, Inject, Optional, ServiceUnavailableException } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { AppEnv } from "@comprausa/config";
import type { HealthReport } from "@comprausa/types";
import { APP_ENV } from "../config/app-config.module";
import { PrismaService } from "../prisma/prisma.service";

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(
    @Inject(APP_ENV) private readonly env: AppEnv,
    @Optional() @Inject(PrismaService) private readonly prisma?: PrismaService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Liveness. No revisa la base de datos ni cobra pagos." })
  @ApiOkResponse({ description: "Proceso vivo. Catálogo de demostración. Pagos sin configurar." })
  live(): HealthReport {
    return {
      status: "ok",
      service: "api",
      displayName: this.env.displayName,
      catalog: "internal-demo",
      otp:
        this.env.otpProvider === "simulated" && this.env.simulatedOtpAllowed
          ? "simulated"
          : this.env.otpProvider === "resend"
            ? "resend"
            : this.env.otpProvider === "twilio"
              ? "twilio"
              : "not_configured",
      oauth: {
        google: this.env.googleClientIds.length > 0,
        apple: this.env.appleClientIds.length > 0,
      },
      payments: "not_configured",
      stores: "no_external_connector",
    };
  }

  @Get("ready")
  @ApiOperation({ summary: "Readiness. Falla si Postgres no responde." })
  async ready(): Promise<{ status: "ready" }> {
    if (!this.prisma) {
      throw new ServiceUnavailableException({ status: "not_ready" });
    }
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException({ status: "not_ready" });
    }
    return { status: "ready" };
  }
}
