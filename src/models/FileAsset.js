import mongoose from 'mongoose';
import { createBaseSchema } from './base.schema.js';

const { Schema } = mongoose;

const fileAssetSchema = createBaseSchema({
  owner: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true,
  },
  ownerType: {
    type: String,
    trim: true,
    maxlength: 50,
    default: 'User',
    index: true,
  },
  storageKey: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1024,
    index: true,
  },
  bucket: {
    type: String,
    required: true,
    trim: true,
    maxlength: 255,
    index: true,
  },
  folder: {
    type: String,
    required: true,
    trim: true,
    maxlength: 255,
    index: true,
  },
  publicUrl: {
    type: String,
    trim: true,
    maxlength: 2048,
    default: null,
  },
  mimeType: {
    type: String,
    trim: true,
    maxlength: 120,
    default: null,
    index: true,
  },
  fileType: {
    type: String,
    trim: true,
    maxlength: 30,
    default: 'other',
    index: true,
  },
  extension: {
    type: String,
    trim: true,
    maxlength: 20,
    default: null,
  },
  sizeInBytes: {
    type: Number,
    default: 0,
    min: 0,
    index: true,
  },
  width: {
    type: Number,
    default: null,
    min: 0,
  },
  height: {
    type: Number,
    default: null,
    min: 0,
  },
  durationSeconds: {
    type: Number,
    default: null,
    min: 0,
  },
  checksum: {
    type: String,
    trim: true,
    maxlength: 200,
    default: null,
    index: true,
  },
  status: {
    type: String,
    enum: ['Temporary', 'Uploaded', 'Processing', 'Ready', 'Deleted', 'Failed', 'Archived'],
    default: 'Uploaded',
    index: true,
  },
  metadata: {
    type: Map,
    of: Schema.Types.Mixed,
    default: {},
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true,
  },
  deletedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true,
  },
});

fileAssetSchema.index({ owner: 1, status: 1, createdAt: -1 });
fileAssetSchema.index({ bucket: 1, folder: 1, createdAt: -1 });
fileAssetSchema.index({ status: 1, createdAt: -1 });
fileAssetSchema.index({ storageKey: 1 }, { unique: true, name: 'uniq_file_asset_storage_key' });

const FileAssetModel = mongoose.models.FileAsset || mongoose.model('FileAsset', fileAssetSchema);

export default FileAssetModel;

