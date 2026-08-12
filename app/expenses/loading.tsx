export default function ExpensesLoading() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Chi phí</h1>
      <div className="h-64 animate-pulse rounded-xl border bg-white p-4">
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 rounded bg-slate-100" />
          ))}
        </div>
      </div>
    </div>
  );
}
