import { HttpException, HttpStatus, Inject, Injectable } from "@nestjs/common";
import { fulfillmentLabel } from "@comprausa/utils";
import { allowedFulfillmentTargets, inFulfillmentQueue, procurementFor, type FulfillmentTarget } from "./fulfillment-policy";
import { MemoryCommerceRepository } from "./memory-commerce.repository";
import type { InternalNotice, StoredOrder, TrackingRecord } from "./payment-records";

@Injectable()
export class FulfillmentService {
  constructor(@Inject(MemoryCommerceRepository) private readonly repository: MemoryCommerceRepository) {}

  listForOperator() {
    return {
      items: this.repository
        .listOrders()
        .filter((order) => inFulfillmentQueue(order.status))
        .map((order) => this.presentOperator(order)),
    };
  }

  listForCustomer(userId: string) {
    return {
      items: this.repository
        .listOrders()
        .filter((order) => order.userId === userId)
        .map((order) => this.presentCustomer(order)),
    };
  }

  readForCustomer(userId: string, orderId: string) {
    const order = this.repository.readOrder(orderId);
    if (!order || order.userId !== userId) {
      throw new HttpException({ error: "not_found" }, HttpStatus.NOT_FOUND);
    }
    return this.presentCustomer(order);
  }

  rejectClientMove(): never {
    throw new HttpException({ error: "forbidden" }, HttpStatus.FORBIDDEN);
  }

  record(actorId: string, orderId: string, status: FulfillmentTarget, note: string) {
    const order = this.repository.readOrder(orderId);
    if (!order) {
      throw new HttpException({ error: "not_found" }, HttpStatus.NOT_FOUND);
    }
    if (!allowedFulfillmentTargets(order.status).includes(status)) {
      throw new HttpException({ error: "invalid_transition" }, HttpStatus.CONFLICT);
    }
    const procurement = procurementFor(status, order);
    const saved = this.repository.saveOrder({ ...order, status, ...procurement });
    this.repository.appendTracking({ orderId, status, actorId, note });
    const notice = this.repository.appendNotice({
      userId: order.userId,
      orderId,
      message: `Tu pedido cambió: ${fulfillmentLabel(status)}.`,
    });
    this.repository.appendAudit({
      actorId,
      action: status === "PURCHASED_FROM_STORE" ? "order.purchased_from_store" : "order.tracking_recorded",
      entityType: "order",
      entityId: orderId,
      metadata: {
        status,
        purchasedFromStore: saved.purchasedFromStore,
        procurementStatus: saved.procurementStatus,
        noticeId: notice.id,
      },
    });
    return this.presentOperator(saved);
  }

  private presentCustomer(order: StoredOrder) {
    return {
      ...this.summary(order),
      timeline: this.repository.listTracking(order.id).map((event) => this.presentEvent(event, false)),
      notices: this.repository.listNotices(order.userId, order.id).map((notice) => this.presentNotice(notice)),
    };
  }

  private presentOperator(order: StoredOrder) {
    return {
      ...this.summary(order),
      allowed: allowedFulfillmentTargets(order.status),
      timeline: this.repository.listTracking(order.id).map((event) => this.presentEvent(event, true)),
      notices: this.repository.listNotices(order.userId, order.id).map((notice) => this.presentNotice(notice)),
    };
  }

  private summary(order: StoredOrder) {
    return {
      id: order.id,
      status: order.status,
      procurementStatus: order.procurementStatus,
      purchasedFromStore: order.purchasedFromStore,
      grandTotalMinor: order.grandTotalMinor,
    };
  }

  private presentEvent(event: TrackingRecord, includeActor: boolean) {
    return {
      id: event.id,
      status: event.status,
      note: event.note,
      occurredAt: event.occurredAt,
      ...(includeActor ? { actorId: event.actorId } : {}),
    };
  }

  private presentNotice(notice: InternalNotice) {
    return { id: notice.id, message: notice.message, createdAt: notice.createdAt };
  }
}
