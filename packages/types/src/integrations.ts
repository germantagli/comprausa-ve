export const integrationStatuses = [
  "AVAILABLE",
  "PENDING_CREDENTIALS",
  "REQUIRES_PARTNERSHIP",
  "RESTRICTED",
  "DISABLED",
] as const;

export type IntegrationStatus = (typeof integrationStatuses)[number];

export const integrationModes = ["REAL", "SIMULATED", "BLOCKED"] as const;

export type IntegrationMode = (typeof integrationModes)[number];

export interface StoreIntegrationRecord {
  code: string;
  legalName: string;
  status: IntegrationStatus;
  mode: IntegrationMode;
  purchaseConnector: false;
  /** Narrative and sources live in docs/API_INTEGRATIONS.md */
  reasonCode:
    | "AFFILIATE_OR_CATALOG_ONLY"
    | "SELLER_API_ONLY"
    | "PARTNER_PROGRAM_UNTESTED"
    | "NO_PUBLIC_PURCHASE_API"
    | "DOCS_NOT_PUBLIC"
    | "CUSTOMER_ACCOUNT_ONLY";
}

export const storeIntegrationRegistry = [
  {
    code: "amazon",
    legalName: "Amazon",
    status: "REQUIRES_PARTNERSHIP",
    mode: "BLOCKED",
    purchaseConnector: false,
    reasonCode: "PARTNER_PROGRAM_UNTESTED",
  },
  {
    code: "walmart",
    legalName: "Walmart",
    status: "RESTRICTED",
    mode: "BLOCKED",
    purchaseConnector: false,
    reasonCode: "CUSTOMER_ACCOUNT_ONLY",
  },
  {
    code: "ebay",
    legalName: "eBay",
    status: "REQUIRES_PARTNERSHIP",
    mode: "BLOCKED",
    purchaseConnector: false,
    reasonCode: "PARTNER_PROGRAM_UNTESTED",
  },
  {
    code: "target",
    legalName: "Target",
    status: "RESTRICTED",
    mode: "BLOCKED",
    purchaseConnector: false,
    reasonCode: "AFFILIATE_OR_CATALOG_ONLY",
  },
  {
    code: "shein",
    legalName: "SHEIN",
    status: "RESTRICTED",
    mode: "BLOCKED",
    purchaseConnector: false,
    reasonCode: "SELLER_API_ONLY",
  },
  {
    code: "temu",
    legalName: "Temu",
    status: "RESTRICTED",
    mode: "BLOCKED",
    purchaseConnector: false,
    reasonCode: "SELLER_API_ONLY",
  },
  {
    code: "nike",
    legalName: "Nike",
    status: "RESTRICTED",
    mode: "BLOCKED",
    purchaseConnector: false,
    reasonCode: "AFFILIATE_OR_CATALOG_ONLY",
  },
  {
    code: "adidas",
    legalName: "Adidas",
    status: "RESTRICTED",
    mode: "BLOCKED",
    purchaseConnector: false,
    reasonCode: "NO_PUBLIC_PURCHASE_API",
  },
  {
    code: "best-buy",
    legalName: "Best Buy",
    status: "RESTRICTED",
    mode: "BLOCKED",
    purchaseConnector: false,
    reasonCode: "AFFILIATE_OR_CATALOG_ONLY",
  },
  {
    code: "apple",
    legalName: "Apple",
    status: "RESTRICTED",
    mode: "BLOCKED",
    purchaseConnector: false,
    reasonCode: "NO_PUBLIC_PURCHASE_API",
  },
  {
    code: "samsung",
    legalName: "Samsung",
    status: "RESTRICTED",
    mode: "BLOCKED",
    purchaseConnector: false,
    reasonCode: "NO_PUBLIC_PURCHASE_API",
  },
  {
    code: "sephora",
    legalName: "Sephora",
    status: "RESTRICTED",
    mode: "BLOCKED",
    purchaseConnector: false,
    reasonCode: "DOCS_NOT_PUBLIC",
  },
  {
    code: "ulta",
    legalName: "Ulta Beauty",
    status: "RESTRICTED",
    mode: "BLOCKED",
    purchaseConnector: false,
    reasonCode: "AFFILIATE_OR_CATALOG_ONLY",
  },
  {
    code: "macys",
    legalName: "Macy's",
    status: "RESTRICTED",
    mode: "BLOCKED",
    purchaseConnector: false,
    reasonCode: "DOCS_NOT_PUBLIC",
  },
  {
    code: "home-depot",
    legalName: "Home Depot",
    status: "RESTRICTED",
    mode: "BLOCKED",
    purchaseConnector: false,
    reasonCode: "NO_PUBLIC_PURCHASE_API",
  },
  {
    code: "lowes",
    legalName: "Lowe's",
    status: "REQUIRES_PARTNERSHIP",
    mode: "BLOCKED",
    purchaseConnector: false,
    reasonCode: "PARTNER_PROGRAM_UNTESTED",
  },
  {
    code: "etsy",
    legalName: "Etsy",
    status: "RESTRICTED",
    mode: "BLOCKED",
    purchaseConnector: false,
    reasonCode: "SELLER_API_ONLY",
  },
  {
    code: "hm",
    legalName: "H&M",
    status: "RESTRICTED",
    mode: "BLOCKED",
    purchaseConnector: false,
    reasonCode: "NO_PUBLIC_PURCHASE_API",
  },
  {
    code: "zara",
    legalName: "Zara",
    status: "RESTRICTED",
    mode: "BLOCKED",
    purchaseConnector: false,
    reasonCode: "NO_PUBLIC_PURCHASE_API",
  },
  {
    code: "foot-locker",
    legalName: "Foot Locker",
    status: "RESTRICTED",
    mode: "BLOCKED",
    purchaseConnector: false,
    reasonCode: "NO_PUBLIC_PURCHASE_API",
  },
  {
    code: "costco",
    legalName: "Costco",
    status: "RESTRICTED",
    mode: "BLOCKED",
    purchaseConnector: false,
    reasonCode: "NO_PUBLIC_PURCHASE_API",
  },
] as const satisfies readonly StoreIntegrationRecord[];

export interface PaymentIntegrationRecord {
  code: "stripe" | "paypal" | "zelle" | "pago-movil";
  status: IntegrationStatus;
  mode: IntegrationMode;
  reasonCode:
    | "MERCHANT_COUNTRY_NOT_LISTED"
    | "ACCOUNT_ELIGIBILITY_UNCONFIRMED"
    | "NO_PUBLIC_API"
    | "BANK_CONTRACT_REQUIRED";
}

export const paymentIntegrationRegistry = [
  {
    code: "stripe",
    status: "RESTRICTED",
    mode: "BLOCKED",
    reasonCode: "MERCHANT_COUNTRY_NOT_LISTED",
  },
  {
    code: "paypal",
    status: "REQUIRES_PARTNERSHIP",
    mode: "BLOCKED",
    reasonCode: "ACCOUNT_ELIGIBILITY_UNCONFIRMED",
  },
  {
    code: "zelle",
    status: "RESTRICTED",
    mode: "BLOCKED",
    reasonCode: "NO_PUBLIC_API",
  },
  {
    code: "pago-movil",
    status: "REQUIRES_PARTNERSHIP",
    mode: "BLOCKED",
    reasonCode: "BANK_CONTRACT_REQUIRED",
  },
] as const satisfies readonly PaymentIntegrationRecord[];
