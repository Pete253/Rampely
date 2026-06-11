import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/shared/hooks/useWorkspace";
import { CountrySelect } from "@/shared/components/onboarding/CountrySelect";
import type { CountryCode } from "@/shared/lib/country-features";
import { TeamSettings } from "@/features/team/components/TeamSettings";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { workspace, refresh } = useWorkspace();
  const [country, setCountry] = useState<CountryCode | undefined>(
    workspace?.country as CountryCode | undefined,
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (workspace?.country) setCountry(workspace.country as CountryCode);
  }, [workspace?.country]);

  async function handleSave() {
    if (!workspace || !country) return;
    setSaving(true);
    const { error } = await supabase
      .from("workspaces")
      .update({ country })
      .eq("id", workspace.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await refresh();
    toast.success("Country updated");
  }

  const dirty = country !== workspace?.country;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your workspace preferences.</p>
      </div>

      <Tabs defaultValue="team" className="space-y-6">
        <TabsList>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="country">Country</TabsTrigger>
        </TabsList>
        <TabsContent value="team" className="space-y-6">
          <TeamSettings />
        </TabsContent>
        <TabsContent value="country">
          <Card>
        <CardHeader>
          <CardTitle>Country &amp; Region</CardTitle>
          <CardDescription>
            Changing country affects which local integrations are available. Your existing data is
            not modified.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="workspace-country">Workspace country</Label>
            <CountrySelect id="workspace-country" value={country} onChange={setCountry} />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={!dirty || !country || saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
