export default function Loading() {
  return <main className="grid min-h-screen place-items-center bg-ink" aria-busy="true" aria-label="Loading">
    <div className="flex items-center gap-3">
      <span className="serif text-4xl tracking-[-.06em]">sinq<span className="text-purple">.</span></span>
      <span className="loading-mark h-2 w-2 rounded-full bg-purple" />
    </div>
  </main>;
}