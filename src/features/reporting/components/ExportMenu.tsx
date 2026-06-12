import { useState, type RefObject } from "react";
import { Download, Loader2 } from "lucide-react";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Props {
  dashboardRef: RefObject<HTMLDivElement | null>;
  setIsExporting: (b: boolean) => void;
  rangeSlug: string;
}

export function ExportMenu({ dashboardRef, setIsExporting, rangeSlug }: Props) {
  const [busy, setBusy] = useState(false);

  async function exportPdf() {
    const node = dashboardRef.current;
    if (!node) {
      toast.error("Could not find report to export");
      return;
    }
    setBusy(true);
    setIsExporting(true);

    // Wait for React to commit the branded header into the DOM before capture.
    await new Promise<void>((r) => requestAnimationFrame(() => r()));
    await new Promise<void>((r) => requestAnimationFrame(() => r()));

    try {
      // Capture against the app surface color — the dashboard is dark-themed,
      // so a white backdrop would make the (white) text unreadable.
      const imgData = await toPng(node, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#13152E",
      });
      const img = await loadImage(imgData);
      const targetWidth = 800;
      const margin = 24;
      const scaledHeight = (img.height * targetWidth) / img.width;
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: [targetWidth + margin * 2, scaledHeight + margin * 2],
      });
      pdf.addImage(imgData, "PNG", margin, margin, targetWidth, scaledHeight);
      const filename = `rampely-report-${rangeSlug}-${format(new Date(), "yyyy-MM-dd")}.pdf`;
      pdf.save(filename);
      toast.success("PDF downloaded");
    } catch (e) {
      toast.error(`PDF export failed: ${(e as Error).message}`);
    } finally {
      setIsExporting(false);
      setBusy(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline" disabled={busy} className="gap-1.5">
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportPdf} disabled={busy}>
          Export as PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => toast.info("Coming soon")}>Export as CSV</DropdownMenuItem>
        <DropdownMenuItem onClick={() => toast.info("Coming soon")}>
          Export as Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load captured image"));
    img.src = src;
  });
}
