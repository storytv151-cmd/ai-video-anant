/**
 * TemplateCategory model.
 * Purpose: categorizes reusable video templates for browsing and discovery.
 * Relationships: parent collection for many video templates.
 * Future usage: supports merchandising, sorting, featured content, and
 * localized category presentation in dashboards or marketplaces.
 */
import mongoose from "mongoose";
import validator from "validator";
import { createBaseSchema } from "./base.schema.js";

const templateCategorySchema = createBaseSchema({
  title: {
    type: String,
    required: [true, "Category title is required."],
    trim: true,
    maxlength: 120,
  },
  slug: {
    type: String,
    required: [true, "Category slug is required."],
    trim: true,
    lowercase: true,
    maxlength: 140,
  },
  description: {
    type: String,
    trim: true,
    maxlength: 2000,
    default: null,
  },
  icon: {
    type: String,
    trim: true,
    maxlength: 255,
    default: null,
  },
  banner: {
    type: String,
    trim: true,
    default: null,
    validate: {
      validator: (value) =>
        !value || validator.isURL(value, { require_protocol: true }),
      message: "Banner must be a valid URL.",
    },
  },
  sortOrder: {
    type: Number,
    default: 0,
    min: 0,
  },
  featured: {
    type: Boolean,
    default: false,
    index: true,
  },
  status: {
    type: String,
    enum: ["draft", "active", "inactive", "archived"],
    default: "active",
    index: true,
  },
});

templateCategorySchema.index(
  { slug: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
    name: "uniq_template_category_slug_active",
  },
);
templateCategorySchema.index({ featured: 1, status: 1, sortOrder: 1 });
templateCategorySchema.index({ title: 1 });
templateCategorySchema.index({ status: 1, sortOrder: 1, createdAt: -1 });

templateCategorySchema.virtual("templates", {
  ref: "VideoTemplate",
  localField: "_id",
  foreignField: "category",
});

const TemplateCategoryModel =
  mongoose.models.TemplateCategory ||
  mongoose.model("TemplateCategory", templateCategorySchema);

export default TemplateCategoryModel;
