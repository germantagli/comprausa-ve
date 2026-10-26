import { Module, type DynamicModule, type Type } from "@nestjs/common";
import type { AppEnv } from "@comprausa/config";
import { parseAppEnv } from "@comprausa/config";
import { AccountController } from "./account.controller";
import { AccessGuard } from "./access.guard";
import { AdminAccessController } from "./admin-access.controller";
import { AdminGuard } from "./admin.guard";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { AUTH_CLOCK, AUTH_RATE_POLICY, AUTH_REPOSITORY, OTP_PROVIDER, RATE_LIMITER } from "./auth.tokens";
import type { Clock } from "./clock";
import { systemClock } from "./clock";
import { DevOtpController } from "./dev-otp.controller";
import { MemoryAuthRepository } from "./memory-auth.repository";
import { MemoryRateLimiter } from "./memory-rate-limiter";
import { PrismaAuthRepository } from "./prisma-auth.repository";
import { defaultAuthRatePolicy, type AuthRatePolicy } from "./rate-limiter";
import { SimulatedOtpProvider } from "./simulated-otp.provider";
import { TokenService } from "./token.service";

const MODULE_ENV = Symbol("AUTH_MODULE_ENV");

@Module({})
export class AuthModule {
  static register(): DynamicModule {
    return AuthModule.registerFrom(parseAppEnv(process.env));
  }

  static registerFrom(env: AppEnv, options?: { clock?: Clock; ratePolicy?: AuthRatePolicy }): DynamicModule {
    if (env.otpProvider === "simulated" && env.nodeEnv !== "development") {
      throw new Error("SimulatedOtpProvider is refused unless NODE_ENV is development and OTP_PROVIDER is simulated");
    }
    const clock = options?.clock ?? systemClock;
    const ratePolicy = options?.ratePolicy ?? defaultAuthRatePolicy;
    const simulated = env.simulatedOtpAllowed && env.nodeEnv === "development" && env.otpProvider === "simulated";
    const controllers: Type[] = [AuthController, AccountController, AdminAccessController];
    const providers: NonNullable<DynamicModule["providers"]> = [
      { provide: AUTH_CLOCK, useValue: clock },
      { provide: AUTH_RATE_POLICY, useValue: ratePolicy },
      {
        provide: MemoryRateLimiter,
        useFactory: (injectedClock: Clock) => new MemoryRateLimiter(injectedClock),
        inject: [AUTH_CLOCK],
      },
      { provide: RATE_LIMITER, useExisting: MemoryRateLimiter },
      {
        provide: TokenService,
        useFactory: (appEnv: AppEnv) => new TokenService(appEnv.authTokenSecret),
        inject: [MODULE_ENV],
      },
      AuthService,
      AccessGuard,
      AdminGuard,
    ];
    const exportsList: NonNullable<DynamicModule["exports"]> = [AuthService, TokenService, AccessGuard, AUTH_REPOSITORY, AUTH_CLOCK];

    if (env.databaseUrl === undefined) {
      providers.push(MemoryAuthRepository, { provide: AUTH_REPOSITORY, useExisting: MemoryAuthRepository });
      exportsList.push(MemoryAuthRepository);
    } else {
      providers.push(PrismaAuthRepository, { provide: AUTH_REPOSITORY, useExisting: PrismaAuthRepository });
    }

    if (simulated) {
      controllers.push(DevOtpController);
      providers.push(
        {
          provide: SimulatedOtpProvider,
          useFactory: (injectedClock: Clock) =>
            new SimulatedOtpProvider({ nodeEnv: env.nodeEnv, otpProvider: env.otpProvider }, injectedClock),
          inject: [AUTH_CLOCK],
        },
        { provide: OTP_PROVIDER, useExisting: SimulatedOtpProvider },
      );
      exportsList.push(SimulatedOtpProvider);
    } else {
      providers.push({ provide: OTP_PROVIDER, useValue: null });
    }

    providers.push({ provide: MODULE_ENV, useValue: env });

    return {
      module: AuthModule,
      global: true,
      controllers,
      providers,
      exports: exportsList,
    };
  }
}
