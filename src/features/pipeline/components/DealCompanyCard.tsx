import { Link } from "@tanstack/react-router";
import { Building2, Link2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CompanySelector } from "@/features/contacts/components/CompanySelector";
import type { DealDetailData } from "../hooks/useDeal";

interface Props {
  deal: DealDetailData;
  onUpdate: (patch: { company_id: string | null }) => Promise<void>;
}

export function DealCompanyCard({ deal, onUpdate }: Props) {
  const company = deal.company;

  async function handleChange(id: string | null) {
    try {
      await onUpdate({ company_id: id });
      toast.success(id ? "Company linked" : "Company removed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update");
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          Company
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {company ? (
          <div className="space-y-2">
            <Link
              to="/companies/$id"
              params={{ id: company.id }}
              className="block text-sm font-medium text-primary hover:underline"
            >
              {company.name}
            </Link>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {company.industry && <Badge variant="secondary">{company.industry}</Badge>}
              {company.employees != null && <span>{company.employees} employees</span>}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground"
              onClick={() => void handleChange(null)}
            >
              Unlink
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">No company linked.</p>
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1">
                <CompanySelector value={null} onChange={(id) => void handleChange(id)} />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
