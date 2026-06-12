export type ContactField =
  | "first_name"
  | "last_name"
  | "email"
  | "phone"
  | "title"
  | "company_name";

export type CompanyField = "name" | "cvr" | "website" | "industry" | "employees" | "address";

export type FieldKey = ContactField | CompanyField;

export interface FieldDef {
  key: FieldKey;
  label: string;
  required?: boolean;
}

export const CONTACT_FIELDS: FieldDef[] = [
  { key: "first_name", label: "First name", required: true },
  { key: "last_name", label: "Last name", required: true },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "title", label: "Title" },
  { key: "company_name", label: "Company name" },
];

export const COMPANY_FIELDS: FieldDef[] = [
  { key: "name", label: "Name", required: true },
  { key: "cvr", label: "CVR" },
  { key: "website", label: "Website" },
  { key: "industry", label: "Industry" },
  { key: "employees", label: "Employees" },
  { key: "address", label: "Address" },
];

const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "");

const HEADER_ALIASES: Record<FieldKey, string[]> = {
  first_name: ["firstname", "fornavn", "givenname", "first"],
  last_name: ["lastname", "efternavn", "surname", "familyname", "last"],
  email: ["email", "emailaddress", "epost", "mail"],
  phone: ["phone", "telefon", "mobile", "tlf", "mobil"],
  title: ["title", "jobtitle", "stilling", "role"],
  company_name: ["company", "companyname", "virksomhed", "firma", "organization"],
  name: ["name", "companyname", "virksomhed", "firma"],
  cvr: ["cvr", "cvrnummer", "cvrno", "vat", "vatnumber"],
  website: ["website", "url", "homepage", "hjemmeside", "web"],
  industry: ["industry", "branche", "sector"],
  employees: ["employees", "ansatte", "antalansatte", "headcount", "size"],
  address: ["address", "adresse", "street", "location"],
};

export function autoMap(headers: string[], fields: FieldDef[]): Record<string, FieldKey | null> {
  const result: Record<string, FieldKey | null> = {};
  for (const h of headers) {
    const s = slug(h);
    let match: FieldKey | null = null;
    for (const f of fields) {
      const aliases = HEADER_ALIASES[f.key] ?? [];
      if (aliases.some((a) => slug(a) === s)) {
        match = f.key;
        break;
      }
    }
    result[h] = match;
  }
  return result;
}

export interface MappedRow<T extends FieldKey> {
  values: Partial<Record<T, string>>;
  missing: string[];
}

export function mapRow<T extends FieldKey>(
  raw: Record<string, string>,
  mapping: Record<string, FieldKey | null>,
  fields: FieldDef[],
): MappedRow<T> {
  const values: Partial<Record<FieldKey, string>> = {};
  for (const [header, target] of Object.entries(mapping)) {
    if (!target) continue;
    const v = (raw[header] ?? "").trim();
    if (v) values[target] = v;
  }
  const missing = fields.filter((f) => f.required && !values[f.key]).map((f) => f.label);
  return { values: values as Partial<Record<T, string>>, missing };
}

export function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
