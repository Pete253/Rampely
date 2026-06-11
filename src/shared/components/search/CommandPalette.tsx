import { useNavigate } from "@tanstack/react-router";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useCommandPalette } from "./use-command-palette";
import { useGlobalSearch, type SearchResult } from "@/shared/hooks/useGlobalSearch";
import {
  GROUPS,
  GROUP_ORDER,
  QUICK_ACTIONS,
  entityRoute,
  type EntityType,
} from "./search-groups";
import { SearchResultItem } from "./SearchResultItem";
import { QuickAction } from "./QuickAction";
import { usePendingCreate } from "@/shared/contexts/PendingCreateContext";

const DISPLAY = 5;

export function CommandPalette() {
  const { open, setOpen, query, setQuery } = useCommandPalette();
  const navigate = useNavigate();
  const { setPendingCreate } = usePendingCreate();
  const search = useGlobalSearch(query);

  const buckets: Record<EntityType, SearchResult[]> = {
    company: search.companies,
    contact: search.contacts,
    deal: search.deals,
    task: search.tasks,
    event: search.events,
    activity: search.activities,
  };

  const hasQuery = search.debouncedQuery.length > 0;
  const totalMatches = GROUP_ORDER.reduce((sum, g) => sum + buckets[g].length, 0);

  function goToEntity(type: EntityType, id: string) {
    const route = entityRoute(type, id);
    if (!route) return;
    setOpen(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    navigate({ to: route.to as any, params: route.params as any });
  }

  function seeAll(type: EntityType) {
    setOpen(false);
    const meta = GROUPS[type];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    navigate({ to: meta.listRoute as any, search: { search: search.debouncedQuery } as any });
  }

  function runQuickAction(id: string) {
    const action = QUICK_ACTIONS.find((a) => a.id === id);
    if (!action) return;
    setOpen(false);
    if (action.kind === "navigate" && action.to) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      navigate({ to: action.to as any });
      return;
    }
    if (action.kind === "create" && action.create) {
      setPendingCreate(action.create);
      const target =
        action.create === "company"
          ? "/companies"
          : action.create === "contact"
            ? "/contacts"
            : action.create === "deal"
              ? "/pipeline"
              : action.create === "task"
                ? "/tasks"
                : "/calendar";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      navigate({ to: target as any });
    }
  }

  const filteredQuickActions = hasQuery
    ? QUICK_ACTIONS.filter((a) => a.label.toLowerCase().includes(search.debouncedQuery.toLowerCase()))
    : QUICK_ACTIONS;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="max-w-[640px] overflow-hidden p-0"
        onOpenAutoFocus={(e) => {
          // Let cmdk autofocus the input
          e.preventDefault();
        }}
      >
        <Command shouldFilter={false} className="rounded-lg">
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder="Search companies, contacts, deals, tasks, events… or type a command"
          />
          <CommandList>
            {hasQuery && totalMatches === 0 && filteredQuickActions.length === 0 && (
              <CommandEmpty>
                <div className="space-y-1 py-2">
                  <div className="text-sm">No results for &ldquo;{search.debouncedQuery}&rdquo;</div>
                  <div className="text-xs text-muted-foreground">
                    Try a shorter or different term.
                  </div>
                </div>
              </CommandEmpty>
            )}

            {filteredQuickActions.length > 0 && (
              <CommandGroup heading="Quick Actions">
                {filteredQuickActions.map((a) => (
                  <CommandItem
                    key={a.id}
                    value={`qa-${a.id}`}
                    onSelect={() => runQuickAction(a.id)}
                  >
                    <QuickAction icon={a.icon} label={a.label} hint={a.hint} />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {!hasQuery && search.recents.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Recent">
                  {search.recents.map((r) => {
                    const meta = GROUPS[r.type as EntityType];
                    if (!meta) return null;
                    return (
                      <CommandItem
                        key={`recent-${r.type}-${r.id}`}
                        value={`recent-${r.type}-${r.id}`}
                        onSelect={() => goToEntity(r.type as EntityType, r.id)}
                      >
                        <SearchResultItem
                          icon={meta.icon}
                          label={r.label}
                          secondary={r.secondary}
                        />
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </>
            )}

            {hasQuery &&
              GROUP_ORDER.map((g) => {
                const items = buckets[g];
                if (items.length === 0) return null;
                const meta = GROUPS[g];
                const top = items.slice(0, DISPLAY);
                const hasMore = items.length > DISPLAY;
                return (
                  <CommandGroup key={g} heading={meta.label}>
                    {top.map((it) => (
                      <CommandItem
                        key={`${g}-${it.id}`}
                        value={`${g}-${it.id}`}
                        onSelect={() => goToEntity(g, it.id)}
                      >
                        <SearchResultItem
                          icon={meta.icon}
                          label={it.label}
                          secondary={it.secondary}
                          query={search.debouncedQuery}
                        />
                      </CommandItem>
                    ))}
                    {hasMore && (
                      <CommandItem
                        key={`${g}-see-all`}
                        value={`${g}-see-all`}
                        onSelect={() => seeAll(g)}
                        className="text-xs text-muted-foreground"
                      >
                        See all {items.length} {meta.label.toLowerCase()} results →
                      </CommandItem>
                    )}
                  </CommandGroup>
                );
              })}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
