import { useQuery } from "@tanstack/react-query";
import { getAcademicCatalog } from "@/services/academicCatalogService";

export function useAcademicCatalog() {
  return useQuery({
    queryKey: ["academic-catalog"],
    queryFn: getAcademicCatalog,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
