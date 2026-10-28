import { Inject, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { AuthChannel } from "./destination";
import type {
  AuthRepository,
  AuthUser,
  ClientPlatform,
  RegistrationGrantRecord,
  SessionRecord,
  SessionWrite,
  TotpRecord,
} from "./auth.repository";
import { isRoleCode, selectRole, type RoleCode } from "./roles";
import { PrismaService } from "../prisma/prisma.service";

const userInclude = {
  profile: true,
  userRoles: { include: { role: true } },
} satisfies Prisma.UserInclude;

type UserWithAccess = Prisma.UserGetPayload<{ include: typeof userInclude }>;

@Injectable()
export class PrismaAuthRepository implements AuthRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findUserById(id: string): Promise<AuthUser | null> {
    const user = await this.prisma.user.findUnique({ where: { id }, include: userInclude });
    return user ? this.toUser(user) : null;
  }

  async findUserByDestination(channel: AuthChannel, destination: string): Promise<AuthUser | null> {
    const user = await this.prisma.user.findFirst({
      where: channel === "email" ? { email: destination } : { phoneE164: destination },
      include: userInclude,
    });
    return user ? this.toUser(user) : null;
  }

  async createCustomer(input: {
    channel: AuthChannel;
    destination: string;
    givenName: string;
    familyName: string;
  }): Promise<AuthUser> {
    const role = await this.prisma.role.findUnique({ where: { code: "CUSTOMER" } });
    if (!role) {
      throw new Error("CUSTOMER role is not seeded");
    }
    try {
      const user = await this.prisma.user.create({
        data: {
          email: input.channel === "email" ? input.destination : null,
          phoneE164: input.channel === "phone" ? input.destination : null,
          status: "ACTIVE",
          profile: {
            create: {
              givenName: input.givenName,
              familyName: input.familyName,
              locale: "es-VE",
              preferredCurrency: "USD",
            },
          },
          identities: {
            create: {
              provider: input.channel === "email" ? "EMAIL_OTP" : "PHONE_OTP",
              providerSubject: input.destination,
              verifiedAt: new Date(),
            },
          },
          userRoles: { create: { roleId: role.id } },
        },
        include: userInclude,
      });
      return this.toUser(user);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const existing = await this.findUserByDestination(input.channel, input.destination);
        if (existing) {
          return existing;
        }
      }
      throw error;
    }
  }

  async upsertDevice(input: { userId: string; clientDeviceId: string; platform: ClientPlatform }): Promise<string> {
    const device = await this.prisma.device.upsert({
      where: { userId_clientDeviceId: { userId: input.userId, clientDeviceId: input.clientDeviceId } },
      create: {
        userId: input.userId,
        clientDeviceId: input.clientDeviceId,
        platform: input.platform,
        lastSeenAt: new Date(),
      },
      update: { platform: input.platform, lastSeenAt: new Date() },
    });
    return device.id;
  }

  async saveSession(session: SessionWrite): Promise<void> {
    await this.prisma.session.create({ data: this.sessionData(session) });
  }

  async findSessionById(id: string): Promise<SessionRecord | null> {
    const session = await this.prisma.session.findUnique({ where: { id } });
    return session ? this.toRecord(session) : null;
  }

  async findSessionByRefreshHash(hash: string): Promise<SessionRecord | null> {
    const session = await this.prisma.session.findUnique({ where: { refreshTokenHash: hash } });
    return session ? this.toRecord(session) : null;
  }

  async rotateSession(previousId: string, at: Date, next: SessionWrite): Promise<"rotated" | "reuse" | "rejected"> {
    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.session.updateMany({
        where: { id: previousId, rotatedAt: null, revokedAt: null, expiresAt: { gt: at } },
        data: { rotatedAt: at, revokedAt: at },
      });
      if (claimed.count === 1) {
        await tx.session.create({ data: this.sessionData(next) });
        return "rotated";
      }
      const current = await tx.session.findUnique({ where: { id: previousId } });
      if (current?.rotatedAt) {
        await tx.session.updateMany({
          where: { familyId: current.familyId, revokedAt: null },
          data: { revokedAt: at },
        });
        return "reuse";
      }
      return "rejected";
    });
  }

  async revokeSession(id: string, at: Date): Promise<void> {
    await this.prisma.session.updateMany({
      where: { id, revokedAt: null },
      data: { revokedAt: at },
    });
  }

  async saveRegistrationGrant(grant: RegistrationGrantRecord): Promise<void> {
    await this.prisma.registrationGrant.create({
      data: {
        jti: grant.jti,
        channel: grant.channel,
        destination: grant.destination,
        expiresAt: grant.expiresAt,
        consumedAt: grant.consumedAt,
      },
    });
  }

  async assignRole(userId: string, roleCode: RoleCode): Promise<void> {
    if (!isRoleCode(roleCode)) {
      throw new Error("Unknown role");
    }
    const role = await this.prisma.role.findUnique({ where: { code: roleCode } });
    if (!role) {
      throw new Error("Unknown role");
    }
    await this.prisma.$transaction([
      this.prisma.userRole.deleteMany({ where: { userId } }),
      this.prisma.userRole.create({ data: { userId, roleId: role.id } }),
    ]);
  }

  async setSessionMfa(sessionId: string, mfaSatisfied: boolean): Promise<void> {
    await this.prisma.session.update({ where: { id: sessionId }, data: { mfaSatisfied } });
  }

  async saveTotp(record: TotpRecord): Promise<void> {
    await this.prisma.totpCredential.upsert({
      where: { userId: record.userId },
      create: {
        userId: record.userId,
        secretCiphertext: record.secretCiphertext,
        confirmedAt: record.confirmed ? new Date() : null,
        lastAcceptedStep: record.lastAcceptedStep,
      },
      update: {
        secretCiphertext: record.secretCiphertext,
        confirmedAt: record.confirmed ? new Date() : null,
        lastAcceptedStep: record.lastAcceptedStep,
      },
    });
  }

  async readTotp(userId: string): Promise<TotpRecord | null> {
    const record = await this.prisma.totpCredential.findUnique({ where: { userId } });
    if (!record) {
      return null;
    }
    return {
      userId: record.userId,
      secretCiphertext: record.secretCiphertext,
      confirmed: record.confirmedAt !== null,
      lastAcceptedStep: record.lastAcceptedStep,
    };
  }

  async consumeRegistrationGrant(jti: string, at: Date): Promise<RegistrationGrantRecord | null> {
    const claimed = await this.prisma.registrationGrant.updateMany({
      where: { jti, consumedAt: null, expiresAt: { gt: at } },
      data: { consumedAt: at },
    });
    if (claimed.count !== 1) {
      return null;
    }
    const grant = await this.prisma.registrationGrant.findUnique({ where: { jti } });
    if (!grant || (grant.channel !== "email" && grant.channel !== "phone")) {
      return null;
    }
    return {
      jti: grant.jti,
      channel: grant.channel,
      destination: grant.destination,
      expiresAt: grant.expiresAt,
      consumedAt: grant.consumedAt,
    };
  }

  private sessionData(session: SessionWrite): Prisma.SessionCreateInput {
    return {
      id: session.id,
      user: { connect: { id: session.userId } },
      familyId: session.familyId,
      device: session.deviceId ? { connect: { id: session.deviceId } } : undefined,
      refreshTokenHash: session.refreshTokenHash,
      rotatedFrom: session.rotatedFromId ? { connect: { id: session.rotatedFromId } } : undefined,
      roleCode: session.roleCode,
      mfaSatisfied: session.mfaSatisfied,
      expiresAt: session.expiresAt,
      revokedAt: session.revokedAt,
      rotatedAt: session.rotatedAt,
    };
  }

  private toUser(user: UserWithAccess): AuthUser {
    return {
      id: user.id,
      givenName: user.profile?.givenName ?? null,
      familyName: user.profile?.familyName ?? null,
      roleCode: selectRole(user.userRoles.map((membership) => membership.role.code)),
    };
  }

  private toRecord(session: {
    id: string;
    userId: string;
    familyId: string;
    deviceId: string | null;
    refreshTokenHash: string;
    roleCode: string;
    mfaSatisfied: boolean;
    expiresAt: Date;
    revokedAt: Date | null;
    rotatedAt: Date | null;
  }): SessionRecord {
    return {
      id: session.id,
      userId: session.userId,
      familyId: session.familyId,
      deviceId: session.deviceId,
      refreshTokenHash: session.refreshTokenHash,
      roleCode: selectRole([session.roleCode]),
      mfaSatisfied: session.mfaSatisfied,
      expiresAt: session.expiresAt,
      revokedAt: session.revokedAt,
      rotatedAt: session.rotatedAt,
    };
  }
}
