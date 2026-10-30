import Link from "next/link";
import PageHeader from "@/app/components/ui/PageHeader";
import BookCsvImport from "@/app/books/BookCsvImport";

export const metadata = {
  title: "Import CSV | BookBase",
  description: "Nhập hàng loạt sách từ tệp CSV, xem trước và kiểm tra lỗi dữ liệu",
};

export default function BookImportPage() {
  return (
    <div className="space-y-6" data-testid="book-csv-import-page">
      <PageHeader
        title="Import sách từ CSV"
        description="Nhập hàng loạt sách vào kho. Tải mẫu, chọn file, kiểm tra dữ liệu và xác nhận import."
        toolbar={
          <Link className="rounded-md border border-hairline-strong bg-surface px-3 py-2 text-[13px] font-medium text-ink hover:bg-surface-soft" href="/books">
            Quay về Kho sách
          </Link>
        }
      />
      <BookCsvImport />
      <p className="text-[13px] text-ink-muted">
        Sau khi import thành công, <Link href="/books" className="font-semibold text-brand underline underline-offset-2">mở Kho sách để xem kết quả</Link>.
        Nếu muốn nhập sách theo lô và phân bổ chi phí, hãy dùng mục Nhập hàng.
      </p>
    </div>
  );
}
