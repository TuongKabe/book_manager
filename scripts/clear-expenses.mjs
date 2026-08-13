import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const before = await prisma.expense.count();
console.log(`Số chi phí hiện tại: ${before}`);
const result = await prisma.expense.deleteMany({});
console.log(`Đã xóa: ${result.count} chi phí`);
await prisma.$disconnect();
