import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { COUNTRY_FEATURES, COUNTRY_ORDER, type CountryCode } from "@/shared/lib/country-features";

interface Props {
  value: CountryCode | undefined;
  onChange: (value: CountryCode) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
}

export function CountrySelect({ value, onChange, placeholder = "Select a country", disabled, id }: Props) {
  return (
    <Select
      value={value}
      onValueChange={(v) => onChange(v as CountryCode)}
      disabled={disabled}
    >
      <SelectTrigger id={id}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {COUNTRY_ORDER.map((code) => {
          const f = COUNTRY_FEATURES[code];
          return (
            <SelectItem key={code} value={code}>
              {code === "OTHER" ? "Other" : `${f.name} (${code})`}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
