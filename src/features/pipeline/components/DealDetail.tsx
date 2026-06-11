import { differenceInCalendarDays } from "date-fns";
import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ActivityTimeline } from "@/shared/components/activity/ActivityTimeline";
import { Breadcrumbs } from "@/shared/components/Breadcrumbs";
import { useDeal } from "../hooks/useDeal";
import { useDealStageHistory } from "../hooks/useDealStageHistory";
import { DealDetailHeader } from "./DealDetailHeader";
import { DealMetricsBar } from "./DealMetricsBar";
import { DealCompanyCard } from "./DealCompanyCard";
import { DealContactsCard } from "./DealContactsCard";
import { DealDetailsCard } from "./DealDetailsCard";
import { DealStageHistory } from "./DealStageHistory";
import { EntityTasksTab } from "@/features/calendar/components/EntityTasksTab";

interface Props {
  dealId: string;
}

export function DealDetail({ dealId }: Props) {
  const {
    deal,
    loading,
    notFound,
    refresh,
    update,
    remove,
    addContact,
    removeContact,
    setPrimaryContact,
  } = useDeal(dealId);
  const { entries: history } = useDealStageHistory(dealId);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-2/3" />
        <Skeleton className="h-20 w-full" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-56 w-full" />
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (notFound || !deal) {
    return <DealNotFound />;
  }

  // Days in current stage from latest open history entry
  const currentEntry = history.find((h) => !h.exited_at);
  const daysInStage = currentEntry
    ? Math.max(0, differenceInCalendarDays(new Date(), new Date(currentEntry.entered_at)))
    : Math.max(0, differenceInCalendarDays(new Date(), new Date(deal.created_at)));

  return (
    <div className="space-y-4">
      <Breadcrumbs
        items={[
          { label: "Pipeline", to: "/pipeline" },
          { label: deal.title },
        ]}
      />
      <DealDetailHeader
        deal={deal}
        onUpdate={update}
        onRemove={remove}
        onChanged={refresh}
      />

      <DealMetricsBar deal={deal} daysInStage={daysInStage} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          <DealCompanyCard
            deal={deal}
            onUpdate={(patch) => update(patch)}
          />
          <DealContactsCard
            deal={deal}
            onAdd={addContact}
            onRemove={removeContact}
            onSetPrimary={setPrimaryContact}
          />
          <DealDetailsCard deal={deal} onUpdate={update} />
        </div>

        <Card className="min-w-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="activity">
              <TabsList>
                <TabsTrigger value="activity">Activity</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
                <TabsTrigger value="tasks">Tasks</TabsTrigger>
                <TabsTrigger value="files">Files</TabsTrigger>
              </TabsList>
              <TabsContent value="activity" className="mt-4">
                <ActivityTimeline dealId={deal.id} />
              </TabsContent>
              <TabsContent value="notes" className="mt-4">
                <PlaceholderTab text="Dedicated notes view coming soon — notes appear in the Activity tab for now." />
              </TabsContent>
              <TabsContent value="tasks" className="mt-4">
                <EntityTasksTab dealId={deal.id} />
              </TabsContent>
              <TabsContent value="files" className="mt-4">
                <PlaceholderTab text="File attachments coming soon." />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <DealStageHistory dealId={deal.id} />
    </div>
  );
}

function DealNotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-16 text-center">
      <h2 className="text-lg font-semibold">Deal not found</h2>
      <p className="text-sm text-muted-foreground">
        This deal may have been deleted or you don't have access.
      </p>
      <Button asChild>
        <Link to="/pipeline" search={{ pipelineId: "", owner: [], minValue: undefined, maxValue: undefined }}>Back to Pipeline</Link>
      </Button>
    </div>
  );
}

function PlaceholderTab({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center rounded-md border border-dashed p-12 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}
