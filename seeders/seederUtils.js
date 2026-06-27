export const isEmpty = (value) => {
  if (value === undefined || value === null) {
    return true;
  }
  if (Array.isArray(value) && value.length === 0) {
    return true;
  }
  if (typeof value === "object" && Object.keys(value).length === 0) {
    return true;
  }
  return false;
};

export const updateFieldIdempotent = (existing, defaults) => {
  let updated = false;
  for (const [key, val] of Object.entries(defaults)) {
    if (isEmpty(existing[key])) {
      existing[key] = val;
      updated = true;
    } else if (typeof val === "object" && val !== null && !Array.isArray(val)) {
      if (!existing[key]) {
        existing[key] = {};
        updated = true;
      }

      const isMap = existing[key] instanceof Map;
      const getVal = (k) => (isMap ? existing[key].get(k) : existing[key][k]);
      const setVal = (k, v) => {
        if (isMap) {
          existing[key].set(k, v);
        } else {
          existing[key][k] = v;
        }
      };

      for (const [subKey, subVal] of Object.entries(val)) {
        if (isEmpty(getVal(subKey))) {
          setVal(subKey, subVal);
          updated = true;
        }
      }
    }
  }
  return updated;
};
