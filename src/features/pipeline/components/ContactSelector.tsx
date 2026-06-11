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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ContactForm } from "@/features/contacts/components/ContactForm";
import type { ContactInput } from "@/features/contacts/hooks/useContacts";

type ContactRow = { id: string; first_name: string; last_name: string | null };

type Props = {
  value: string | null | undefined;
  onChange: (id: string | null) => void;
  companyId?: string | null;
  disabled?: boolean;
};

export function ContactSelector({ value, onChange, companyId, disabled }: Props) {
  const { workspace } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [initialFirst, setInitialFirst] = useState("");
  const [initialLast, setInitialLast] = useState("");

  const loadContacts = useCallback(async () => {
    if (!workspace) return;
    let q = supabase
      .from("contacts")
      .select("id, first_name, last_name")
      .eq("workspace_id", workspace.id)
      .order("first_name");
    if (companyId) q = q.eq("company_id", companyId);
    const { data } = await q;
    setContacts(data ?? []);
  }, [workspace, companyId]);

  useEffect(() => {
    void loadContacts();
  }, [loadContacts]);

  const selected = contacts.find((c) => c.id === value);
  const label = (c: ContactRow) => `${c.first_name} ${c.last_name ?? ""}`.trim();
  const trimmed = search.trim();

  function openCreate() {
    const [first, ...rest] = trimmed.split(/\s+/);
    setInitialFirst(first ?? "");
    setInitialLast(rest.join(" "));
    setOpen(false);
    setCreateOpen(true);
  }

  async function handleCreate(input: ContactInput) {
    if (!workspace) return;
    const { data, error } = await supabase
      .from("contacts")
      .insert({ ...input, workspace_id: workspace.id })
      .select("id, first_name, last_name")
      .single();
    if (error || !data) {
      toast.error(error?.message ?? "Failed to create contact");
      throw error ?? new Error("Failed to create contact");
    }
    setContacts((prev) =>
      [...prev, { id: data.id, first_name: data.first_name, last_name: data.last_name }].sort(
        (a, b) => a.first_name.localeCompare(b.first_name),
      ),
    );
    onChange(data.id);
    setCreateOpen(false);
    setSearch("");
    toast.success("Contact created");
    void loadContacts();
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
            {selected ? label(selected) : <span className="text-muted-foreground">No contact</span>}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Search contacts…"
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>No contacts found.</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value="__none__"
                  onSelect={() => {
                    onChange(null);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", !value ? "opacity-100" : "opacity-0")} />
                  <span className="text-muted-foreground">No contact</span>
                </CommandItem>
                {contacts.map((c) => (
                  <CommandItem
                    key={c.id}
                    value={label(c)}
                    onSelect={() => {
                      onChange(c.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === c.id ? "opacity-100" : "opacity-0",
                      )}
                    />
                    {label(c)}
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
                  {trimmed ? `Create "${trimmed}"` : "Create new contact"}
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Dialog open={createOpen} onOpenChange={setCreateOpen} modal>
        <DialogContent
          className="max-w-lg"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>New contact</DialogTitle>
          </DialogHeader>
          <ContactForm
            initial={{
              first_name: initialFirst,
              last_name: initialLast,
              company_id: companyId ?? null,
            }}
            lockCompany={!!companyId}
            submitLabel="Create contact"
            onSubmit={handleCreate}
            onCancel={() => setCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
