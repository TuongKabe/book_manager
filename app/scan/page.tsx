import SpeedScanner from "@/app/components/SpeedScanner";

export default function ScanPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Nhập nhanh</h1>
      <SpeedScanner />
    </div>
  );
}