import { type RefObject } from "react";
import { DateRangeSelector } from "./DateRangeSelector";
import { ExportMenu } from "./ExportMenu";
import type { RangePreset } from "../lib/reporting-utils";

interface Props {
  preset: RangePreset;
  customFrom?: string;
  customTo?: string;
  rangeSlug: string;
  dashboardRef: RefObject<HTMLDivElement | null>;
  setIsExporting: (b: boolean) => void;
  onChange: (next: { preset: RangePreset; from?: string; to?: string }) => void;
}

export function ReportsHeader(props: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
      <div className="flex items-center gap-2 flex-wrap">
        <DateRangeSelector
          preset={props.preset}
          customFrom={props.customFrom}
          customTo={props.customTo}
          onChange={props.onChange}
        />
        <ExportMenu
          dashboardRef={props.dashboardRef}
          setIsExporting={props.setIsExporting}
          rangeSlug={props.rangeSlug}
        />
      </div>
    </div>
  );
}
