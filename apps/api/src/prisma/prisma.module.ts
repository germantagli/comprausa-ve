import { Global, Module, type DynamicModule } from "@nestjs/common";
import { parseAppEnv } from "@comprausa/config";
import { PrismaService } from "./prisma.service";

@Global()
@Module({})
export class PrismaModule {
  static register(): DynamicModule {
    const env = parseAppEnv(process.env);
    if (env.databaseUrl === undefined) {
      return { module: PrismaModule };
    }
    return {
      module: PrismaModule,
      providers: [PrismaService],
      exports: [PrismaService],
    };
  }
}
