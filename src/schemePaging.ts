import type { Scheme } from "./types";

export const SCHEME_PAGE_SIZE = 8;

export interface SchemePage {
  items: Scheme[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
}

export function getSchemePage(
  schemes: Scheme[],
  query: string,
  requestedPage: number,
  pageSize = SCHEME_PAGE_SIZE,
): SchemePage {
  const normalizedQuery = query.trim().toLocaleLowerCase("zh-CN");
  const filtered = normalizedQuery
    ? schemes.filter((scheme) => scheme.name.toLocaleLowerCase("zh-CN").includes(normalizedQuery))
    : schemes;
  const safePageSize = Math.max(1, Math.floor(pageSize));
  const totalPages = Math.max(1, Math.ceil(filtered.length / safePageSize));
  const currentPage = Math.min(totalPages, Math.max(1, Math.floor(requestedPage) || 1));
  const offset = (currentPage - 1) * safePageSize;

  return {
    items: filtered.slice(offset, offset + safePageSize),
    currentPage,
    totalPages,
    totalItems: filtered.length,
  };
}
