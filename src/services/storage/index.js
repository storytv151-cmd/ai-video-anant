import digitalOceanSpaces from "./digitalOceanSpaces.js";
import cleanupService from "./cleanupService.js";
import imageProcessingService from "./imageProcessingService.js";
import signedUrlService from "./signedUrlService.js";
import storageService from "./storageService.js";
import storageValidationService from "./storageValidationService.js";
import uploadService from "./uploadService.js";
import videoStorageService from "./videoStorageService.js";

export default storageService;

export {
  storageService,
  uploadService,
  imageProcessingService,
  videoStorageService,
  storageValidationService,
  signedUrlService,
  cleanupService,
  digitalOceanSpaces,
};
