import mongoose from "mongoose";
import { createBaseSchema } from "./base.schema.js";

const { Schema } = mongoose;

const auditTargetSchema = new Schema(
  {
    type: { type: String, trim: true, maxlength: 80, default: null },
    id: { type: Schema.Types.ObjectId, default: null },
  },
  { _id: false },
);

const auditActorSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["user", "admin", "system"],
      default: "system",
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    device: {
      type: Schema.Types.ObjectId,
      ref: "UserDevice",
      default: null,
      index: true,
    },
  },
  { _id: false },
);

const auditLogSchema = createBaseSchema({
  actor: { type: auditActorSchema, default: () => ({}) },
  action: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120,
    index: true,
  },
  target: { type: auditTargetSchema, default: () => ({}) },
  requestId: {
    type: String,
    trim: true,
    maxlength: 64,
    default: null,
    index: true,
  },
  ip: { type: String, trim: true, maxlength: 64, default: null, index: true },
  userAgent: { type: String, trim: true, maxlength: 300, default: null },
  path: { type: String, trim: true, maxlength: 300, default: null },
  method: { type: String, trim: true, maxlength: 20, default: null },
  metadata: { type: Map, of: Schema.Types.Mixed, default: {} },
});

auditLogSchema.index({ "actor.user": 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ "target.type": 1, "target.id": 1, createdAt: -1 });

const AuditLogModel =
  mongoose.models.AuditLog || mongoose.model("AuditLog", auditLogSchema);

export default AuditLogModel;
