import Skeleton from "@/app/components/ui/Skeleton";

export default function ScanLoading() {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-3 w-60" />
      </div>
      <div className="rounded-lg border border-hairline bg-surface p-4">
        <Skeleton className="mb-3 h-4 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 flex-1" />
        </div>
      </div>
    </div>
  );
}
