import mongoose from "mongoose";
import { getQuizSettings } from "../config/quiz.js";
import Subject from "../models/Subject.js";
import QuizAttempt from "../models/QuizAttempt.js";
import {
  generateQuizQuestions,
  QuizGenerationError,
} from "../services/groqQuizGenerator.js";
import { quizSessionStore } from "../services/quizSessionStore.js";
import { asyncHandler } from "../utils/http.js";
import {
  isValidQuizSessionId,
  validateHistoryQuery,
  validateQuizGenerationInput,
  validateQuizSubmissionInput,
} from "../utils/quizValidation.js";

function validationError(res, message) {
  return res.status(400).json({
    success: false,
    message,
  });
}

function sessionNotFound(res) {
  return res.status(404).json({
    success: false,
    message: "Quiz session not found or expired.",
    reason: "quiz_session_missing",
  });
}

function duplicateSubmission(res) {
  return res.status(409).json({
    success: false,
    message: "This quiz has already been submitted.",
    reason: "quiz_already_submitted",
  });
}

function createQuizTitle(topic, difficulty) {
  const label =
    difficulty.charAt(0).toUpperCase() + difficulty.slice(1);

  return `${topic} · ${label} quiz`.slice(0, 200);
}

function serializeSubject(subject) {
  if (!subject) {
    return null;
  }

  const document = subject.toObject ? subject.toObject() : subject;

  return {
    id: String(document._id ?? document.id),
    name: document.name,
    color: document.color || "",
  };
}

function serializeAttemptSubject(subject) {
  if (!subject) {
    return null;
  }

  if (subject.name) {
    return serializeSubject(subject);
  }

  return {
    id: String(subject._id ?? subject),
    name: "",
    color: "",
  };
}

function serializeAttemptSummary(attempt) {
  const document = attempt.toObject ? attempt.toObject() : attempt;

  return {
    id: String(document._id ?? document.id),
    title: document.quizTitle,
    topic: document.topic || "",
    difficulty: document.difficulty || null,
    subject: serializeAttemptSubject(document.subject),
    scorePercentage: document.scorePercentage,
    correctAnswers: document.correctAnswers,
    totalQuestions: document.totalQuestions,
    timeTakenSeconds: document.timeTakenSeconds,
    completedAt: document.completedAt,
  };
}

function serializeAttemptResult(attempt) {
  const document = attempt.toObject ? attempt.toObject() : attempt;

  return {
    ...serializeAttemptSummary(attempt),
    questions: (document.questions || []).map((question) => ({
      questionText: question.questionText,
      options: question.options,
      selectedAnswer: question.selectedAnswer,
      correctAnswer: question.correctAnswer,
      isCorrect: question.isCorrect,
      explanation: question.explanation || "",
    })),
  };
}

export const generateQuiz = asyncHandler(async (req, res) => {
  const validation = validateQuizGenerationInput(req.body);

  if (validation.error) {
    return validationError(res, validation.error);
  }

  const { data } = validation;
  let subject = null;

  if (data.subjectId) {
    subject = await Subject.findOne({
      _id: data.subjectId,
      owner: req.user.id,
    }).select("name color");

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: "Subject not found.",
      });
    }
  }

  let questions;

  try {
    questions = await generateQuizQuestions({
      topic: data.topic,
      difficulty: data.difficulty,
      numberOfQuestions: data.numberOfQuestions,
      additionalInstructions: data.additionalInstructions,
      subjectName: subject?.name,
    });
  } catch (error) {
    if (error instanceof QuizGenerationError) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
        reason: error.reason,
      });
    }

    throw error;
  }

  const session = quizSessionStore.create({
    ownerId: req.user.id,
    subjectId: subject ? String(subject._id) : null,
    subject: serializeSubject(subject),
    topic: data.topic,
    difficulty: data.difficulty,
    quizTitle: createQuizTitle(data.topic, data.difficulty),
    questions,
  });

  return res.status(200).json({
    success: true,
    message: "Quiz generated.",
    quiz: {
      id: session.id,
      topic: session.topic,
      difficulty: session.difficulty,
      questionCount: session.questions.length,
      subject: session.subject,
      expiresAt: new Date(session.expiresAt).toISOString(),
      questions: session.questions.map((question, index) => ({
        number: index + 1,
        questionText: question.questionText,
        options: question.options,
      })),
    },
  });
});

export const submitQuiz = asyncHandler(async (req, res) => {
  if (!isValidQuizSessionId(req.params.quizId)) {
    return validationError(res, "Quiz ID is invalid.");
  }

  const session = quizSessionStore.getForOwner(
    req.params.quizId,
    req.user.id
  );

  if (!session) {
    return sessionNotFound(res);
  }

  if (session.status !== "active") {
    return duplicateSubmission(res);
  }

  const validation = validateQuizSubmissionInput(
    req.body,
    session.questions.length
  );

  if (validation.error) {
    return validationError(res, validation.error);
  }

  const selectedByIndex = new Map(
    validation.data.answers.map((answer) => [
      answer.questionIndex,
      answer.selectedAnswer,
    ])
  );
  const questions = session.questions.map((question, index) => {
    const selectedAnswer = selectedByIndex.get(index);
    return {
      questionText: question.questionText,
      options: question.options,
      selectedAnswer,
      correctAnswer: question.correctAnswer,
      isCorrect: selectedAnswer === question.correctAnswer,
      explanation: question.explanation,
    };
  });
  const hasInvalidSelection = questions.some(
    (question) => !question.options.includes(question.selectedAnswer)
  );

  if (hasInvalidSelection) {
    return validationError(
      res,
      "One or more selected answers are not valid for this quiz."
    );
  }

  const submission = quizSessionStore.beginSubmission(
    session.id,
    req.user.id
  );

  if (submission.status === "missing") {
    return sessionNotFound(res);
  }

  if (submission.status === "duplicate") {
    return duplicateSubmission(res);
  }

  const correctAnswers = questions.filter(
    (question) => question.isCorrect
  ).length;
  const totalQuestions = questions.length;
  const completedAt = new Date();
  const attempt = new QuizAttempt({
    owner: req.user.id,
    subject: session.subjectId || undefined,
    topic: session.topic,
    quizTitle: session.quizTitle,
    difficulty: session.difficulty,
    quizSessionId: session.id,
    questions,
    totalQuestions,
    correctAnswers,
    scorePercentage: Math.round(
      (correctAnswers / totalQuestions) * 100
    ),
    timeTakenSeconds: Math.max(
      0,
      Math.round((completedAt.getTime() - session.startedAt) / 1000)
    ),
    completedAt,
  });

  try {
    await attempt.save();
  } catch (error) {
    if (error?.code === 11000) {
      quizSessionStore.complete(session.id, session.id);
      return duplicateSubmission(res);
    }

    quizSessionStore.releaseSubmission(session.id);

    if (error instanceof mongoose.Error.ValidationError) {
      return validationError(
        res,
        "The quiz results could not be saved. Please try again."
      );
    }

    throw error;
  }

  quizSessionStore.complete(session.id, attempt._id);

  return res.status(201).json({
    success: true,
    message: "Quiz submitted.",
    attempt: serializeAttemptResult(attempt),
  });
});

export const listQuizHistory = asyncHandler(async (req, res) => {
  const settings = getQuizSettings();
  const validation = validateHistoryQuery(
    req.query,
    settings.historyMaxLimit
  );

  if (validation.error) {
    return validationError(res, validation.error);
  }

  const { page, limit } = validation.data;
  const filter = { owner: req.user.id };
  const [attempts, total] = await Promise.all([
    QuizAttempt.find(filter)
      .sort({ completedAt: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("subject", "name color"),
    QuizAttempt.countDocuments(filter),
  ]);

  return res.status(200).json({
    success: true,
    attempts: attempts.map(serializeAttemptSummary),
    pagination: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  });
});
