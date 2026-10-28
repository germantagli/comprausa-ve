import { HttpException, HttpStatus, Inject, Injectable } from "@nestjs/common";
import { Secret, TOTP } from "otpauth";
import type { RequestAccess } from "./access.guard";
import type { AuthRepository, TotpRecord } from "./auth.repository";
import { AUTH_REPOSITORY, TOTP_KEY } from "./auth.tokens";
import { canOperateFulfillment } from "./roles";
import { TokenService } from "./token.service";
import { openSecret, sealSecret } from "./totp-box";

const ACCESS_TTL_SECONDS = 15 * 60;
const MAX_FAILURES = 5;

@Injectable()
export class TotpService {
  private readonly failures = new Map<string, number>();

  constructor(
    @Inject(AUTH_REPOSITORY) private readonly repository: AuthRepository,
    @Inject(TokenService) private readonly tokens: TokenService,
    @Inject(TOTP_KEY) private readonly keyMaterial: string,
  ) {}

  async enroll(access: RequestAccess): Promise<{ secret: string; otpauthUri: string }> {
    if (!canOperateFulfillment(access.role)) {
      throw new HttpException({ error: "forbidden" }, HttpStatus.FORBIDDEN);
    }
    const current = await this.repository.readTotp(access.userId);
    if (current?.confirmed) {
      throw new HttpException({ error: "already_confirmed" }, HttpStatus.CONFLICT);
    }
    const secret = new Secret({ size: 20 });
    const totp = this.totp(secret);
    await this.repository.saveTotp({
      userId: access.userId,
      secretCiphertext: sealSecret(secret.base32, this.keyMaterial),
      confirmed: false,
      lastAcceptedStep: null,
    });
    return { secret: secret.base32, otpauthUri: totp.toString() };
  }

  async verify(access: RequestAccess, code: string) {
    if (!canOperateFulfillment(access.role)) {
      throw new HttpException({ error: "forbidden" }, HttpStatus.FORBIDDEN);
    }
    const record = await this.repository.readTotp(access.userId);
    if (!record) {
      throw new HttpException({ error: "unauthorized" }, HttpStatus.UNAUTHORIZED);
    }
    const failures = this.failures.get(access.userId) ?? 0;
    if (failures >= MAX_FAILURES) {
      throw new HttpException({ error: "unauthorized" }, HttpStatus.UNAUTHORIZED);
    }
    const secret = Secret.fromBase32(openSecret(record.secretCiphertext, this.keyMaterial));
    const totp = this.totp(secret);
    const delta = totp.validate({ token: code, window: 1 });
    if (delta === null) {
      this.failures.set(access.userId, failures + 1);
      throw new HttpException({ error: "unauthorized" }, HttpStatus.UNAUTHORIZED);
    }
    const step = Math.floor(Date.now() / 1000 / 30) + delta;
    if (record.lastAcceptedStep === step) {
      throw new HttpException({ error: "unauthorized" }, HttpStatus.UNAUTHORIZED);
    }
    const next: TotpRecord = { ...record, confirmed: true, lastAcceptedStep: step };
    await this.repository.saveTotp(next);
    await this.repository.setSessionMfa(access.sessionId, true);
    this.failures.delete(access.userId);
    const accessToken = await this.tokens.signAccess(
      { sub: access.userId, sid: access.sessionId, role: access.role, mfa: true },
      ACCESS_TTL_SECONDS,
    );
    return { status: "authenticated" as const, accessToken, expiresInSeconds: ACCESS_TTL_SECONDS };
  }

  private totp(secret: Secret): TOTP {
    return new TOTP({
      issuer: "TraeLo",
      label: "operador",
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret,
    });
  }
}
