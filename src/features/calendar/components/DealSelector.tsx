import { useEffect, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { supabase } from "@/shared/lib/supabase";
import { useWorkspace } from "@/shared/hooks/useWorkspace";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type DealRow = { id: string; title: string };

type Props = {
  value: string | null | undefined;
  onChange: (id: string | null) => void;
  companyId?: string | null;
  disabled?: boolean;
};

export function DealSelector({ value, onChange, companyId, disabled }: Props) {
  const { workspace } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [deals, setDeals] = useState<DealRow[]>([]);

  useEffect(() => {
    if (!workspace) return;
    let q = supabase
      .from("deals")
      .select("id, title")
      .eq("workspace_id", workspace.id)
      .order("created_at", { ascending: false });
    if (companyId) q = q.eq("company_id", companyId);
    void q.then(({ data }) => setDeals((data as DealRow[]) ?? []));
  }, [workspace, companyId]);

  const selected = deals.find((d) => d.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          {selected ? selected.title : <span className="text-muted-foreground">No deal</span>}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search deals…" />
          <CommandList>
            <CommandEmpty>No deals found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__none__"
                onSelect={() => {
                  onChange(null);
                  setOpen(false);
                }}
              >
                <Check className={cn("mr-2 h-4 w-4", !value ? "opacity-100" : "opacity-0")} />
                <span className="text-muted-foreground">No deal</span>
              </CommandItem>
              {deals.map((d) => (
                <CommandItem
                  key={d.id}
                  value={d.title}
                  onSelect={() => {
                    onChange(d.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn("mr-2 h-4 w-4", value === d.id ? "opacity-100" : "opacity-0")}
                  />
                  {d.title}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
