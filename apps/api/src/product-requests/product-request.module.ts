import { Module, type DynamicModule } from "@nestjs/common";
import { parseAppEnv } from "@comprausa/config";
import { MemoryAuthRepository } from "../auth/memory-auth.repository";
import { StaffGuard } from "../auth/staff.guard";
import { AdminProductRequestController } from "./admin-product-request.controller";
import { InboxController } from "./inbox.controller";
import { MemoryProductRequestRepository } from "./memory-product-request.repository";
import { PRODUCT_REQUEST_REPOSITORY } from "./product-request.repository";
import { ProductRequestController } from "./product-request.controller";
import { ProductRequestService } from "./product-request.service";
import { PrismaProductRequestRepository } from "./prisma-product-request.repository";

@Module({})
export class ProductRequestModule {
  static register(): DynamicModule {
    const env = parseAppEnv(process.env);
    const usePrisma = Boolean(env.databaseUrl);
    return {
      module: ProductRequestModule,
      controllers: [ProductRequestController, AdminProductRequestController, InboxController],
      providers: [
        ProductRequestService,
        StaffGuard,
        ...(usePrisma
          ? [
              MemoryProductRequestRepository,
              PrismaProductRequestRepository,
              { provide: PRODUCT_REQUEST_REPOSITORY, useExisting: PrismaProductRequestRepository },
            ]
          : [
              {
                provide: MemoryProductRequestRepository,
                useFactory: (auth?: MemoryAuthRepository) => new MemoryProductRequestRepository(auth ?? null),
                inject: [{ token: MemoryAuthRepository, optional: true }],
              },
              { provide: PRODUCT_REQUEST_REPOSITORY, useExisting: MemoryProductRequestRepository },
            ]),
      ],
      exports: [ProductRequestService, PRODUCT_REQUEST_REPOSITORY, MemoryProductRequestRepository],
    };
  }
}
