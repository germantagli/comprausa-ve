import { Body, Controller, HttpCode, HttpException, HttpStatus, Inject, Post } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { devOtpSchema } from "@comprausa/validation";
import { otpDestinationKey } from "./destination";
import { SimulatedOtpProvider } from "./simulated-otp.provider";

/**
 * Mounted only when NODE_ENV is development and OTP_PROVIDER is simulated.
 * This is the only HTTP response allowed to contain the one-time code.
 */
@ApiTags("auth")
@Controller("v1/auth/dev")
export class DevOtpController {
  constructor(@Inject(SimulatedOtpProvider) private readonly otp: SimulatedOtpProvider) {}

  @Post("otp-code")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Lee el OTP simulado vigente. Solo desarrollo. No escribe logs." })
  @ApiOkResponse({ description: "El código vigente, o 404 si no hay uno usable." })
  peek(@Body() body: unknown) {
    const parsed = devOtpSchema.parse(body);
    const code = this.otp.peekCode(otpDestinationKey(parsed.channel, parsed.destination));
    if (code === undefined) {
      throw new HttpException({ error: "not_found" }, HttpStatus.NOT_FOUND);
    }
    return { code };
  }
}
