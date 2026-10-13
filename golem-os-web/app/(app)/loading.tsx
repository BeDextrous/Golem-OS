export default function AppLoading() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-4 animate-pulse" aria-busy="true" aria-label="Loading">
      <div className="h-7 w-48 rounded-md bg-stone-100 dark:bg-stone-800" />
      <div className="h-40 rounded-lg bg-stone-100 dark:bg-stone-800" />
      <div className="h-32 rounded-lg bg-stone-100 dark:bg-stone-800" />
    </div>
  )
}
