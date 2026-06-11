import { useEffect, useState } from "react";
import { Filter, X } from "lucide-react";
import { supabase } from "@/shared/lib/supabase";
import { useWorkspace } from "@/shared/hooks/useWorkspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

export interface FiltersState {
  owner: string[];
  minValue?: number;
  maxValue?: number;
}

interface Props {
  value: FiltersState;
  onChange: (next: FiltersState) => void;
}





export function PipelineFilters({ value, onChange }: Props) {
  const { workspace } = useWorkspace();
  const [members, setMembers] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (!workspace) return;
    void (async () => {
      const { data: rows } = await supabase
        .from("workspace_members")
        .select("user_id")
        .eq("workspace_id", workspace.id);
      const ids = (rows ?? []).map((r) => r.user_id);
      if (ids.length === 0) {
        setMembers([]);
        return;
      }
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", ids);
      setMembers(
        (profiles ?? []).map((p) => ({ id: p.id, name: p.full_name ?? "Unknown user" })),
      );
    })();
  }, [workspace]);

  const activeCount =
    value.owner.length + (value.minValue ? 1 : 0) + (value.maxValue ? 1 : 0);

  return (
    <div className="flex items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm">
            <Filter className="mr-1 h-4 w-4" /> Filters
            {activeCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 space-y-4" align="start">
          <div>
            <div className="mb-2 text-xs font-medium">Owners</div>
            <div className="max-h-48 space-y-1 overflow-y-auto">
              {members.length === 0 && (
                <div className="text-xs text-muted-foreground">No members</div>
              )}
              {members.map((m) => {
                const checked = value.owner.includes(m.id);
                return (
                  <label key={m.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(v) => {
                        const next = v
                          ? [...value.owner, m.id]
                          : value.owner.filter((id) => id !== m.id);
                        onChange({ ...value, owner: next });
                      }}
                    />
                    <span>{m.name}</span>
                  </label>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="mb-1 text-xs font-medium">Min value</div>
              <Input
                type="number"
                value={value.minValue ?? ""}
                onChange={(e) =>
                  onChange({
                    ...value,
                    minValue: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
              />
            </div>
            <div>
              <div className="mb-1 text-xs font-medium">Max value</div>
              <Input
                type="number"
                value={value.maxValue ?? ""}
                onChange={(e) =>
                  onChange({
                    ...value,
                    maxValue: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
      {activeCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange({ owner: [], minValue: undefined, maxValue: undefined })}
        >
          <X className="mr-1 h-3 w-3" /> Clear
        </Button>
      )}
    </div>
  );
}
