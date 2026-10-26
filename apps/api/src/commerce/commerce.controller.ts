import { Body, Controller, Get, HttpCode, HttpStatus, Inject, Param, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { cartItemSchema, cartQuantitySchema, quoteRequestSchema } from "@comprausa/validation";
import { z } from "zod";
import type { RequestAccess } from "../auth/access.guard";
import { AccessGuard } from "../auth/access.guard";
import { CommerceService } from "./commerce.service";

const quantityBody = z.object({ quantity: cartQuantitySchema }).strict();
const saveBody = z.object({ savedForLater: z.boolean() }).strict();

@ApiTags("commerce")
@ApiBearerAuth()
@UseGuards(AccessGuard)
@Controller("v1")
export class CommerceController {
  constructor(@Inject(CommerceService) private readonly commerce: CommerceService) {}

  @Get("cart")
  @ApiOperation({ summary: "Carrito del cliente. El subtotal omite los precios desconocidos." })
  cart(@Req() request: { accessContext: RequestAccess }) {
    return this.commerce.cart(request.accessContext.userId);
  }

  @Post("cart/items")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Agrega un artículo del catálogo demo. No inventa el precio." })
  add(@Req() request: { accessContext: RequestAccess }, @Body() body: unknown) {
    const parsed = cartItemSchema.parse(body);
    return this.commerce.addItem(request.accessContext.userId, parsed.productId, parsed.quantity);
  }

  @Post("cart/items/:productId/quantity")
  @HttpCode(HttpStatus.OK)
  setQuantity(@Req() request: { accessContext: RequestAccess }, @Param("productId") productId: string, @Body() body: unknown) {
    const parsed = quantityBody.parse(body);
    return this.commerce.setQuantity(request.accessContext.userId, productId, parsed.quantity);
  }

  @Post("cart/items/:productId/remove")
  @HttpCode(HttpStatus.OK)
  remove(@Req() request: { accessContext: RequestAccess }, @Param("productId") productId: string) {
    return this.commerce.remove(request.accessContext.userId, productId);
  }

  @Post("cart/items/:productId/save")
  @HttpCode(HttpStatus.OK)
  save(@Req() request: { accessContext: RequestAccess }, @Param("productId") productId: string, @Body() body: unknown) {
    const parsed = saveBody.parse(body);
    return this.commerce.saveForLater(request.accessContext.userId, productId, parsed.savedForLater);
  }

  @Post("quotes")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Abre una cotización pendiente. Guarda un enlace como texto y no lo descarga." })
  createQuote(@Req() request: { accessContext: RequestAccess }, @Body() body: unknown) {
    const parsed = quoteRequestSchema.parse(body);
    return this.commerce.createQuote(request.accessContext.userId, parsed.address, parsed.pastedUrl);
  }

  @Get("quotes/:id")
  readQuote(@Req() request: { accessContext: RequestAccess }, @Param("id") id: string) {
    return this.commerce.readQuote(request.accessContext.userId, id);
  }

  @Post("quotes/:id/accept")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "El cliente acepta una cotización que ya tiene importe final." })
  accept(@Req() request: { accessContext: RequestAccess }, @Param("id") id: string) {
    return this.commerce.acceptQuote(request.accessContext.userId, id);
  }

  @Post("quotes/:id/finalize")
  @HttpCode(HttpStatus.FORBIDDEN)
  @ApiOperation({ summary: "El cliente no puede cerrar una cotización final." })
  finalize() {
    return this.commerce.rejectClientClose();
  }

  @Post("quotes/:id/pay")
  @HttpCode(HttpStatus.FORBIDDEN)
  @ApiOperation({ summary: "El cliente no puede marcar una cotización como pagada." })
  pay() {
    return this.commerce.rejectClientClose();
  }
}
