import { Module } from "@nestjs/common";
import { CommerceController } from "./commerce.controller";
import { CommerceService } from "./commerce.service";
import { MemoryCommerceRepository } from "./memory-commerce.repository";

@Module({
  controllers: [CommerceController],
  providers: [CommerceService, MemoryCommerceRepository],
})
export class CommerceModule {}
