"use client";

import { useState } from "react";
import { parseBookCsv, type ImportBook } from "@/lib/book-import";
import Button from "@/app/components/ui/Button";
import Banner from "@/app/components/ui/Banner";

const SAMPLE = "Tiêu đề,ISBN,Tác giả,Phân loại,Tình trạng,Giá nhập (đ),Giá bán (đ),Trạng thái,Ghi chú\r\nSách ví dụ,9786040000002,Nguyễn Văn A,Văn học,GOOD,25000,45000,INTAKE,\r\n";

export default function BookCsvImport({ onImported }: { onImported?: () => void }) {
  const [books, setBooks] = useState<ImportBook[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [fileName, setFileName] = useState("");
  const [requestId, setRequestId] = useState("");

  async function openFile(file?: File) {
    setBooks([]); setErrors([]); setMessage("");
    setFileName(file?.name ?? "");
    setRequestId(file ? crypto.randomUUID() : "");
    if (!file) return;
    if (!/\.csv$/i.test(file.name) || file.size > 2_000_000) {
      setErrors(["Chọn tệp .csv tối đa 2 MB (UTF-8). Nếu đang dùng Excel, lưu thành CSV UTF-8."]);
      return;
    }
    const result = parseBookCsv(await file.text());
    setBooks(result.books); setErrors(result.errors);
  }

  async function importBooks() {
    if (loading || !books.length || errors.length) return;
    setLoading(true); setMessage("");
    try {
      const response = await fetch("/api/books/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ books, requestId }),
      });
      const result = await response.json();
      if (!response.ok) {
        setErrors(result.errors ?? [result.error ?? "Import thất bại"]);
      } else {
        setMessage(`Đã nhập mới ${result.imported} cuốn.${result.previouslyImported ? ` ${result.previouslyImported} cuốn đã được ghi từ lần gửi trước, không nhập trùng.` : ""}`);
        setBooks([]); setFileName(""); setRequestId("");
        onImported?.();
      }
    } catch {
      setErrors(["Mất kết nối khi import. Kiểm tra kho trước khi thử lại để tránh nhập trùng."]);
    } finally { setLoading(false); }
  }

  function downloadTemplate() {
    const blob = new Blob(["\uFEFF", SAMPLE], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "mau-import-sach.csv"; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div className="space-y-3 rounded-lg border border-hairline bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold">Import sách từ CSV</h2>
          <p className="text-[12px] text-ink-muted">Hỗ trợ CSV UTF-8, tối đa 500 cuốn/lần. Một dòng = một cuốn; ISBN trùng vẫn được phép.</p>
        </div>
        <Button onClick={downloadTemplate} variant="secondary" size="sm">Tải file mẫu</Button>
      </div>
      <input type="file" accept=".csv,text/csv" aria-label="Chọn file CSV" onChange={(e) => openFile(e.target.files?.[0])} className="block w-full text-[13px]" />
      {fileName && <p className="text-[12px] text-ink-muted">Tệp: {fileName}</p>}
      {!!errors.length && <Banner tone="danger">{errors.length} lỗi: {errors.slice(0, 8).join(" | ")}{errors.length > 8 ? " …" : ""}</Banner>}
      {message && <Banner tone="success">{message}</Banner>}
      {!!books.length && (
        <>
          <div className="max-h-56 overflow-auto rounded-md border border-hairline">
            <table className="w-full text-left text-[12px]">
              <thead className="sticky top-0 bg-surface-soft"><tr><th className="p-2">#</th><th className="p-2">Tiêu đề</th><th className="p-2">ISBN</th><th className="p-2">Giá nhập</th><th className="p-2">Giá bán</th></tr></thead>
              <tbody>{books.slice(0, 50).map((b, i) => <tr className="border-t border-hairline" key={i}><td className="p-2">{i + 1}</td><td className="p-2">{b.title}</td><td className="p-2">{b.isbn ?? "—"}</td><td className="p-2">{b.purchaseCostVnd ?? "—"}</td><td className="p-2">{b.listPriceVnd ?? "—"}</td></tr>)}</tbody>
            </table>
          </div>
          <p className="text-[12px] text-ink-muted">Đã đọc {books.length} cuốn. Hiển thị tối đa 50 cuốn để kiểm tra. Import tạo sách ở kho, không tạo lô mua hàng.</p>
          <Button variant="primary" loading={loading} disabled={errors.length > 0} onClick={importBooks}>Xác nhận nhập {books.length} cuốn</Button>
        </>
      )}
    </div>
  );
}
