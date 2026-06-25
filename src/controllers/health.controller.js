/**
 * Health controller exposes infrastructure-safe diagnostic endpoints.
 * It delegates response data construction to the service layer.
 */
import {
  getHealthInformation,
  getRootInformation,
  getVersionedInformation,
} from '../services/system.service.js';
import { formatSuccessResponse } from '../utils/responseFormatter.js';

const getRoot = async (request, response) => {
  const data = await getRootInformation();
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const getHealth = async (request, response) => {
  const data = await getHealthInformation();
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const getVersionedRoot = async (request, response) => {
  const data = await getVersionedInformation();
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

export { getRoot, getHealth, getVersionedRoot };
