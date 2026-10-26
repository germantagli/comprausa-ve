import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AccessGuard } from "./access.guard";
import { AdminGuard } from "./admin.guard";

@ApiTags("admin")
@ApiBearerAuth()
@UseGuards(AccessGuard, AdminGuard)
@Controller("v1/admin")
export class AdminAccessController {
  @Get("access")
  @ApiOperation({ summary: "Comprueba sesión de administración con MFA. No es el panel." })
  access(): { status: "ok" } {
    return { status: "ok" };
  }
}
