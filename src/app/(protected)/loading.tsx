export default function ProtectedLoading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="text-5xl animate-spin">🎮</div>
        <p className="text-lg font-black text-indigo-400">Loading…</p>
      </div>
    </div>
  );
}
