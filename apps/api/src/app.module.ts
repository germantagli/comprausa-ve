import { Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module";
import { CatalogModule } from "./catalog/catalog.module";
import { AppConfigModule } from "./config/app-config.module";
import { HealthModule } from "./health/health.module";
import { PrismaModule } from "./prisma/prisma.module";

@Module({
  imports: [AppConfigModule, PrismaModule, HealthModule, CatalogModule, AuthModule.register()],
})
export class AppModule {}
