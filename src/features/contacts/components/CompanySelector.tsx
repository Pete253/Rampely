import { useCallback, useEffect, useState } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { toast } from "sonner";
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
  CommandSeparator,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { Company } from "@/shared/lib/types";
import { CompanyForm } from "./CompanyForm";
import type { CompanyInput } from "../hooks/useCompanies";

type Props = {
  value: string | null | undefined;
  onChange: (id: string | null) => void;
  disabled?: boolean;
};

export function CompanySelector({ value, onChange, disabled }: Props) {
  const { workspace } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [companies, setCompanies] = useState<Pick<Company, "id" | "name">[]>([]);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [initialName, setInitialName] = useState("");

  const loadCompanies = useCallback(async () => {
    if (!workspace) return;
    const { data } = await supabase
      .from("companies")
      .select("id, name")
      .eq("workspace_id", workspace.id)
      .order("name");
    setCompanies(data ?? []);
  }, [workspace]);

  useEffect(() => {
    void loadCompanies();
  }, [loadCompanies]);

  const selected = companies.find((c) => c.id === value);
  const trimmed = search.trim();

  function openCreate() {
    setInitialName(trimmed);
    setOpen(false);
    setCreateOpen(true);
  }

  async function handleCreate(input: CompanyInput) {
    if (!workspace) return;
    const { data, error } = await supabase
      .from("companies")
      .insert({ ...input, workspace_id: workspace.id })
      .select("id, name")
      .single();
    if (error || !data) {
      toast.error(error?.message ?? "Failed to create company");
      throw error ?? new Error("Failed to create company");
    }
    setCompanies((prev) =>
      [...prev, { id: data.id, name: data.name }].sort((a, b) => a.name.localeCompare(b.name)),
    );
    onChange(data.id);
    setCreateOpen(false);
    setSearch("");
    toast.success("Company created");
    void loadCompanies();
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            disabled={disabled}
            className="w-full justify-between font-normal"
          >
            {selected?.name ?? <span className="text-muted-foreground">No company</span>}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Search companies…"
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>No companies found.</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value="__none__"
                  onSelect={() => {
                    onChange(null);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", !value ? "opacity-100" : "opacity-0")} />
                  <span className="text-muted-foreground">No company</span>
                </CommandItem>
                {companies.map((c) => (
                  <CommandItem
                    key={c.id}
                    value={c.name}
                    onSelect={() => {
                      onChange(c.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn("mr-2 h-4 w-4", value === c.id ? "opacity-100" : "opacity-0")}
                    />
                    {c.name}
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup>
                <CommandItem
                  value={`__create__${trimmed}`}
                  onSelect={openCreate}
                  className="text-primary"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {trimmed ? `Create "${trimmed}"` : "Create new company"}
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Dialog open={createOpen} onOpenChange={setCreateOpen} modal>
        <DialogContent className="max-w-lg" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>New company</DialogTitle>
          </DialogHeader>
          <CompanyForm
            initial={{ name: initialName }}
            submitLabel="Create company"
            onSubmit={handleCreate}
            onCancel={() => setCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
