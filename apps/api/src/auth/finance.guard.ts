import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from "@nestjs/common";
import type { RequestAccess } from "./access.guard";
import { canReviewPayments } from "./roles";

/** Finance review requires one of the payment roles and a session that already completed TOTP. */
@Injectable()
export class FinanceGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ accessContext?: RequestAccess }>();
    const access = request.accessContext;
    if (!access) {
      throw new HttpException({ error: "unauthorized" }, HttpStatus.UNAUTHORIZED);
    }
    if (!access.mfaSatisfied || !canReviewPayments(access.role)) {
      throw new HttpException({ error: "forbidden" }, HttpStatus.FORBIDDEN);
    }
    return true;
  }
}
