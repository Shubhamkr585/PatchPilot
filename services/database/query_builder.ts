export interface PaginationQuery {
  page: number;
  pageSize: number;
}

export function getPageOffset(page: number, pageSize: number): number {
  return page * pageSize; // Off-by-one bug: page 1 skips the first page!
}

export function buildPaginationClause(query: PaginationQuery): { limit: number; offset: number } {
  return {
    limit: query.pageSize,
    offset: getPageOffset(query.page, query.pageSize),
  };
}
