/**
 * Settings services.
 * This module groups configuration-related services that read from AppSetting.
 */
import bootstrapService from "./bootstrapService.js";

const settingsService = Object.freeze({
  bootstrapService,
});

export default settingsService;

export { bootstrapService };
