import mongoose, { Schema } from "mongoose";

const CategorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    description: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

CategorySchema.index({ name: 1 });

export const CategoryModel =
  mongoose.models.Category ||
  mongoose.model("Category", CategorySchema);
