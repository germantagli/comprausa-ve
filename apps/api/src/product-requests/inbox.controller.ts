import { Controller, Get, HttpCode, HttpStatus, Inject, Param, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { RequestAccess } from "../auth/access.guard";
import { AccessGuard } from "../auth/access.guard";
import { ProductRequestService } from "./product-request.service";

@ApiTags("inbox")
@ApiBearerAuth()
@UseGuards(AccessGuard)
@Controller("v1/inbox")
export class InboxController {
  constructor(@Inject(ProductRequestService) private readonly service: ProductRequestService) {}

  @Get("notifications")
  @ApiOperation({ summary: "Notificaciones internas del usuario autenticado." })
  list(@Req() request: { accessContext: RequestAccess }) {
    return this.service.notifications(request.accessContext.userId);
  }

  @Post("notifications/:id/read")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Marca una notificación como leída." })
  read(@Req() request: { accessContext: RequestAccess }, @Param("id") id: string) {
    return this.service.markRead(request.accessContext.userId, id);
  }
}
