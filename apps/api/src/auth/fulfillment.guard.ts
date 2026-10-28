import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from "@nestjs/common";
import type { RequestAccess } from "./access.guard";
import { canOperateFulfillment } from "./roles";

/** Manual purchase and logistics require an operator role and a session that already completed TOTP. */
@Injectable()
export class FulfillmentGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ accessContext?: RequestAccess }>();
    const access = request.accessContext;
    if (!access) {
      throw new HttpException({ error: "unauthorized" }, HttpStatus.UNAUTHORIZED);
    }
    if (!access.mfaSatisfied || !canOperateFulfillment(access.role)) {
      throw new HttpException({ error: "forbidden" }, HttpStatus.FORBIDDEN);
    }
    return true;
  }
}
