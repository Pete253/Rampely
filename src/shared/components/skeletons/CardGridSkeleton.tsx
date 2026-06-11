import { Skeleton } from "@/components/ui/skeleton";

export function CardGridSkeleton({
  cards = 4,
  height = "h-32",
}: {
  cards?: number;
  height?: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: cards }).map((_, i) => (
        <Skeleton key={i} className={`${height} w-full`} />
      ))}
    </div>
  );
}
