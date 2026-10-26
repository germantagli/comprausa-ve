import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from "@nestjs/common";
import type { RequestAccess } from "./access.guard";
import { isAdminRole } from "./roles";

/**
 * Admin routes require a non-customer role and a session whose MFA flag is true.
 * OTP login does not set that flag. This guard is not an admin panel.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ accessContext?: RequestAccess }>();
    const access = request.accessContext;
    if (!access) {
      throw new HttpException({ error: "unauthorized" }, HttpStatus.UNAUTHORIZED);
    }
    if (!access.mfaSatisfied || !isAdminRole(access.role)) {
      throw new HttpException({ error: "forbidden" }, HttpStatus.FORBIDDEN);
    }
    return true;
  }
}
