import type { AuthChannel } from "./destination";
import type { RoleCode } from "./roles";

export type ClientPlatform = "IOS" | "ANDROID" | "WEB";

export interface AuthUser {
  id: string;
  givenName: string | null;
  familyName: string | null;
  roleCode: RoleCode;
}

export interface SessionWrite {
  id: string;
  userId: string;
  familyId: string;
  deviceId: string | null;
  refreshTokenHash: string;
  rotatedFromId: string | null;
  roleCode: RoleCode;
  mfaSatisfied: boolean;
  expiresAt: Date;
  revokedAt: Date | null;
  rotatedAt: Date | null;
}

export interface SessionRecord {
  id: string;
  userId: string;
  familyId: string;
  deviceId: string | null;
  refreshTokenHash: string;
  roleCode: RoleCode;
  mfaSatisfied: boolean;
  expiresAt: Date;
  revokedAt: Date | null;
  rotatedAt: Date | null;
}

export interface RegistrationGrantRecord {
  jti: string;
  channel: AuthChannel;
  destination: string;
  expiresAt: Date;
  consumedAt: Date | null;
}

export interface TotpRecord {
  userId: string;
  secretCiphertext: string;
  confirmed: boolean;
  lastAcceptedStep: number | null;
}

export interface AuthRepository {
  findUserByDestination(channel: AuthChannel, destination: string): Promise<AuthUser | null>;
  findUserById(id: string): Promise<AuthUser | null>;
  createCustomer(input: {
    channel: AuthChannel;
    destination: string;
    givenName: string;
    familyName: string;
  }): Promise<AuthUser>;
  upsertDevice(input: { userId: string; clientDeviceId: string; platform: ClientPlatform }): Promise<string>;
  saveSession(session: SessionWrite): Promise<void>;
  findSessionById(id: string): Promise<SessionRecord | null>;
  findSessionByRefreshHash(hash: string): Promise<SessionRecord | null>;
  rotateSession(previousId: string, at: Date, next: SessionWrite): Promise<"rotated" | "reuse" | "rejected">;
  revokeSession(id: string, at: Date): Promise<void>;
  saveRegistrationGrant(grant: RegistrationGrantRecord): Promise<void>;
  consumeRegistrationGrant(jti: string, at: Date): Promise<RegistrationGrantRecord | null>;
  assignRole(userId: string, roleCode: RoleCode): Promise<void>;
  setSessionMfa(sessionId: string, mfaSatisfied: boolean): Promise<void>;
  saveTotp(record: TotpRecord): Promise<void>;
  readTotp(userId: string): Promise<TotpRecord | null>;
}
