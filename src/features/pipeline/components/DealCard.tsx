import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Link, useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { closeDateColor, daysInStage, formatDKK } from "../lib/pipeline-utils";
import type { DealWithRelations } from "../hooks/useDeals";

interface Props {
  deal: DealWithRelations;
  lastMoveAt: string | null;
  onEdit?: (deal: DealWithRelations) => void;
  onDelete?: (deal: DealWithRelations) => void;
}

export function DealCard({ deal, lastMoveAt, onEdit, onDelete }: Props) {
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: deal.id,
    data: { type: "deal", stageId: deal.stage_id },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const dot = closeDateColor(deal.expected_close_date);
  const dotClass =
    dot === "green"
      ? "bg-success"
      : dot === "amber"
        ? "bg-warning"
        : dot === "red"
          ? "bg-danger"
          : "bg-white/20";

  const days = daysInStage(deal, lastMoveAt);
  const ownerInitials =
    deal.owner?.full_name
      ?.split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() ?? "?";

  const stop = (e: React.SyntheticEvent) => e.stopPropagation();

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        onClick={() => navigate({ to: "/deals/$id", params: { id: deal.id } })}
        className={cn(
          "group relative cursor-grab rounded-[10px] border bg-card p-3 text-sm transition-all duration-200 hover:bg-white/8 active:cursor-grabbing",
          isDragging && "opacity-50",
        )}
      >
        {(onEdit || onDelete) && (
          <div
            className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity"
            onPointerDown={stop}
            onClick={stop}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onPointerDown={stop}
                  onClick={stop}
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onPointerDown={stop} onClick={stop}>
                {onEdit && (
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      onEdit(deal);
                    }}
                  >
                    <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onSelect={(e) => {
                      e.preventDefault();
                      setConfirmOpen(true);
                    }}
                  >
                    <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        <div className="line-clamp-2 pr-6 text-[13px] font-bold leading-tight text-foreground">
          {deal.title}
        </div>
        <div className="mt-1 text-sm font-semibold text-primary-light">
          {formatDKK(Number(deal.value ?? 0))}
        </div>

        {deal.company && (
          <Link
            to="/companies/$id"
            params={{ id: deal.company.id }}
            onPointerDown={(e) => e.stopPropagation()}
            className="mt-1 block truncate text-xs text-blue-3 hover:underline"
          >
            {deal.company.name}
          </Link>
        )}

        {deal.contact && (
          <div className="mt-0.5 truncate text-xs text-white/40">
            {deal.contact.first_name} {deal.contact.last_name ?? ""}
          </div>
        )}

        <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-white/30">
          <div className="flex items-center gap-1.5">
            <span className={cn("h-1.5 w-1.5 rounded-full", dotClass)} />
            <span>
              {deal.expected_close_date
                ? format(new Date(deal.expected_close_date), "MMM d")
                : "No date"}
            </span>
          </div>
          <span>{days}d in stage</span>
        </div>

        <div className="mt-2 flex items-center justify-end">
          <Avatar className="h-6 w-6">
            {deal.owner?.avatar_url && <AvatarImage src={deal.owner.avatar_url} />}
            <AvatarFallback className="text-[10px]">{ownerInitials}</AvatarFallback>
          </Avatar>
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete deal "{deal.title}"?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete?.(deal);
                setConfirmOpen(false);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
