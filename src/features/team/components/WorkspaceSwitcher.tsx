import { useState } from "react";
import { Check, ChevronsUpDown, Plus, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useWorkspace } from "@/shared/hooks/useWorkspace";
import { useUserWorkspaces } from "../hooks/useUserWorkspaces";
import { CreateWorkspaceDialog } from "./CreateWorkspaceDialog";
import { cn } from "@/lib/utils";

// TODO: Refactoring TanStack Query keys to be workspace-scoped would enable
// smooth in-app switching without a full page reload.

interface Props {
  collapsed: boolean;
}

export function WorkspaceSwitcher({ collapsed }: Props) {
  const { workspace, setActiveWorkspace } = useWorkspace();
  const { entries } = useUserWorkspaces();
  const [createOpen, setCreateOpen] = useState(false);

  if (!workspace) return null;

  const handleSwitch = (id: string) => {
    if (id === workspace.id) return;
    setActiveWorkspace(id);
    // Full reload ensures all workspace-scoped data refetches cleanly.
    window.location.reload();
  };

  // Always render the dropdown so "Create new workspace" stays discoverable,
  // even when the user only belongs to a single workspace.
  const switcherEntries =
    entries.length > 0
      ? entries
      : [{ workspace, role: "owner" as const }];

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              "h-auto w-full justify-start gap-2 px-2 py-2 text-left",
              collapsed && "justify-center px-0",
            )}
          >
            <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
            {!collapsed && (
              <>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{workspace.name}</div>
                </div>
                <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
          {switcherEntries.map(({ workspace: ws, role }) => (
            <DropdownMenuItem key={ws.id} onClick={() => handleSwitch(ws.id)} className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{ws.name}</div>
                <div className="truncate text-xs text-muted-foreground capitalize">{role}</div>
              </div>
              {ws.id === workspace.id && <Check className="h-4 w-4 text-primary" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create new workspace
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <CreateWorkspaceDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}