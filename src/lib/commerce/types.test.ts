import { describe, expect, it } from "vitest";
import {
  canPublishProduct,
  canTransitionPurchase,
  calculateRevenueSplit,
  PLANS,
  purchaseRequiresProvider,
  type MarketplaceProduct,
} from "./types";

const product: MarketplaceProduct = {
  id: "pack-1",
  creatorId: "creator-1",
  type: "learning-pack",
  title: "Memory foundations",
  summary: "A reviewed pack of lessons about memory.",
  price: { amountMinor: 900, currency: "GBP" },
  status: "draft",
  sourceIds: ["spotlight-effect"],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("commerce preparation", () => {
  it("splits integer revenue without inventing a price", () => {
    expect(calculateRevenueSplit(900, 1500)).toEqual({
      platformAmountMinor: 135,
      creatorAmountMinor: 765,
    });
    expect(calculateRevenueSplit(1, 5000)).toEqual({
      platformAmountMinor: 1,
      creatorAmountMinor: 0,
    });
    expect(() => calculateRevenueSplit(-1, 1500)).toThrow();
    expect(() => calculateRevenueSplit(900, 10_001)).toThrow();
  });

  it("requires sources, a creator and human moderation before publication", () => {
    expect(canPublishProduct(product, false).ok).toBe(false);
    expect(canPublishProduct({ ...product, sourceIds: [] }, true).ok).toBe(false);
    expect(canPublishProduct(product, true).ok).toBe(true);
  });

  it("allows only explicit purchase transitions and keeps all plans payment-disabled", () => {
    expect(canTransitionPurchase("pending", "paid")).toBe(true);
    expect(canTransitionPurchase("pending", "refunded")).toBe(false);
    expect(canTransitionPurchase("paid", "refunded")).toBe(true);
    expect(canTransitionPurchase("failed", "paid")).toBe(false);
    expect(purchaseRequiresProvider("paid")).toBe(true);
    expect(purchaseRequiresProvider("pending")).toBe(false);
    expect(PLANS.every((plan) => plan.paymentEnabled === false)).toBe(true);
  });
});
