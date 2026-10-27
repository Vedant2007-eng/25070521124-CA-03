import mongoose from "mongoose";

const { Schema } = mongoose;

const questionResultSchema = new Schema({
  questionText: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000,
  },
  options: {
    type: [{ type: String, trim: true }],
    default: [],
  },
  selectedAnswer: {
    type: String,
    trim: true,
  },
  correctAnswer: {
    type: String,
    required: true,
    trim: true,
  },
  isCorrect: {
    type: Boolean,
    required: true,
  },
  explanation: {
    type: String,
    trim: true,
    maxlength: 3000,
  },
});

const quizAttemptSchema = new Schema(
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
      trim: true,
      maxlength: 200,
    },
    quizTitle: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
    },
    quizSessionId: {
      type: String,
      trim: true,
      maxlength: 64,
    },
    questions: {
      type: [questionResultSchema],
      default: [],
    },
    totalQuestions: {
      type: Number,
      required: true,
      min: 1,
    },
    correctAnswers: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator(value) {
          return (
            !Number.isFinite(this.totalQuestions) ||
            value <= this.totalQuestions
          );
        },
        message: "Correct answers cannot exceed total questions.",
      },
    },
    scorePercentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    timeTakenSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },
    completedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

quizAttemptSchema.index({ owner: 1, completedAt: -1 });
quizAttemptSchema.index(
  { owner: 1, quizSessionId: 1 },
  { unique: true, sparse: true }
);

const QuizAttempt = mongoose.model("QuizAttempt", quizAttemptSchema);

export default QuizAttempt;
