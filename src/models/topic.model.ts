import mongoose, { Schema, Document } from "mongoose";

export interface ITopic extends Document {
  title: string;
  description: string;
  level: "beginner" | "intermediate" | "advanced";
  category: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const topicSchema = new Schema<ITopic>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    level: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      required: true,
    },
    category: { type: String },
    createdBy: { type: String },
  },
  { timestamps: true }
);

export const Topic = mongoose.model<ITopic>("Topic", topicSchema);
