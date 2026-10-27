import QuizAttempt from "../models/QuizAttempt.js";
import RevisionItem from "../models/RevisionItem.js";
import StudyPlan from "../models/StudyPlan.js";
import Subject from "../models/Subject.js";
import { asyncHandler } from "../utils/http.js";
import { serializeSubject } from "../utils/serializeSubject.js";
import { validateSubjectInput } from "../utils/subjectValidation.js";
import { isValidObjectId } from "../utils/validation.js";

function validationError(res, message) {
  return res.status(400).json({
    success: false,
    message,
  });
}

function notFound(res) {
  return res.status(404).json({
    success: false,
    message: "Subject not found.",
  });
}

export const listSubjects = asyncHandler(async (req, res) => {
  const subjects = await Subject.find({ owner: req.user.id }).sort({
    createdAt: -1,
  });

  return res.status(200).json({
    success: true,
    subjects: subjects.map(serializeSubject),
  });
});

export const createSubject = asyncHandler(async (req, res) => {
  const validation = validateSubjectInput(req.body);

  if (validation.error) {
    return validationError(res, validation.error);
  }

  const subject = await Subject.create({
    ...validation.data,
    owner: req.user.id,
  });

  return res.status(201).json({
    success: true,
    message: "Subject created.",
    subject: serializeSubject(subject),
  });
});

export const updateSubject = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return notFound(res);
  }

  const subject = await Subject.findOne({
    _id: req.params.id,
    owner: req.user.id,
  });

  if (!subject) {
    return notFound(res);
  }

  const validation = validateSubjectInput(req.body, { partial: true });

  if (validation.error) {
    return validationError(res, validation.error);
  }

  Object.assign(subject, validation.data);
  await subject.save();

  return res.status(200).json({
    success: true,
    message: "Subject updated.",
    subject: serializeSubject(subject),
  });
});

export const deleteSubject = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return notFound(res);
  }

  const subject = await Subject.findOne({
    _id: req.params.id,
    owner: req.user.id,
  });

  if (!subject) {
    return notFound(res);
  }

  const [studyPlanCount, quizAttemptCount, revisionItemCount] =
    await Promise.all([
      StudyPlan.countDocuments({ subject: subject._id }),
      QuizAttempt.countDocuments({ subject: subject._id }),
      RevisionItem.countDocuments({ subject: subject._id }),
    ]);

  if (studyPlanCount + quizAttemptCount + revisionItemCount > 0) {
    return res.status(409).json({
      success: false,
      message:
        "This subject is still used by a study plan, quiz, or revision item. Remove those references before deleting it.",
    });
  }

  await subject.deleteOne();

  return res.status(204).send();
});
