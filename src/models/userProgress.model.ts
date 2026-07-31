import mongoose, { Schema, Document } from "mongoose";

export interface IUserProgress extends Document {
  userId: string;
  totalPracticeMinutes: number;
  totalSessions: number;
  averageScore: number;
  weakAreas: string[];
  currentLevel: "beginner" | "intermediate" | "advanced";
  lastPracticedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userProgressSchema = new Schema<IUserProgress>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    totalPracticeMinutes: { type: Number, default: 0 },
    totalSessions: { type: Number, default: 0 },
    averageScore: { type: Number, default: 0 },
    weakAreas: [{ type: String }],
    currentLevel: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      default: "beginner",
    },
    lastPracticedAt: { type: Date },
  },
  { timestamps: true }
);

export const UserProgress = mongoose.model<IUserProgress>(
  "UserProgress",
  userProgressSchema
);
