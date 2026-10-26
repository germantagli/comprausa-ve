import { Controller, Get, HttpException, HttpStatus, Inject, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { RequestAccess } from "./access.guard";
import { AccessGuard } from "./access.guard";
import { AuthService } from "./auth.service";

@ApiTags("account")
@ApiBearerAuth()
@UseGuards(AccessGuard)
@Controller("v1/account")
export class AccountController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @Get("profile")
  @ApiOperation({ summary: "Nombre de la sesión actual. No incluye cédula ni dirección." })
  async profile(@Req() request: { accessContext: RequestAccess }) {
    const profile = await this.auth.profile(request.accessContext.userId);
    if (!profile) {
      throw new HttpException({ error: "unauthorized" }, HttpStatus.UNAUTHORIZED);
    }
    return profile;
  }
}
