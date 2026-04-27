import { COUNTRIES } from "@/data/countries";

interface Props {
  value: string | null | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  includeAll?: boolean;
  id?: string;
}

/** Reusable country dropdown for the admin portal. */
const CountrySelect = ({ value, onChange, placeholder = "Country", className = "", includeAll = false, id }: Props) => (
  <select
    id={id}
    value={value || ""}
    onChange={(e) => onChange(e.target.value)}
    className={`bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm text-slate-200 ${className}`}
  >
    <option value="">{includeAll ? "All countries" : placeholder}</option>
    {COUNTRIES.map((c) => (
      <option key={c.code} value={c.name}>
        {c.name}
      </option>
    ))}
  </select>
);

export default CountrySelect;
