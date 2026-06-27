/**
 * Reusable base schema helper for all MongoDB models.
 * It standardizes timestamps, soft-delete fields, serialization behavior, and
 * a few common query helpers for production-ready model definitions.
 *
 * Soft-delete behavior:
 * Normal queries automatically exclude soft-deleted documents (isDeleted=true).
 * Admin or audit queries can explicitly include deleted documents by using:
 *   Model.find().withDeleted()
 * or by adding an explicit isDeleted filter.
 */
import mongoose from "mongoose";

const { Schema } = mongoose;

const baseSchemaFields = Object.freeze({
  isDeleted: {
    type: Boolean,
    default: false,
    index: true,
  },
  deletedAt: {
    type: Date,
    default: null,
  },
});

const defaultTransform = (document, returnedObject) => {
  returnedObject.id = returnedObject._id.toString();
  return returnedObject;
};

const shouldBypassSoftDeleteFilter = (mongooseQuery) => {
  const options = mongooseQuery.getOptions?.() || {};
  if (options.withDeleted === true) {
    return true;
  }

  const filter = mongooseQuery.getFilter?.() || {};
  if (Object.prototype.hasOwnProperty.call(filter, "isDeleted")) {
    return true;
  }

  return false;
};

const createBaseSchema = (definition, options = {}) => {
  const schema = new Schema(
    {
      ...definition,
      ...baseSchemaFields,
    },
    {
      timestamps: true,
      versionKey: false,
      minimize: false,
      optimisticConcurrency: false,
      toJSON: {
        virtuals: true,
        transform: defaultTransform,
      },
      toObject: {
        virtuals: true,
        transform: defaultTransform,
      },
      ...options,
    },
  );

  schema.index({ isDeleted: 1, createdAt: -1 });

  schema.query.withDeleted = function withDeleted() {
    return this.setOptions({ withDeleted: true });
  };

  schema.query.active = function active() {
    return this.where({ isDeleted: false });
  };

  schema.query.deleted = function deleted() {
    return this.where({ isDeleted: true });
  };

  schema.pre(
    /^(find|findOne|findOneAndUpdate|findOneAndReplace|findOneAndDelete|countDocuments)$/,
    function applySoftDeleteFilter(next) {
      if (!shouldBypassSoftDeleteFilter(this)) {
        this.where({ isDeleted: false });
      }
      next();
    },
  );

  schema.pre("aggregate", function applySoftDeleteFilterToAggregate(next) {
    if (this.options?.withDeleted === true) {
      next();
      return;
    }

    const pipeline = this.pipeline();
    const alreadyFiltersIsDeleted = pipeline.some(
      (stage) =>
        stage?.$match &&
        Object.prototype.hasOwnProperty.call(stage.$match, "isDeleted"),
    );

    if (!alreadyFiltersIsDeleted) {
      pipeline.unshift({ $match: { isDeleted: false } });
    }

    next();
  });

  schema.methods.softDelete = async function softDelete() {
    this.isDeleted = true;
    this.deletedAt = new Date();
    return this.save();
  };

  schema.methods.restore = async function restore() {
    this.isDeleted = false;
    this.deletedAt = null;
    return this.save();
  };

  schema.statics.findActive = function findActive(filter = {}) {
    return this.find({ ...filter, isDeleted: false });
  };

  schema.statics.findDeleted = function findDeleted(filter = {}) {
    return this.find({ ...filter, isDeleted: true });
  };

  return schema;
};

export { createBaseSchema, baseSchemaFields };
