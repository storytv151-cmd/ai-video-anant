/**
 * Bootstrap request validator.
 * The bootstrap endpoint is a GET request and currently has no required inputs.
 * This validator exists to keep validation architecture consistent and future-ready.
 */
const buildResult = ({ valid = true, message = "", errors = [] } = {}) => ({
  valid,
  message,
  errors,
});

const validateBootstrap = async () => buildResult({ valid: true });

const bootstrapValidator = Object.freeze({ validateBootstrap });

export default bootstrapValidator;
