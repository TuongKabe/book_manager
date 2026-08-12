-- AlterTable
ALTER TABLE "Order" ADD COLUMN "customerName" TEXT;
ALTER TABLE "Order" ADD COLUMN "customerPhone" TEXT;
ALTER TABLE "Order" ADD COLUMN "customerAddress" TEXT;
ALTER TABLE "Order" ADD COLUMN "shippingFee" INTEGER;
ALTER TABLE "Order" ADD COLUMN "shippingUnit" TEXT;
ALTER TABLE "Order" ADD COLUMN "weightGrams" INTEGER;

-- AddForeignKey
ALTER TABLE "Book" ADD CONSTRAINT "Book_soldOrderId_fkey" FOREIGN KEY ("soldOrderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;