import { Body, Controller, HttpCode, HttpException, HttpStatus, Inject, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  otpChallengeSchema,
  otpVerificationSchema,
  refreshSessionSchema,
  registrationSchema,
} from "@comprausa/validation";
import type { RequestAccess } from "./access.guard";
import { AccessGuard } from "./access.guard";
import { AuthService } from "./auth.service";
import { clientAddress } from "./client-address";

@ApiTags("auth")
@Controller("v1/auth")
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @Post("otp/challenges")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Pide un OTP. La respuesta no incluye el código y no dice si la cuenta existe." })
  @ApiOkResponse({ description: "accepted o throttled. El mismo cuerpo si el destino es nuevo." })
  async challenge(@Body() body: unknown, @Req() request: { ip?: string }) {
    const parsed = otpChallengeSchema.parse(body);
    const result = await this.auth.challenge({ ...parsed, ip: clientAddress(request) });
    if (result.status === "unavailable") {
      throw new HttpException({ error: "otp_not_configured" }, HttpStatus.SERVICE_UNAVAILABLE);
    }
    return result;
  }

  @Post("otp/verifications")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Canjea un OTP. Un fallo no distingue cuenta, código, vencimiento ni bloqueo." })
  async verify(@Body() body: unknown, @Req() request: { ip?: string }) {
    const parsed = otpVerificationSchema.parse(body);
    const result = await this.auth.verify({ ...parsed, ip: clientAddress(request) });
    if (result.status === "unavailable") {
      throw new HttpException({ error: "otp_not_configured" }, HttpStatus.SERVICE_UNAVAILABLE);
    }
    return result;
  }

  @Post("registrations")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Alta con nombre y apellido después de un OTP válido. Sin dirección ni cédula." })
  async register(@Body() body: unknown) {
    const parsed = registrationSchema.parse(body);
    const result = await this.auth.register(parsed);
    if (result.status === "unauthorized") {
      throw new HttpException({ error: "unauthorized" }, HttpStatus.UNAUTHORIZED);
    }
    return result;
  }

  @Post("sessions/refresh")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Rota el refresh token. Reusar un token ya rotado revoca la familia." })
  async refresh(@Body() body: unknown) {
    const parsed = refreshSessionSchema.parse(body);
    const result = await this.auth.refresh(parsed.refreshToken);
    if (result.status === "unauthorized") {
      throw new HttpException({ error: "unauthorized" }, HttpStatus.UNAUTHORIZED);
    }
    return result;
  }

  @Post("sessions/revoke")
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Revoca la sesión actual. No revoca el resto de la familia." })
  async revoke(@Req() request: { accessContext: RequestAccess }) {
    await this.auth.revoke(request.accessContext.sessionId);
    return { status: "revoked" };
  }
}
