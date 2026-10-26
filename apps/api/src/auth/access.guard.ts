import { CanActivate, ExecutionContext, HttpException, HttpStatus, Inject, Injectable } from "@nestjs/common";
import type { AuthRepository } from "./auth.repository";
import { AUTH_CLOCK, AUTH_REPOSITORY } from "./auth.tokens";
import type { Clock } from "./clock";
import type { RoleCode } from "./roles";
import { TokenService } from "./token.service";

export interface RequestAccess {
  userId: string;
  sessionId: string;
  role: RoleCode;
  mfaSatisfied: boolean;
}

@Injectable()
export class AccessGuard implements CanActivate {
  constructor(
    @Inject(AUTH_REPOSITORY) private readonly repository: AuthRepository,
    @Inject(TokenService) private readonly tokens: TokenService,
    @Inject(AUTH_CLOCK) private readonly clock: Clock,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: { authorization?: string | string[] };
      accessContext?: RequestAccess;
    }>();
    const token = bearerToken(request.headers.authorization);
    if (!token) {
      throw new HttpException({ error: "unauthorized" }, HttpStatus.UNAUTHORIZED);
    }
    const claims = await this.tokens.verifyAccess(token);
    if (!claims) {
      throw new HttpException({ error: "unauthorized" }, HttpStatus.UNAUTHORIZED);
    }
    const session = await this.repository.findSessionById(claims.sid);
    if (
      !session ||
      session.userId !== claims.sub ||
      session.roleCode !== claims.role ||
      session.mfaSatisfied !== claims.mfa ||
      session.revokedAt !== null ||
      session.rotatedAt !== null ||
      session.expiresAt.getTime() <= this.clock.now()
    ) {
      throw new HttpException({ error: "unauthorized" }, HttpStatus.UNAUTHORIZED);
    }
    request.accessContext = {
      userId: session.userId,
      sessionId: session.id,
      role: session.roleCode,
      mfaSatisfied: session.mfaSatisfied,
    };
    return true;
  }
}

function bearerToken(header: string | string[] | undefined): string | null {
  const value = Array.isArray(header) ? header[0] : header;
  if (typeof value !== "string") {
    return null;
  }
  const [scheme, token, extra] = value.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || token === undefined || token.length === 0 || extra !== undefined) {
    return null;
  }
  return token;
}
