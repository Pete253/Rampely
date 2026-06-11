import { Link } from "@tanstack/react-router";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export interface BreadcrumbEntry {
  label: string;
  to?: string;
  params?: Record<string, string>;
}

interface Props {
  items: BreadcrumbEntry[];
}

export function Breadcrumbs({ items }: Props) {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <BreadcrumbItem key={`${item.label}-${i}`}>
              {isLast || !item.to ? (
                <BreadcrumbPage>{item.label}</BreadcrumbPage>
              ) : (
                <>
                  <BreadcrumbLink asChild>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    <Link to={item.to as any} params={item.params as any}>
                      {item.label}
                    </Link>
                  </BreadcrumbLink>
                  <BreadcrumbSeparator />
                </>
              )}
            </BreadcrumbItem>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
