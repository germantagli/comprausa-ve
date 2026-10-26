import { Module, type DynamicModule } from "@nestjs/common";
import { parseAppEnv } from "@comprausa/config";
import { SimulatedOtpProvider } from "./simulated-otp.provider";

@Module({})
export class AuthModule {
  static register(): DynamicModule {
    const env = parseAppEnv(process.env);
    if (!env.simulatedOtpAllowed) {
      return { module: AuthModule };
    }
    return {
      module: AuthModule,
      providers: [
        {
          provide: SimulatedOtpProvider,
          useFactory: () => new SimulatedOtpProvider(env),
        },
      ],
      exports: [SimulatedOtpProvider],
    };
  }
}
