import { randomUUID } from "node:crypto";
import { Injectable } from "@nestjs/common";
import type { AuthChannel } from "./destination";
import type {
  AuthRepository,
  AuthUser,
  ClientPlatform,
  RegistrationGrantRecord,
  SessionRecord,
  SessionWrite,
  SocialIdentityProvider,
  TotpRecord,
} from "./auth.repository";
import { isRoleCode, type RoleCode } from "./roles";

interface MemoryIdentity {
  provider: SocialIdentityProvider | "email_otp" | "phone_otp";
  subject: string;
}

interface MemoryUser extends AuthUser {
  email: string | null;
  phoneE164: string | null;
  identities: MemoryIdentity[];
}

/**
 * Auth state for tests and for local development when DATABASE_URL is absent.
 * Production boot requires Postgres and does not use this class.
 */
@Injectable()
export class MemoryAuthRepository implements AuthRepository {
  private readonly users = new Map<string, MemoryUser>();
  private readonly sessions = new Map<string, SessionWrite>();
  private readonly devices = new Map<
    string,
    { id: string; userId: string; clientDeviceId: string; platform: ClientPlatform }
  >();
  private readonly grants = new Map<string, RegistrationGrantRecord>();
  private readonly totp = new Map<string, TotpRecord>();

  async findUserById(id: string): Promise<AuthUser | null> {
    const user = this.users.get(id);
    return user ? this.toUser(user) : null;
  }

  /** Contact fields for admin product-request views (memory-only; Prisma reads User directly). */
  peekContact(userId: string): {
    id: string;
    email: string | null;
    phoneE164: string | null;
    givenName: string | null;
    familyName: string | null;
    roleCode: RoleCode;
  } | null {
    const user = this.users.get(userId);
    if (!user) {
      return null;
    }
    return {
      id: user.id,
      email: user.email,
      phoneE164: user.phoneE164,
      givenName: user.givenName,
      familyName: user.familyName,
      roleCode: user.roleCode,
    };
  }

  listStaffUserIds(): string[] {
    return [...this.users.values()].filter((user) => user.roleCode !== "CUSTOMER").map((user) => user.id);
  }

  async findUserByDestination(channel: AuthChannel, destination: string): Promise<AuthUser | null> {
    for (const user of this.users.values()) {
      const value = channel === "email" ? user.email : user.phoneE164;
      if (value === destination) {
        return this.toUser(user);
      }
    }
    return null;
  }

  async findUserBySocialIdentity(provider: SocialIdentityProvider, subject: string): Promise<AuthUser | null> {
    for (const user of this.users.values()) {
      if (user.identities.some((identity) => identity.provider === provider && identity.subject === subject)) {
        return this.toUser(user);
      }
    }
    return null;
  }

  async upsertSocialCustomer(input: {
    provider: SocialIdentityProvider;
    subject: string;
    email: string | null;
    givenName: string | null;
    familyName: string | null;
  }): Promise<AuthUser | null> {
    const byIdentity = await this.findUserBySocialIdentity(input.provider, input.subject);
    if (byIdentity) {
      const user = this.users.get(byIdentity.id);
      if (user && !user.givenName && input.givenName) {
        user.givenName = input.givenName;
      }
      if (user && !user.familyName && input.familyName) {
        user.familyName = input.familyName;
      }
      return byIdentity;
    }
    if (input.email) {
      const byEmail = await this.findUserByDestination("email", input.email);
      if (byEmail) {
        const user = this.users.get(byEmail.id);
        if (user) {
          user.identities.push({ provider: input.provider, subject: input.subject });
          if (!user.givenName && input.givenName) {
            user.givenName = input.givenName;
          }
          if (!user.familyName && input.familyName) {
            user.familyName = input.familyName;
          }
        }
        return byEmail;
      }
    }
    if (!input.email) {
      return null;
    }
    if (!input.givenName || !input.familyName) {
      return null;
    }
    const user: MemoryUser = {
      id: randomUUID(),
      email: input.email,
      phoneE164: null,
      givenName: input.givenName,
      familyName: input.familyName,
      roleCode: "CUSTOMER",
      identities: [
        { provider: "email_otp", subject: input.email },
        { provider: input.provider, subject: input.subject },
      ],
    };
    this.users.set(user.id, user);
    return this.toUser(user);
  }

  async linkSocialIdentity(input: {
    userId: string;
    provider: SocialIdentityProvider;
    subject: string;
  }): Promise<void> {
    const user = this.users.get(input.userId);
    if (!user) {
      return;
    }
    if (!user.identities.some((identity) => identity.provider === input.provider && identity.subject === input.subject)) {
      user.identities.push({ provider: input.provider, subject: input.subject });
    }
  }

  async createCustomer(input: {
    channel: AuthChannel;
    destination: string;
    givenName: string;
    familyName: string;
  }): Promise<AuthUser> {
    const existing = await this.findUserByDestination(input.channel, input.destination);
    if (existing) {
      return existing;
    }
    const user: MemoryUser = {
      id: randomUUID(),
      email: input.channel === "email" ? input.destination : null,
      phoneE164: input.channel === "phone" ? input.destination : null,
      givenName: input.givenName,
      familyName: input.familyName,
      roleCode: "CUSTOMER",
      identities: [
        {
          provider: input.channel === "email" ? "email_otp" : "phone_otp",
          subject: input.destination,
        },
      ],
    };
    this.users.set(user.id, user);
    return this.toUser(user);
  }

  setRole(userId: string, roleCode: RoleCode): void {
    const user = this.users.get(userId);
    if (!user || !isRoleCode(roleCode)) {
      throw new Error("Unknown user or role");
    }
    user.roleCode = roleCode;
  }

  async assignRole(userId: string, roleCode: RoleCode): Promise<void> {
    this.setRole(userId, roleCode);
  }

  async setSessionMfa(sessionId: string, mfaSatisfied: boolean): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error("Unknown session");
    }
    session.mfaSatisfied = mfaSatisfied;
  }

  async saveTotp(record: TotpRecord): Promise<void> {
    this.totp.set(record.userId, { ...record });
  }

  async readTotp(userId: string): Promise<TotpRecord | null> {
    const record = this.totp.get(userId);
    return record ? { ...record } : null;
  }

  async upsertDevice(input: { userId: string; clientDeviceId: string; platform: ClientPlatform }): Promise<string> {
    const key = `${input.userId}:${input.clientDeviceId}`;
    const existing = this.devices.get(key);
    if (existing) {
      return existing.id;
    }
    const id = randomUUID();
    this.devices.set(key, { id, userId: input.userId, clientDeviceId: input.clientDeviceId, platform: input.platform });
    return id;
  }

  async saveSession(session: SessionWrite): Promise<void> {
    this.sessions.set(session.id, { ...session });
  }

  async findSessionById(id: string): Promise<SessionRecord | null> {
    const session = this.sessions.get(id);
    return session ? this.toRecord(session) : null;
  }

  async findSessionByRefreshHash(hash: string): Promise<SessionRecord | null> {
    for (const session of this.sessions.values()) {
      if (session.refreshTokenHash === hash) {
        return this.toRecord(session);
      }
    }
    return null;
  }

  async rotateSession(previousId: string, at: Date, next: SessionWrite): Promise<"rotated" | "reuse" | "rejected"> {
    const current = this.sessions.get(previousId);
    if (!current) {
      return "rejected";
    }
    if (current.rotatedAt) {
      this.revokeFamily(current.familyId, at);
      return "reuse";
    }
    if (current.revokedAt || current.expiresAt.getTime() <= at.getTime()) {
      return "rejected";
    }
    current.rotatedAt = at;
    current.revokedAt = at;
    this.sessions.set(next.id, { ...next });
    return "rotated";
  }

  async revokeSession(id: string, at: Date): Promise<void> {
    const session = this.sessions.get(id);
    if (session && !session.revokedAt) {
      session.revokedAt = at;
    }
  }

  async saveRegistrationGrant(grant: RegistrationGrantRecord): Promise<void> {
    this.grants.set(grant.jti, { ...grant });
  }

  async consumeRegistrationGrant(jti: string, at: Date): Promise<RegistrationGrantRecord | null> {
    const grant = this.grants.get(jti);
    if (!grant || grant.consumedAt || grant.expiresAt.getTime() <= at.getTime()) {
      return null;
    }
    grant.consumedAt = at;
    return { ...grant };
  }

  private revokeFamily(familyId: string, at: Date): void {
    for (const session of this.sessions.values()) {
      if (session.familyId === familyId && !session.revokedAt) {
        session.revokedAt = at;
      }
    }
  }

  private toUser(user: MemoryUser): AuthUser {
    return {
      id: user.id,
      givenName: user.givenName,
      familyName: user.familyName,
      roleCode: user.roleCode,
    };
  }

  private toRecord(session: SessionWrite): SessionRecord {
    return {
      id: session.id,
      userId: session.userId,
      familyId: session.familyId,
      deviceId: session.deviceId,
      refreshTokenHash: session.refreshTokenHash,
      roleCode: session.roleCode,
      mfaSatisfied: session.mfaSatisfied,
      expiresAt: session.expiresAt,
      revokedAt: session.revokedAt,
      rotatedAt: session.rotatedAt,
    };
  }
}
