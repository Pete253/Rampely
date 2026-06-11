import { useWorkspace } from "./useWorkspace";
import { getCountryFeatures, type CountryFeatures } from "../lib/country-features";

export function useCountryFeatures(): CountryFeatures {
  const { workspace } = useWorkspace();
  return getCountryFeatures(workspace?.country);
}
