import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from "@nestjs/common";
import type { RequestAccess } from "./access.guard";
import { isAdminRole } from "./roles";

/**
 * Staff (non-CUSTOMER) access for product-request administration.
 * Payment verification still uses FinanceGuard + MFA separately.
 */
@Injectable()
export class StaffGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ accessContext?: RequestAccess }>();
    const access = request.accessContext;
    if (!access) {
      throw new HttpException({ error: "unauthorized" }, HttpStatus.UNAUTHORIZED);
    }
    if (!isAdminRole(access.role)) {
      throw new HttpException({ error: "forbidden" }, HttpStatus.FORBIDDEN);
    }
    return true;
  }
}
