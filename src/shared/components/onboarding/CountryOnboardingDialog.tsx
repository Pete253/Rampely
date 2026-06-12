import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/shared/hooks/useWorkspace";
import { inferCountryFromLanguage, type CountryCode } from "@/shared/lib/country-features";
import { CountrySelect } from "./CountrySelect";

export function CountryOnboardingDialog() {
  const { workspace, refresh } = useWorkspace();
  const navigate = useNavigate();
  const [country, setCountry] = useState<CountryCode>(() =>
    inferCountryFromLanguage(typeof navigator !== "undefined" ? navigator.language : null),
  );
  const [saving, setSaving] = useState(false);

  if (!workspace) return null;

  async function handleContinue() {
    if (!workspace || !country) return;
    setSaving(true);
    const { error } = await supabase
      .from("workspaces")
      .update({ country, onboarding_completed: true })
      .eq("id", workspace.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await refresh();
    navigate({ to: "/reports" });
  }

  return (
    <Dialog open modal>
      <DialogContent
        className="sm:max-w-md [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Welcome to Rampely</DialogTitle>
          <DialogDescription>Which country does your team primarily operate in?</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="onboarding-country">Country</Label>
          <CountrySelect id="onboarding-country" value={country} onChange={setCountry} />
          <p className="text-xs text-muted-foreground">
            This determines which local integrations are available (e.g. company registry lookup,
            SMS gateways, currency defaults). You can change this later in Settings.
          </p>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleContinue} disabled={!country || saving}>
            {saving ? "Saving…" : "Continue"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
