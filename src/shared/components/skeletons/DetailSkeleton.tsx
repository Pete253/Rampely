import { Skeleton } from "@/components/ui/skeleton";

export function DetailSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-2/3" />
      <Skeleton className="h-6 w-1/3" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    </div>
  );
}
