import mongoose, { Schema, Document } from "mongoose";

interface ITranscriptEntry {
  role: "user" | "ai";
  text: string;
  timestamp: Date;
}

export interface IPracticeSession extends Document {
  userId: string;
  topic: string;
  level: "beginner" | "intermediate" | "advanced";
  transcript: ITranscriptEntry[];
  summary: string;
  score: number;
  mistakes: string[];
  focusArea?: string;
  createdAt: Date;
}

const practiceSessionSchema = new Schema<IPracticeSession>(
  {
    userId: { type: String, required: true, index: true },
    topic: { type: String, required: true },
    level: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      required: true,
    },
    transcript: [
      {
        role: { type: String, enum: ["user", "ai"], required: true },
        text: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    summary: { type: String },
    score: { type: Number, min: 0, max: 10 },
    mistakes: [{ type: String }],
    focusArea: { type: String },
  },
  { timestamps: true }
);

// TTL index on createdAt, expires after 30 days
practiceSessionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export const PracticeSession = mongoose.model<IPracticeSession>(
  "PracticeSession",
  practiceSessionSchema
);
