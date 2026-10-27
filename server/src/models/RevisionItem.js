import mongoose from "mongoose";

const { Schema } = mongoose;

const revisionItemSchema = new Schema(
  {
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    subject: {
      type: Schema.Types.ObjectId,
      ref: "Subject",
    },
    topic: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 3000,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    status: {
      type: String,
      enum: ["pending", "in_progress", "completed"],
      default: "pending",
    },
    nextReviewAt: {
      type: Date,
    },
    lastReviewedAt: {
      type: Date,
    },
    reviewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    sourcePlan: {
      type: Schema.Types.ObjectId,
      ref: "StudyPlan",
    },
    sourceTopic: {
      type: Schema.Types.ObjectId,
    },
  },
  { timestamps: true }
);

revisionItemSchema.index({ owner: 1, status: 1, nextReviewAt: 1 });
revisionItemSchema.index(
  { owner: 1, sourcePlan: 1, sourceTopic: 1 },
  {
    unique: true,
    partialFilterExpression: {
      sourcePlan: { $type: "objectId" },
      sourceTopic: { $type: "objectId" },
    },
  }
);

const RevisionItem = mongoose.model("RevisionItem", revisionItemSchema);

export default RevisionItem;
