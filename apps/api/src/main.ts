import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { parseAppEnv } from "@comprausa/config";
import { AppModule } from "./app.module";
import { ZodExceptionFilter } from "./http/zod-exception.filter";

async function bootstrap(): Promise<void> {
  const env = parseAppEnv(process.env);
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new ZodExceptionFilter());
  if (env.nodeEnv !== "production") {
    const config = new DocumentBuilder()
      .setTitle(env.displayName)
      .setDescription("Contrato mínimo. Catálogo interno de demostración. Sin pagos y sin tiendas externas.")
      .setVersion("0.0.0")
      .build();
    SwaggerModule.setup("docs", app, SwaggerModule.createDocument(app, config));
  }
  await app.listen(env.port);
}

void bootstrap();
