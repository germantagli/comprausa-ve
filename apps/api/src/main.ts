import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { parseAppEnv } from "@comprausa/config";
import { AppModule } from "./app.module";
import { ZodExceptionFilter } from "./http/zod-exception.filter";

async function bootstrap(): Promise<void> {
  const env = parseAppEnv(process.env);
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { cors: false, rawBody: true });
  app.set("trust proxy", false);
  if (env.webOrigin) {
    const origins =
      env.nodeEnv === "development"
        ? Array.from(new Set([env.webOrigin, "http://localhost:3000", "http://127.0.0.1:3000"]))
        : [env.webOrigin];
    app.enableCors({
      origin: origins,
      methods: ["GET", "POST"],
      allowedHeaders: ["Content-Type", "Authorization"],
    });
  }
  app.useGlobalFilters(new ZodExceptionFilter());
  if (env.nodeEnv !== "production") {
    const config = new DocumentBuilder()
      .setTitle(env.displayName)
      .setDescription("Identidad por OTP, catálogo demo, cotización, pago en revisión y seguimiento manual. Sin fecha prometida y sin despliegue.")
      .setVersion("0.0.0")
      .addBearerAuth()
      .build();
    SwaggerModule.setup("docs", app, SwaggerModule.createDocument(app, config));
  }
  await app.listen(env.port);
}

void bootstrap();
