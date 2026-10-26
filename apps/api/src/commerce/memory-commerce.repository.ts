import { Injectable } from "@nestjs/common";
import type { QuoteLifecycle, QuoteLine, QuoteSnapshot } from "./quote-policy";

export interface CartLine {
  productId: string;
  name: string;
  quantity: number;
  unitAmountMinor: number | null;
  storeName: string | null;
  savedForLater: boolean;
  fictional: true;
}

export interface VenezuelaAddress {
  state: string;
  city: string;
  municipality: string;
  reference: string;
}

export interface SavedQuote {
  id: string;
  userId: string;
  status: QuoteLifecycle;
  address: VenezuelaAddress;
  lines: QuoteLine[];
  snapshot: QuoteSnapshot | null;
}

@Injectable()
export class MemoryCommerceRepository {
  private readonly carts = new Map<string, CartLine[]>();
  private readonly quotes = new Map<string, SavedQuote>();

  listCart(userId: string): CartLine[] {
    return (this.carts.get(userId) ?? []).map((line) => ({ ...line }));
  }

  saveCart(userId: string, lines: CartLine[]): void {
    this.carts.set(userId, lines.map((line) => ({ ...line })));
  }

  saveQuote(quote: SavedQuote): SavedQuote {
    const stored = {
      ...quote,
      address: { ...quote.address },
      lines: quote.lines.map((line) => ({ ...line })),
      snapshot: quote.snapshot,
    };
    this.quotes.set(quote.id, stored);
    return this.readQuote(quote.id) as SavedQuote;
  }

  readQuote(id: string): SavedQuote | null {
    const quote = this.quotes.get(id);
    if (!quote) {
      return null;
    }
    return {
      ...quote,
      address: { ...quote.address },
      lines: quote.lines.map((line) => ({ ...line })),
      snapshot: quote.snapshot,
    };
  }
}
