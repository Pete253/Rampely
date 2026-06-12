import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CompanySelector } from "@/features/contacts/components/CompanySelector";
import { ContactSelector } from "./ContactSelector";
import type { Pipeline, PipelineStage } from "@/shared/lib/types";

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  value: z.coerce.number().min(0, "Value must be >= 0"),
  pipeline_id: z.string().min(1, "Pipeline is required"),
  stage_id: z.string().min(1, "Stage is required"),
  company_id: z.string().nullable().optional(),
  contact_id: z.string().nullable().optional(),
  expected_close_date: z.date().nullable().optional(),
  description: z.string().nullable().optional(),
});

export type DealFormValues = z.infer<typeof schema>;

interface Props {
  pipelines: Pipeline[];
  stagesByPipeline: Record<string, PipelineStage[]>;
  defaultPipelineId: string;
  onSubmit: (values: DealFormValues) => Promise<void> | void;
  onCancel: () => void;
  initialValues?: Partial<DealFormValues>;
  submitLabel?: string;
}

export function DealForm({
  pipelines,
  stagesByPipeline,
  defaultPipelineId,
  onSubmit,
  onCancel,
  initialValues,
  submitLabel,
}: Props) {
  const defaultStages = stagesByPipeline[defaultPipelineId] ?? [];
  const form = useForm<DealFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: initialValues?.title ?? "",
      value: initialValues?.value ?? 0,
      pipeline_id: initialValues?.pipeline_id ?? defaultPipelineId,
      stage_id: initialValues?.stage_id ?? defaultStages[0]?.id ?? "",
      company_id: initialValues?.company_id ?? null,
      contact_id: initialValues?.contact_id ?? null,
      expected_close_date: initialValues?.expected_close_date ?? null,
      description: initialValues?.description ?? "",
    },
  });

  const [submitting, setSubmitting] = useState(false);
  const watchedPipeline = form.watch("pipeline_id");
  const watchedCompany = form.watch("company_id");
  const stagesForCurrent = stagesByPipeline[watchedPipeline] ?? [];

  // When pipeline changes, reset stage to first
  useEffect(() => {
    const first = stagesForCurrent[0]?.id;
    if (first && !stagesForCurrent.find((s) => s.id === form.getValues("stage_id"))) {
      form.setValue("stage_id", first);
    }
  }, [watchedPipeline, stagesForCurrent, form]);

  async function handleSubmit(values: DealFormValues) {
    setSubmitting(true);
    try {
      await onSubmit(values);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Acme Corp - Q2 retainer" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="value"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Value (DKK)</FormLabel>
                <FormControl>
                  <Input type="number" min={0} step={1000} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="expected_close_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Expected close</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground",
                        )}
                      >
                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value ?? undefined}
                      onSelect={(d) => field.onChange(d ?? null)}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="pipeline_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Pipeline</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select pipeline" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {pipelines.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="stage_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Stage</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select stage" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {stagesForCurrent.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="company_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Company</FormLabel>
              <CompanySelector value={field.value} onChange={field.onChange} />
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="contact_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contact</FormLabel>
              <ContactSelector
                value={field.value}
                onChange={field.onChange}
                companyId={watchedCompany}
              />
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  rows={3}
                  placeholder="Notes about this deal…"
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving…" : (submitLabel ?? "Create deal")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
