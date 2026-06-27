/**
 * Pagination utility placeholder.
 * Shared pagination helpers can be expanded here in a future phase.
 */
const buildPaginationMeta = ({ page = 1, limit = 10, total = 0 } = {}) => ({
  page,
  limit,
  total,
  totalPages: limit > 0 ? Math.ceil(total / limit) : 0,
});

export { buildPaginationMeta };
