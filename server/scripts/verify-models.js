import assert from "node:assert/strict";
import mongoose from "mongoose";
import {
  User,
  Subject,
  StudyPlan,
  QuizAttempt,
  RevisionItem,
} from "../src/models/index.js";

const results = [];

function check(name, callback) {
  try {
    callback();
    results.push({ name, passed: true });
    console.log(`PASS  ${name}`);
  } catch (error) {
    results.push({ name, passed: false, error });
    console.error(`FAIL  ${name}`);
    console.error(`      ${error.message}`);
  }
}

function getPath(model, field) {
  const schemaPath = model.schema.path(field);
  assert.ok(schemaPath, `${model.modelName}.${field} must exist.`);
  return schemaPath;
}

function getSubPath(model, arrayField, field) {
  const arrayPath = getPath(model, arrayField);
  assert.ok(
    arrayPath.schema,
    `${model.modelName}.${arrayField} must be an embedded document array.`
  );

  const subPath = arrayPath.schema.path(field);
  assert.ok(
    subPath,
    `${model.modelName}.${arrayField}.${field} must exist.`
  );
  return subPath;
}

function expectRequired(model, field) {
  const schemaPath = getPath(model, field);
  assert.equal(
    schemaPath.isRequired,
    true,
    `${model.modelName}.${field} must be required.`
  );
  return schemaPath;
}

function expectReference(model, field, reference) {
  const schemaPath = expectRequired(model, field);
  assert.equal(schemaPath.instance, "ObjectId");
  assert.equal(
    schemaPath.options.ref,
    reference,
    `${model.modelName}.${field} must reference ${reference}.`
  );
  return schemaPath;
}

function expectTimestamps(model) {
  assert.equal(
    model.schema.options.timestamps,
    true,
    `${model.modelName} must enable timestamps.`
  );
}

function getErrors(document) {
  const validationError = document.validateSync();
  assert.ok(validationError, "Expected document validation to fail.");
  return validationError.errors;
}

const models = { User, Subject, StudyPlan, QuizAttempt, RevisionItem };

for (const [name, model] of Object.entries(models)) {
  check(`${name} is registered with Mongoose`, () => {
    assert.ok(mongoose.models[name], `${name} is not registered.`);
    assert.equal(model.modelName, name);
    assert.ok(model.schema instanceof mongoose.Schema);
  });

  check(`${name} enables timestamps`, () => {
    expectTimestamps(model);
  });
}

const expectedFields = {
  User: [
    "name",
    "email",
    "password",
    "educationLevel",
    "examTarget",
    "dailyStudyHours",
    "preferredStudyTime",
    "createdAt",
    "updatedAt",
  ],
  Subject: [
    "name",
    "description",
    "owner",
    "color",
    "createdAt",
    "updatedAt",
  ],
  StudyPlan: [
    "title",
    "description",
    "owner",
    "subject",
    "examDate",
    "dailyStudyHours",
    "topics",
    "status",
    "schedule",
    "generationKey",
    "createdAt",
    "updatedAt",
  ],
  QuizAttempt: [
    "owner",
    "subject",
    "topic",
    "quizTitle",
    "difficulty",
    "quizSessionId",
    "questions",
    "totalQuestions",
    "correctAnswers",
    "scorePercentage",
    "timeTakenSeconds",
    "completedAt",
    "createdAt",
    "updatedAt",
  ],
  RevisionItem: [
    "owner",
    "subject",
    "topic",
    "notes",
    "priority",
    "status",
    "nextReviewAt",
    "lastReviewedAt",
    "reviewCount",
    "sourcePlan",
    "sourceTopic",
    "createdAt",
    "updatedAt",
  ],
};

for (const [name, fields] of Object.entries(expectedFields)) {
  check(`${name} defines all expected fields`, () => {
    for (const field of fields) {
      getPath(models[name], field);
    }
  });
}

check("User required fields and email normalization", () => {
  const namePath = expectRequired(User, "name");
  const emailPath = expectRequired(User, "email");

  assert.equal(namePath.instance, "String");
  assert.equal(emailPath.instance, "String");
  assert.equal(emailPath.options.unique, true);
  assert.equal(emailPath.options.lowercase, true);
  assert.equal(emailPath.options.trim, true);

  const user = new User({
    name: "  Schema Check  ",
    email: "STUDENT@EXAMPLE.COM",
    password: "not-a-real-secret",
  });

  assert.equal(user.name, "Schema Check");
  assert.equal(user.email, "student@example.com");
  assert.equal(user.dailyStudyHours, 2);
  assert.equal(user.toJSON().password, undefined);

  const errors = getErrors(new User({}));
  assert.ok(errors.name);
  assert.ok(errors.email);
  assert.ok(errors.password);
});

check("User password is excluded and numeric limits are valid", () => {
  const passwordPath = expectRequired(User, "password");
  const studyHoursPath = getPath(User, "dailyStudyHours");

  assert.equal(passwordPath.options.select, false);
  assert.equal(studyHoursPath.options.default, 2);
  assert.equal(studyHoursPath.options.min, 0.5);
  assert.equal(studyHoursPath.options.max, 24);
});

check("Subject owner relationship and validation", () => {
  const ownerPath = expectReference(Subject, "owner", "User");
  const namePath = expectRequired(Subject, "name");

  assert.equal(ownerPath.options.index, true);
  assert.equal(namePath.options.trim, true);

  const errors = getErrors(new Subject({}));
  assert.ok(errors.name);
  assert.ok(errors.owner);
});

check("StudyPlan owner and subject relationships", () => {
  const ownerPath = expectReference(StudyPlan, "owner", "User");
  const subjectPath = getPath(StudyPlan, "subject");

  assert.equal(ownerPath.options.index, true);
  assert.equal(subjectPath.options.ref, "Subject");
});

check("StudyPlan fields, status, and defaults", () => {
  const dailyHoursPath = expectRequired(StudyPlan, "dailyStudyHours");
  const statusPath = getPath(StudyPlan, "status");

  assert.equal(dailyHoursPath.options.min, 0.5);
  assert.equal(dailyHoursPath.options.max, 24);
  assert.deepEqual(statusPath.enumValues, ["active", "completed", "paused"]);
  assert.equal(statusPath.options.default, "active");

  const plan = new StudyPlan({
    title: "Schema check",
    owner: new mongoose.Types.ObjectId(),
    dailyStudyHours: 2,
  });

  assert.equal(plan.status, "active");
  assert.deepEqual(plan.topics, []);
  assert.deepEqual(plan.schedule, []);

  const invalidPlan = new StudyPlan({
    title: "Schema check",
    owner: new mongoose.Types.ObjectId(),
    dailyStudyHours: 2,
    status: "archived",
  });

  assert.ok(getErrors(invalidPlan).status);
});

check("StudyPlan embedded topic schema", () => {
  const topicsPath = getPath(StudyPlan, "topics");
  assert.ok(topicsPath.schema, "StudyPlan.topics must be embedded.");

  assert.equal(
    StudyPlan.schema.path("topics").schema.path("title").isRequired,
    true
  );
  assert.equal(
    getSubPath(StudyPlan, "topics", "completed").options.default,
    false
  );
  assert.equal(
    getSubPath(StudyPlan, "topics", "estimatedMinutes").options.default,
    30
  );
  assert.equal(
    getSubPath(StudyPlan, "topics", "estimatedMinutes").options.min,
    1
  );
  assert.equal(getSubPath(StudyPlan, "topics", "order").options.default, 0);
  assert.equal(getSubPath(StudyPlan, "topics", "order").options.min, 0);
});

check("StudyPlan persisted schedule schema", () => {
  const schedulePath = getPath(StudyPlan, "schedule");
  assert.ok(schedulePath.schema, "StudyPlan.schedule must be embedded.");

  assert.equal(
    getSubPath(StudyPlan, "schedule", "date").isRequired,
    true
  );
  assert.equal(
    getSubPath(StudyPlan, "schedule", "totalMinutes").isRequired,
    true
  );
  assert.equal(
    getSubPath(StudyPlan, "schedule", "topics").instance,
    "Array"
  );

  const scheduleDaySchema = schedulePath.schema;
  const scheduledTopicPath = scheduleDaySchema.path("topics");
  assert.ok(scheduledTopicPath.schema);
  assert.equal(
    scheduledTopicPath.schema.path("topicId").isRequired,
    true
  );
  assert.equal(
    scheduledTopicPath.schema.path("minutes").isRequired,
    true
  );
});

check("StudyPlan generation key is unique per owner", () => {
  getPath(StudyPlan, "generationKey");

  const generationIndex = StudyPlan.schema
    .indexes()
    .find(
      ([fields]) =>
        fields.owner === 1 && fields.generationKey === 1
    );

  assert.ok(generationIndex, "StudyPlan generation index must exist.");
  assert.equal(generationIndex[1].unique, true);
  assert.equal(generationIndex[1].sparse, true);
});

check("QuizAttempt owner relationship and numeric validation", () => {
  const ownerPath = expectReference(QuizAttempt, "owner", "User");
  assert.equal(ownerPath.options.index, true);

  assert.equal(expectRequired(QuizAttempt, "quizTitle").instance, "String");
  assert.equal(expectRequired(QuizAttempt, "totalQuestions").options.min, 1);
  assert.equal(expectRequired(QuizAttempt, "correctAnswers").options.min, 0);
  assert.equal(getPath(QuizAttempt, "scorePercentage").options.min, 0);
  assert.equal(getPath(QuizAttempt, "scorePercentage").options.max, 100);
  assert.equal(getPath(QuizAttempt, "timeTakenSeconds").options.default, 0);
  assert.equal(getPath(QuizAttempt, "timeTakenSeconds").options.min, 0);
});

check("QuizAttempt difficulty and session uniqueness", () => {
  const difficultyPath = getPath(QuizAttempt, "difficulty");
  getPath(QuizAttempt, "quizSessionId");

  assert.deepEqual(difficultyPath.enumValues, [
    "easy",
    "medium",
    "hard",
  ]);

  const sessionIndex = QuizAttempt.schema
    .indexes()
    .find(
      ([fields]) =>
        fields.owner === 1 && fields.quizSessionId === 1
    );

  assert.ok(sessionIndex, "QuizAttempt session index must exist.");
  assert.equal(sessionIndex[1].unique, true);
  assert.equal(sessionIndex[1].sparse, true);
});

check("QuizAttempt embedded question schema", () => {
  const questionsPath = getPath(QuizAttempt, "questions");
  assert.ok(questionsPath.schema, "QuizAttempt.questions must be embedded.");

  assert.equal(
    getSubPath(QuizAttempt, "questions", "questionText").isRequired,
    true
  );
  assert.equal(
    getSubPath(QuizAttempt, "questions", "correctAnswer").isRequired,
    true
  );
  assert.equal(
    getSubPath(QuizAttempt, "questions", "isCorrect").isRequired,
    true
  );
  assert.equal(getSubPath(QuizAttempt, "questions", "options").instance, "Array");
});

check("QuizAttempt defaults and answer consistency", () => {
  const owner = new mongoose.Types.ObjectId();
  const attempt = new QuizAttempt({
    owner,
    quizTitle: "Schema check",
    totalQuestions: 2,
    correctAnswers: 1,
    scorePercentage: 50,
  });

  assert.equal(attempt.timeTakenSeconds, 0);
  assert.ok(attempt.completedAt instanceof Date);
  assert.deepEqual(attempt.questions, []);

  const invalidAttempt = new QuizAttempt({
    owner,
    quizTitle: "Schema check",
    totalQuestions: 2,
    correctAnswers: 3,
    scorePercentage: 100,
  });

  assert.ok(getErrors(invalidAttempt).correctAnswers);
});

check("RevisionItem relationships, enums, and defaults", () => {
  const ownerPath = expectReference(RevisionItem, "owner", "User");
  const subjectPath = getPath(RevisionItem, "subject");
  const priorityPath = getPath(RevisionItem, "priority");
  const statusPath = getPath(RevisionItem, "status");
  const reviewCountPath = getPath(RevisionItem, "reviewCount");

  assert.equal(ownerPath.options.index, true);
  assert.equal(subjectPath.options.ref, "Subject");
  assert.deepEqual(priorityPath.enumValues, ["low", "medium", "high"]);
  assert.deepEqual(statusPath.enumValues, [
    "pending",
    "in_progress",
    "completed",
  ]);
  assert.equal(priorityPath.options.default, "medium");
  assert.equal(statusPath.options.default, "pending");
  assert.equal(reviewCountPath.options.default, 0);
  assert.equal(reviewCountPath.options.min, 0);

  const revisionItem = new RevisionItem({
    owner: new mongoose.Types.ObjectId(),
    topic: "Schema check",
  });

  assert.equal(revisionItem.priority, "medium");
  assert.equal(revisionItem.status, "pending");
  assert.equal(revisionItem.reviewCount, 0);

  const errors = getErrors(new RevisionItem({}));
  assert.ok(errors.owner);
  assert.ok(errors.topic);
});

check("RevisionItem scheduling and source import indexes", () => {
  assert.equal(
    getPath(RevisionItem, "sourcePlan").options.ref,
    "StudyPlan"
  );
  getPath(RevisionItem, "sourceTopic");

  const indexes = RevisionItem.schema.indexes();
  const schedulingIndex = indexes.find(
    ([fields]) =>
      fields.owner === 1 &&
      fields.status === 1 &&
      fields.nextReviewAt === 1
  );
  const importIndex = indexes.find(
    ([fields]) =>
      fields.owner === 1 &&
      fields.sourcePlan === 1 &&
      fields.sourceTopic === 1
  );

  assert.ok(
    schedulingIndex,
    "RevisionItem scheduling lookup index must exist."
  );
  assert.ok(importIndex, "RevisionItem source-topic index must exist.");
  assert.equal(importIndex[1].unique, true);
  assert.equal(
    importIndex[1].partialFilterExpression.sourcePlan.$type,
    "objectId"
  );
  assert.equal(
    importIndex[1].partialFilterExpression.sourceTopic.$type,
    "objectId"
  );
});

check("All owner-based models expose owner indexes", () => {
  for (const model of [Subject, StudyPlan, QuizAttempt, RevisionItem]) {
    assert.equal(
      getPath(model, "owner").options.index,
      true,
      `${model.modelName}.owner must be indexed.`
    );
  }
});

const failures = results.filter((result) => !result.passed);

console.log(
  `\n${results.length - failures.length}/${results.length} model checks passed.`
);
console.log(
  `MongoDB connection opened during verification: ${
    mongoose.connection.readyState === 0 ? "no" : "yes"
  }.`
);

if (failures.length > 0) {
  console.error(`${failures.length} model check(s) failed.`);
  process.exitCode = 1;
} else {
  console.log("All model schemas registered and validated successfully.");
}
