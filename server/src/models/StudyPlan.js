import mongoose from "mongoose";

const { Schema } = mongoose;

const topicSchema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  description: {
    type: String,
    trim: true,
    maxlength: 2000,
  },
  completed: {
    type: Boolean,
    default: false,
  },
  estimatedMinutes: {
    type: Number,
    default: 30,
    min: 1,
  },
  order: {
    type: Number,
    default: 0,
    min: 0,
  },
});

const scheduledTopicSchema = new Schema(
  {
    topicId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    minutes: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  { _id: false }
);

const scheduleDaySchema = new Schema(
  {
    date: {
      type: Date,
      required: true,
    },
    totalMinutes: {
      type: Number,
      required: true,
      min: 1,
    },
    topics: {
      type: [scheduledTopicSchema],
      default: [],
    },
  },
  { _id: false }
);

const studyPlanSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
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
    examDate: {
      type: Date,
    },
    dailyStudyHours: {
      type: Number,
      required: true,
      min: 0.5,
      max: 24,
    },
    topics: {
      type: [topicSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ["active", "completed", "paused"],
      default: "active",
    },
    schedule: {
      type: [scheduleDaySchema],
      default: [],
    },
    generationKey: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

studyPlanSchema.index(
  { owner: 1, generationKey: 1 },
  { unique: true, sparse: true }
);

const StudyPlan = mongoose.model("StudyPlan", studyPlanSchema);

export default StudyPlan;
