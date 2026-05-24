import { Card, CardHeader, CardTitle, Skeleton } from '@/components/ui'

export default function LifeOverviewPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-50">Life</h1>
        <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">
          Health, finances, home, and relationships
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {['Health', 'Finances', 'Reading', 'Goals', 'Tasks'].map((section) => (
          <Card key={section}>
            <CardHeader>
              <CardTitle>{section}</CardTitle>
            </CardHeader>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
