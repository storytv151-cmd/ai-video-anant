/**
 * Storage configuration placeholder.
 * Object storage provider selection and adapter settings can be expanded here in a future phase.
 */
import environment from "./environment.js";

const storageConfig = Object.freeze({
  driver: "digitalocean-spaces",
  bucket: environment.integrations.digitalOceanSpaces.bucket || "",
  region: environment.integrations.digitalOceanSpaces.region || "",
  endpoint: environment.integrations.digitalOceanSpaces.endpoint || "",
  cdn: environment.integrations.digitalOceanSpaces.cdn || "",
});

export default storageConfig;
