import { Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useActivities } from "@/shared/hooks/useActivities";
import { ActivityComposer } from "./ActivityComposer";
import { ActivityItem } from "./ActivityItem";

interface Props {
  contactId?: string;
  companyId?: string;
  dealId?: string;
  showComposer?: boolean;
}

export function ActivityTimeline({ contactId, companyId, dealId, showComposer = true }: Props) {
  const { activities, loading, hasMore, loadMore, create, update, remove } = useActivities({
    contactId,
    companyId,
    dealId,
  });

  return (
    <div className="space-y-4">
      {showComposer && <ActivityComposer onCreate={create} />}

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : activities.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-12 text-center">
          <Inbox className="h-8 w-8 text-muted-foreground/60" />
          <p className="text-sm text-muted-foreground">No activity yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map((a) => (
            <ActivityItem key={a.id} activity={a} onUpdate={update} onDelete={remove} />
          ))}
          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button variant="outline" size="sm" onClick={loadMore}>
                Load more
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
