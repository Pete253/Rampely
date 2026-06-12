import { Link, useLocation } from "@tanstack/react-router";
import {
  BarChart3,
  LogOut,
  ChevronsLeft,
  ChevronsRight,
  Building2,
  Users,
  KanbanSquare,
  Calendar,
  CheckSquare,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/shared/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { RampelyLockup } from "@/shared/components/brand/RampelyLockup";
import { RampelyMark } from "@/shared/components/brand/RampelyMark";
import { WorkspaceSwitcher } from "@/features/team/components/WorkspaceSwitcher";

type NavItem = { label: string; to: string; icon: LucideIcon };

// Add new navigation entries here — the sidebar reads from this single config.
export const navItems: NavItem[] = [
  { label: "Reports", to: "/reports", icon: BarChart3 },
  { label: "Companies", to: "/companies", icon: Building2 },
  { label: "Contacts", to: "/contacts", icon: Users },
  { label: "Pipeline", to: "/pipeline", icon: KanbanSquare },
  { label: "Calendar", to: "/calendar", icon: Calendar },
  { label: "Tasks", to: "/tasks", icon: CheckSquare },
  { label: "Settings", to: "/settings", icon: Settings },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { profile, signOut } = useAuth();
  const location = useLocation();

  const initials =
    profile?.full_name
      ?.split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() ?? "U";

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200",
        collapsed ? "w-16" : "w-[200px]",
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-3">
        {collapsed ? (
          <RampelyMark size={26} />
        ) : (
          <RampelyLockup height={26} className="text-white" />
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed((c) => !c)}
          className="ml-auto h-7 w-7 text-white/40 hover:text-white"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Workspace switcher */}
      <div className="border-b border-sidebar-border px-2 py-1">
        <WorkspaceSwitcher collapsed={collapsed} />
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 p-2">
        {navItems.map((item) => {
          const active =
            location.pathname === item.to || location.pathname.startsWith(item.to + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-2.5 rounded-sm px-2.5 py-2 text-[13px] transition-all duration-200",
                active
                  ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                  : "font-normal text-white/40 hover:bg-white/5 hover:text-white/75",
                collapsed && "justify-center px-0",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="border-t border-sidebar-border p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "flex w-full items-center gap-2.5 rounded-sm p-2 text-left transition-colors hover:bg-white/5",
                collapsed && "justify-center",
              )}
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-xs font-bold text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold text-white/90">
                    {profile?.full_name ?? "User"}
                  </div>
                  <div className="truncate text-[11px] text-white/40">{profile?.email}</div>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-48">
            <DropdownMenuItem onClick={() => signOut()}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
