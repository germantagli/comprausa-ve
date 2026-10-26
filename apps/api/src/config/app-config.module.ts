import { Global, Module } from "@nestjs/common";
import { parseAppEnv, type AppEnv } from "@comprausa/config";

export const APP_ENV = Symbol("APP_ENV");

@Global()
@Module({
  providers: [
    {
      provide: APP_ENV,
      useFactory: (): AppEnv => parseAppEnv(process.env),
    },
  ],
  exports: [APP_ENV],
})
export class AppConfigModule {}
