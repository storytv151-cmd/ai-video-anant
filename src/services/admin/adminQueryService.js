import { buildPaginationMeta } from "../../utils/pagination.js";

const parsePositiveInt = (value, fallback) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.floor(parsed);
};

const parseBoolean = (value, fallback = null) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  const normalized = String(value).trim().toLowerCase();
  if (["true", "1", "yes"].includes(normalized)) {
    return true;
  }
  if (["false", "0", "no"].includes(normalized)) {
    return false;
  }
  return fallback;
};

const normalizeString = (value) => {
  if (value === undefined || value === null) {
    return null;
  }
  const normalized = String(value).trim();
  return normalized || null;
};

const normalizeSortDirection = (value) => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  return ["asc", "ascending", "1", "oldest"].includes(normalized) ? 1 : -1;
};

const buildPagination = ({ page = 1, limit = 20, maxLimit = 100 } = {}) => {
  const safePage = parsePositiveInt(page, 1);
  const safeLimit = Math.min(parsePositiveInt(limit, 20), maxLimit);
  return {
    page: safePage,
    limit: safeLimit,
    skip: (safePage - 1) * safeLimit,
  };
};

const buildDateRange = ({ from = null, to = null } = {}) => {
  const range = {};
  if (from) {
    const parsedFrom = new Date(from);
    if (!Number.isNaN(parsedFrom.getTime())) {
      range.$gte = parsedFrom;
    }
  }
  if (to) {
    const parsedTo = new Date(to);
    if (!Number.isNaN(parsedTo.getTime())) {
      range.$lte = parsedTo;
    }
  }
  return Object.keys(range).length > 0 ? range : null;
};

const buildRegexSearch = (value) => {
  const normalized = normalizeString(value);
  return normalized
    ? new RegExp(normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
    : null;
};

const buildPaginatedResponse = ({
  items = [],
  page = 1,
  limit = 20,
  total = 0,
} = {}) => ({
  items,
  meta: buildPaginationMeta({ page, limit, total }),
});

const adminQueryService = Object.freeze({
  parsePositiveInt,
  parseBoolean,
  normalizeString,
  normalizeSortDirection,
  buildPagination,
  buildDateRange,
  buildRegexSearch,
  buildPaginatedResponse,
});

export default adminQueryService;
