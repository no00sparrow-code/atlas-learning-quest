/**
 * Commerce records are preparation only. No function here charges a card,
 * activates a subscription or creates a purchase. Payment providers must be
 * configured server-side, with an owner-controlled account and compliance review.
 */

export type SubscriptionTier = "free" | "plus" | "creator";
export type ProductType = "learning-pack" | "course" | "creator-resource";
export type ProductStatus = "draft" | "in-review" | "published" | "suspended";
export type PurchaseStatus = "pending" | "paid" | "failed" | "refunded";
export type PaymentProvider = "none" | "stripe";

export interface Money {
  amountMinor: number;
  currency: "GBP" | "USD" | "EUR";
}

export interface PlanDefinition {
  id: SubscriptionTier;
  name: string;
  price: Money | null;
  paymentEnabled: boolean;
  benefits: string[];
}

export interface MarketplaceProduct {
  id: string;
  creatorId: string;
  type: ProductType;
  title: string;
  summary: string;
  price: Money;
  status: ProductStatus;
  sourceIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseRecord {
  id: string;
  buyerId: string;
  productId: string;
  amount: Money;
  status: PurchaseStatus;
  provider: PaymentProvider;
  providerPaymentId?: string;
  createdAt: string;
  refundedAt?: string;
}

export interface RevenueLedgerEntry {
  purchaseId: string;
  creatorId: string;
  platformFeeBps: number;
  creatorAmountMinor: number;
  platformAmountMinor: number;
  currency: Money["currency"];
}

export const PLANS: PlanDefinition[] = [
  {
    id: "free",
    name: "Free beta",
    price: null,
    paymentEnabled: false,
    benefits: ["All current lessons", "Local Guide fallback", "Local model and studio allowances"],
  },
  {
    id: "plus",
    name: "Atlas Plus",
    price: null,
    paymentEnabled: false,
    benefits: ["Planned cloud sync", "Planned hosted features"],
  },
  {
    id: "creator",
    name: "Creator",
    price: null,
    paymentEnabled: false,
    benefits: ["Planned pack publishing", "Planned creator reporting"],
  },
];

export function calculateRevenueSplit(
  amountMinor: number,
  platformFeeBps: number,
): { creatorAmountMinor: number; platformAmountMinor: number } {
  if (!Number.isInteger(amountMinor) || amountMinor < 0) {
    throw new Error("Amount must be a non-negative integer in minor units.");
  }
  if (!Number.isInteger(platformFeeBps) || platformFeeBps < 0 || platformFeeBps > 10_000) {
    throw new Error("Platform fee must be an integer between 0 and 10000 basis points.");
  }
  const platformAmountMinor = Math.round((amountMinor * platformFeeBps) / 10_000);
  return {
    platformAmountMinor,
    creatorAmountMinor: amountMinor - platformAmountMinor,
  };
}

export function canPublishProduct(
  product: MarketplaceProduct,
  moderationApproved: boolean,
): { ok: boolean; reason?: string } {
  if (!product.creatorId.trim()) return { ok: false, reason: "A creator is required." };
  if (!product.title.trim() || !product.summary.trim()) {
    return { ok: false, reason: "A title and summary are required." };
  }
  if (product.price.amountMinor < 0 || !Number.isInteger(product.price.amountMinor)) {
    return { ok: false, reason: "Price must be a non-negative integer in minor units." };
  }
  if (product.sourceIds.length === 0) {
    return { ok: false, reason: "At least one reviewed source or lesson is required." };
  }
  if (!moderationApproved) {
    return { ok: false, reason: "A human moderation decision is required." };
  }
  return { ok: true };
}

const ALLOWED_PURCHASE_TRANSITIONS: Record<PurchaseStatus, PurchaseStatus[]> = {
  pending: ["paid", "failed"],
  paid: ["refunded"],
  failed: [],
  refunded: [],
};

export function canTransitionPurchase(from: PurchaseStatus, to: PurchaseStatus): boolean {
  return ALLOWED_PURCHASE_TRANSITIONS[from].includes(to);
}

export function purchaseRequiresProvider(status: PurchaseStatus): boolean {
  return status === "paid" || status === "refunded";
}
