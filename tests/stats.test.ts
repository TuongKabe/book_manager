import { describe, it, expect } from "vitest";
import { computeStats } from "@/lib/stats";

const books = [
  { status: "SOLD", soldPriceVnd: 50000, purchaseCostVnd: 20000 },
  { status: "SOLD", soldPriceVnd: 0, purchaseCostVnd: 10000 },
  { status: "LISTED", soldPriceVnd: null, purchaseCostVnd: 15000 },
];
const expenses = [{ amountVnd: 5000 }, { amountVnd: 3000 }];

describe("computeStats", () => {
  it("tính đúng các chỉ số", () => {
    expect(computeStats(books, expenses)).toEqual({
      inStock: 1,
      sold: 2,
      revenue: 50000,
      cost: 20000 + 10000 + 15000 + 5000 + 3000,
      profit: 50000 - (20000 + 10000 + 15000 + 5000 + 3000),
    });
  });
});