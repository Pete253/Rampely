import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Users, Star, X, Plus } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ContactSelector } from "./ContactSelector";
import type { DealDetailData } from "../hooks/useDeal";

interface Props {
  deal: DealDetailData;
  onAdd: (contactId: string, opts?: { is_primary?: boolean }) => Promise<void>;
  onRemove: (contactId: string) => Promise<void>;
  onSetPrimary: (contactId: string) => Promise<void>;
}

export function DealContactsCard({ deal, onAdd, onRemove, onSetPrimary }: Props) {
  const [adding, setAdding] = useState(false);
  const [pendingContact, setPendingContact] = useState<string | null>(null);

  async function handleAdd(contactId: string | null) {
    if (!contactId) return;
    setPendingContact(contactId);
    try {
      await onAdd(contactId, { is_primary: deal.contacts.length === 0 });
      toast.success("Contact added");
      setAdding(false);
      setPendingContact(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add contact");
      setPendingContact(null);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Users className="h-4 w-4 text-muted-foreground" />
          Contacts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {deal.contacts.length === 0 ? (
          <p className="text-xs text-muted-foreground">No contacts on this deal.</p>
        ) : (
          <div className="divide-y rounded-md border">
            {deal.contacts.map((dc) => {
              if (!dc.contact) {
                return (
                  <div key={dc.id} className="flex items-center gap-3 p-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">?</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1 text-xs text-muted-foreground">
                      Contact unavailable
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      title="Remove from deal"
                      onClick={() => void onRemove(dc.contact_id)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              }
              const initials =
                `${dc.contact.first_name?.[0] ?? ""}${dc.contact.last_name?.[0] ?? ""}`.toUpperCase() ||
                "?";
              return (
                <div key={dc.id} className="flex items-center gap-3 p-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <Link
                      to="/contacts/$id"
                      params={{ id: dc.contact.id }}
                      className="block truncate text-sm font-medium text-primary hover:underline"
                    >
                      {dc.contact.first_name} {dc.contact.last_name ?? ""}
                    </Link>
                    {dc.contact.title && (
                      <div className="truncate text-xs text-muted-foreground">
                        {dc.contact.title}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title={dc.is_primary ? "Primary contact" : "Set as primary"}
                      onClick={() => {
                        if (!dc.is_primary) void onSetPrimary(dc.contact_id);
                      }}
                    >
                      <Star
                        className={
                          dc.is_primary
                            ? "h-3.5 w-3.5 fill-amber-400 text-amber-500"
                            : "h-3.5 w-3.5 text-muted-foreground"
                        }
                      />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      title="Remove from deal"
                      onClick={() => void onRemove(dc.contact_id)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {adding ? (
          <div className="space-y-2 pt-1">
            <ContactSelector
              value={pendingContact}
              onChange={(id) => void handleAdd(id)}
              companyId={deal.company_id}
            />
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setAdding(false)}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-center"
            onClick={() => setAdding(true)}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add contact
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
