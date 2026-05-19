export const SkeletonCard = ({ className = "" }) => (
  <div className={`bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse ${className}`} />
);

export const SkeletonText = ({ lines = 1, className = "" }) => (
  <div className={`space-y-2 ${className}`}>
    {[...Array(lines)].map((_, i) => (
      <div key={i} className={`h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse ${i === lines - 1 ? 'w-3/4' : 'w-full'}`} />
    ))}
  </div>
);

export const SkeletonCards = ({ count = 3 }) => (
  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
    {[...Array(count)].map((_, i) => (
      <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 space-y-4">
        <SkeletonCard className="h-6 w-full" />
        <SkeletonText lines={2} />
        <SkeletonCard className="h-10 w-full" />
      </div>
    ))}
  </div>
);

export const SkeletonTable = ({ rows = 5, cols = 4 }) => (
  <div className="space-y-3 w-full">
    {[...Array(rows)].map((_, i) => (
      <div key={i} className="flex gap-4">
        {[...Array(cols)].map((_, j) => (
          <SkeletonCard key={j} className="h-12 flex-1" />
        ))}
      </div>
    ))}
  </div>
);

export const SkeletonProfile = () => (
  <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 space-y-6">
    <div className="flex items-center gap-6">
      <SkeletonCard className="h-24 w-24 rounded-full" />
      <div className="flex-1 space-y-2">
        <SkeletonCard className="h-6 w-1/2" />
        <SkeletonCard className="h-4 w-1/3" />
      </div>
    </div>
    <SkeletonText lines={3} />
  </div>
);

export const SkeletonGrid = ({ count = 6, cols = 3 }) => (
  <div className={`grid gap-6 md:grid-cols-2 lg:grid-cols-${cols}`}>
    {[...Array(count)].map((_, i) => (
      <div key={i} className="space-y-3">
        <SkeletonCard className="h-48 w-full rounded-xl" />
        <SkeletonCard className="h-4 w-full" />
        <SkeletonCard className="h-4 w-2/3" />
      </div>
    ))}
  </div>
);
