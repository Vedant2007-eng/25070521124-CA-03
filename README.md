# PrepPilot AI

**PrepPilot AI - Personalized Exam Preparation Platform** is a college mini-project that brings subjects, study planning, AI-powered quizzes, revision scheduling, and performance tracking into one focused workspace.

The repository contains the completed Prompt 1-8 build: application foundation, database layer, authentication, personalized study planner, AI quiz workflow, smart revision planner, performance analytics and dashboard, and the final integration, security-hardening, UI-polish, and deployment-readiness pass:

- Working React/Vite frontend with all application routes and the responsive EdTech design.
- Express/Mongoose backend with environment-based configuration and health diagnostics.
- Five Mongoose models with validation and user-specific relationships.
- Secure registration, login, current-user lookup, JWT middleware, and protected frontend routing.
- Authenticated subject and study-plan CRUD, topic progress, and deterministic schedule generation.
- A functional planner workspace and dashboard driven by real saved planner data.
- Server-side Groq quiz generation, protected in-memory quiz sessions, server grading, persisted attempts, paginated history, and a functional quiz workspace.
- Authenticated revision CRUD, deterministic spaced scheduling, review tracking, duplicate-safe study-plan imports, due-item views, revision summary metrics, and a functional revision workspace.
- Authenticated analytics for plans, quiz scores, subject performance, topic performance, revision workload, and recent activity.
- A personalized dashboard and a full analytics page driven entirely by the authenticated user's saved data.
- Backend authentication/planner/quiz/revision/analytics integration tests and frontend planner/dashboard/quiz/revision/analytics tests.
- Final UI copy and navigation polish, duplicate-submit protection across forms and quiz/revision actions, API security headers, per-IP authentication rate limiting, and deployment guidance.

Authentication, subjects, study plans, AI quiz generation, revision scheduling, and performance analytics are functional.

## Project status

| Area | Status |
| --- | --- |
| React + Vite app and routing | Implemented |
| Responsive premium UI shell | Implemented |
| Home page | Implemented |
| Login and registration pages | Implemented with the live API |
| Protected application pages | Implemented |
| In-memory authentication context and logout | Implemented |
| Express API, CORS, JSON parsing | Implemented |
| MongoDB connection helper | Implemented |
| MongoDB Compass inspection workflow | Documented |
| `GET /api/health` with database diagnostics | Implemented |
| User, Subject, StudyPlan, QuizAttempt, and RevisionItem models | Implemented |
| Model schema verification | Implemented |
| Secure registration and login | Implemented |
| JWT authentication middleware | Implemented |
| Current-user endpoint | Implemented |
| Backend authentication/security/planner/quiz/revision/analytics tests | Implemented |
| Frontend planner, dashboard, quiz, revision, analytics, route-guard, context, and API tests | Implemented |
| Subject CRUD API and subject management UI | Implemented |
| Study-plan CRUD, embedded topics, and topic progress | Implemented |
| Deterministic study-schedule generation | Implemented |
| Live planner metrics on the dashboard | Implemented |
| AI quiz generation with Groq | Implemented, requires a server-side API key |
| Protected quiz sessions and server-side grading | Implemented |
| Persisted quiz attempts and paginated history | Implemented |
| Functional quiz generation, attempt, results, and history UI | Implemented |
| Revision CRUD and review tracking | Implemented |
| Deterministic spaced-review scheduling | Implemented |
| Duplicate-safe revision import from study plans | Implemented |
| Functional revision workspace and due-item views | Implemented |
| Live revision metrics on the dashboard | Implemented |
| Performance analytics APIs and pages | Implemented |
| Personalized dashboard with live analytics | Implemented |
| Duplicate-submit protection for forms, quizzes, and revision actions | Implemented |
| API security headers and per-IP auth rate limiting | Implemented |
| Final UI copy, navigation, responsive, and accessibility polish | Implemented |
| Deployment-readiness documentation and clean dependency audits | Implemented |
| Token refresh and persistent sessions | Not part of this phase |

No test users, sample student results, or simulated AI output are committed. Tests use temporary records in dedicated test databases and remove only the records they create.

## Implemented study-planner features

- **Subjects** - create, edit, and safely delete user-owned subjects with an optional description and color.
- **Study plans** - save exam dates, daily study hours, status, and ordered topics with per-topic time estimates.
- **Schedules** - deterministically distribute topics across available days without scheduling after the exam.
- **Progress** - mark topics complete and see plan and dashboard completion metrics recalculate immediately.
- **Dashboard** - show live plan counts, active plans, completed topics, completion rate, and upcoming exam dates.

## Implemented AI quiz features

- **Generate** - create 1-20 multiple-choice questions for any topic, optional subject, difficulty, and bounded extra focus.
- **Protected answer key** - generated questions sent to the browser never include correct answers or explanations.
- **Server grading** - submitted answers are checked against the in-memory quiz session and stored as one `QuizAttempt`.
- **Results** - review the selected answer, correct answer, and explanation for every question.
- **History** - paginated, newest-first attempt summaries scoped to the authenticated user.
- **Failure handling** - missing provider configuration, timeouts, provider outages, invalid AI payloads, expired sessions, and duplicate submissions return safe errors without fabricated questions.

## Implemented revision features

- **Create and manage** - save revision topics with optional notes, subject, priority, status, and an initial review date.
- **Spaced scheduling** - review intervals follow `1`, `3`, `7`, `14`, then `30` days using server-side UTC dates.
- **Reviews** - record a review, increment its count, recalculate the next date, and mark a topic mastered to complete it.
- **Due queue** - list overdue, due-today, and upcoming revisions, then filter the workspace by status, priority, subject, and timing.
- **Summary metrics** - report total, pending, in-progress, active, due-today, overdue, upcoming, completed, and completion percentage values.
- **Study-plan import** - create revision items from a plan's topics without changing the source plan; repeat imports skip topics that already have revision items.
- **Ownership and validation** - every record is scoped to the authenticated user, and review dates, counts, and owners cannot be set by the browser.

## Implemented analytics features

- **Overview** - one authenticated snapshot combining plan completion, quiz average and accuracy, revision mastery, tracked records, recent activity, priorities, and the next exam.
- **Plan progress** - per-plan topic completion, remaining estimated study time, status, and exam date, with subject details when available.
- **Quiz performance** - unweighted average score, overall accuracy, attempt totals, latest quiz results, and a chronological score trend for the latest 30 attempts.
- **Subject performance** - subject-level plan progress, quiz averages, attempt counts, and activity badges, joined safely without exposing other users' records.
- **Topic performance** - per-topic quiz scores and accuracy, shown only after at least two attempts so a single result is not presented as a trend.
- **Revision workload** - active, due-today, overdue, upcoming, unscheduled, completed, mastery percentage, reminders, review counts, and priority breakdown.
- **Personalized dashboard** - greets the signed-in user by first name and uses only live overview data, with honest loading, empty, and retry states.
- **Analytics page** - includes an accessible SVG score-trend chart, subject cards, topic understanding list, revision priorities, latest results, and metric definitions.

## Final integration and hardening

- **Copy and navigation** - landing, sidebar, footer, auth, and not-found copy now describe the complete application; the public Features link uses client-side routing and hash scrolling instead of a full page reload that would clear the in-memory session.
- **Duplicate submissions** - login, registration, planner, subject, revision, quiz generation, quiz submission, and study-plan import actions use synchronous ref locks in addition to disabled buttons, protecting rapid double-clicks before React re-renders.
- **API hardening** - responses set `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, and `Cache-Control: no-store`. `x-powered-by` remains disabled.
- **Auth rate limiting** - registration and login are limited per IP with HTTP `429`, `Retry-After`, and rate-limit headers. Limits are configurable with `AUTH_RATE_LIMIT` and `AUTH_RATE_WINDOW_MINUTES`.
- **Existing protections preserved** - bcrypt cost 12, generic invalid-credential responses, dummy-password timing mitigation, strict JWT claims, owner-scoped queries, server-side answer keys, duplicate quiz-submission protection, CORS allowlisting, and a 1 MB JSON limit.
- **Dependency audit** - production server dependencies and all client dependencies report zero known vulnerabilities at the time of the final pass.

## Technology stack

**Frontend**

- React 18
- Vite 8
- JavaScript and JSX
- React Router DOM 7
- Axios
- Plain responsive CSS with glass-style cards and reduced-motion support
- Vitest, Testing Library, and jsdom as development-only test tools

**Backend**

- Node.js
- Express 4
- MongoDB
- Mongoose 8
- CORS
- dotenv
- bcryptjs for password hashing
- jsonwebtoken for signed access tokens
- Groq Chat Completions through Node's built-in `fetch` for AI quiz generation
- Node's built-in test runner for API and security tests

No Next.js, TypeScript, Tailwind CSS, Firebase, Supabase, SQL database, or Python backend is used.

## Authentication endpoints

All authentication routes use the `/api/auth` prefix.

| Method | Endpoint | Authentication | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | Public | Create an account and return a JWT |
| `POST` | `/api/auth/login` | Public | Verify credentials and return a JWT |
| `GET` | `/api/auth/me` | Bearer JWT | Return the authenticated user |

### Register

```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "Ada Lovelace",
  "email": "ada@example.com",
  "password": "SecurePass123!"
}
```

The backend also accepts the optional profile fields already supported by the User model: `educationLevel`, `examTarget`, `dailyStudyHours`, and `preferredStudyTime`.

Successful response: HTTP `201`.

```json
{
  "success": true,
  "message": "Account created.",
  "token": "<jwt>",
  "user": {
    "id": "<user-id>",
    "name": "Ada Lovelace",
    "email": "ada@example.com",
    "dailyStudyHours": 2,
    "createdAt": "<timestamp>",
    "updatedAt": "<timestamp>"
  }
}
```

Duplicate emails return HTTP `409`, including duplicate-key races. Invalid input returns HTTP `400`. Passwords must be at least 8 characters, cannot be only whitespace, and must fit bcrypt's 72-byte input limit. Only the password hash is stored.

### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "ada@example.com",
  "password": "SecurePass123!"
}
```

Successful response: HTTP `200`, with the same safe `user` shape and a JWT. Unknown emails and incorrect passwords both return HTTP `401` with the same message: `Invalid email or password.`

### Current user

```http
GET /api/auth/me
Authorization: Bearer <jwt>
```

Successful response: HTTP `200`.

```json
{
  "success": true,
  "user": {
    "id": "<user-id>",
    "name": "Ada Lovelace",
    "email": "ada@example.com",
    "dailyStudyHours": 2,
    "createdAt": "<timestamp>",
    "updatedAt": "<timestamp>"
  }
}
```

Missing, malformed, invalid, expired, or user-less tokens return HTTP `401`. The token subject is the only identity source; user IDs in request bodies, query strings, or route parameters are never trusted for authentication.

## Subject and study-plan endpoints

Every route below requires `Authorization: Bearer <jwt>`. Records are always queried by the authenticated user ID from the token. Invalid IDs and records owned by another user return HTTP `404` so one account cannot discover another account's data.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/subjects` | List the current user's subjects |
| `POST` | `/api/subjects` | Create a subject |
| `PUT` | `/api/subjects/:id` | Update a subject |
| `DELETE` | `/api/subjects/:id` | Delete an unreferenced subject |
| `GET` | `/api/study-plans` | List the current user's plans with subject details |
| `POST` | `/api/study-plans` | Create a plan without generating a schedule |
| `PUT` | `/api/study-plans/:id` | Update plan fields or replace its ordered topics |
| `DELETE` | `/api/study-plans/:id` | Delete a plan |
| `POST` | `/api/study-plans/generate` | Validate, generate, and save a new scheduled plan |
| `POST` | `/api/study-plans/:id/generate` | Generate or regenerate the schedule for an existing plan |
| `PATCH` | `/api/study-plans/:id/topics/:topicId` | Mark one topic complete or incomplete |

### Subject payload

```http
POST /api/subjects
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "name": "Physics",
  "description": "Mechanics and waves",
  "color": "#38bdf8"
}
```

`name` is required and limited to 120 characters. `description` and `color` are optional. Subject updates accept any supplied subset of those fields, but an empty update is rejected.

A subject cannot be deleted while any study plan, quiz attempt, or revision item still references it. The API returns HTTP `409` instead of deleting related records. Delete or reassign those records first.

### Study-plan payload

```http
POST /api/study-plans/generate
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "title": "Physics final revision",
  "description": "Cover mechanics before the exam",
  "subject": "<subject-id>",
  "examDate": "2026-12-10",
  "dailyStudyHours": 2,
  "status": "active",
  "topics": [
    { "title": "Kinematics", "estimatedMinutes": 60 },
    { "title": "Forces", "estimatedMinutes": 45 },
    { "title": "Waves", "estimatedMinutes": 30 }
  ]
}
```

- `title` is required and limited to 200 characters.
- `dailyStudyHours` is required and must be between `0.5` and `24`.
- `examDate` uses `YYYY-MM-DD` and is stored as a UTC calendar date.
- `subject` is optional; it must belong to the authenticated user.
- `status` is `active`, `paused`, or `completed`.
- Each topic requires a title. `estimatedMinutes` must be a whole number from `1` to `1440` and defaults to `30`.
- New topics omit `id`. When updating an existing plan, topic IDs returned by the API preserve the topic's identity.
- Unknown fields and client-supplied owner values are ignored.

Successful responses include `{ "success": true, "plan": { ... } }`. A plan contains `topics`, persisted `schedule` days, and a computed `progress` object with `totalTopics`, `completedTopics`, and `completionPercentage`.

### Schedule rules

Schedule generation is deterministic and does not use AI.

1. The available window is today through the exam date, inclusive.
2. Each day has `dailyStudyHours * 60` study minutes.
3. Topics are scheduled sequentially in their saved display order and may split across days.
4. No schedule day is created after the exam date.
5. All topics are included when a schedule is generated; completion state changes progress but not the time allocation.
6. Insufficient capacity returns HTTP `422` with `reason: "insufficient_time"` and a `feasibility` object containing available days, required days, daily minutes, total minutes, and the deficit.
7. A past exam returns HTTP `400` with `reason: "exam_date_past"`. A missing exam date, missing topics, or invalid values also return HTTP `400`.
8. Failed generation does not save a plan.

Changing a plan's exam date, daily study hours, or topics clears its saved schedule and generation key so stale sessions cannot be shown. Generate the schedule again after those edits.

Generated plans store a hash of the normalized request as `generationKey`. Repeating the same generate request for the same user returns the existing plan with HTTP `200` and `duplicate: true` instead of creating a duplicate. Manual plan creation is not deduplicated.

### Topic progress

```http
PATCH /api/study-plans/<plan-id>/topics/<topic-id>
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "completed": true
}
```

Only the `completed` boolean is accepted. The response returns the full updated plan so progress percentages and dashboard metrics stay consistent.

## AI quiz endpoints

Every quiz route requires `Authorization: Bearer <jwt>`. The authenticated user's ID is the only accepted owner; client-supplied owner, score, correctness, and answer-key fields are rejected.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/quizzes/generate` | Generate a quiz and create a short-lived in-memory session |
| `POST` | `/api/quizzes/:quizId/submit` | Grade all answers, persist one attempt, and return results |
| `GET` | `/api/quizzes/history` | List the current user's completed attempts, newest first |

### Generate a quiz

```http
POST /api/quizzes/generate
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "subjectId": "<optional-subject-id>",
  "topic": "Quadratic equations",
  "difficulty": "medium",
  "numberOfQuestions": 5,
  "questionType": "mcq",
  "additionalInstructions": "Focus on word problems."
}
```

- `topic` is required and limited to 200 characters.
- `difficulty` is `easy`, `medium`, or `hard`.
- `numberOfQuestions` must be a whole number from `1` to `20`.
- `questionType` defaults to `mcq`; unsupported question types are rejected.
- `subjectId` is optional and must belong to the authenticated user.
- `additionalInstructions` is optional and limited to 800 characters.
- Unknown request fields, including `owner`, are rejected.
- Generation is rate-limited per user. The default is 10 requests per 10 minutes using `QUIZ_GENERATION_RATE_LIMIT` and `QUIZ_GENERATION_RATE_WINDOW_MINUTES`.

Successful response: HTTP `200`.

```json
{
  "success": true,
  "message": "Quiz generated.",
  "quiz": {
    "id": "<quiz-session-uuid>",
    "topic": "Quadratic equations",
    "difficulty": "medium",
    "questionCount": 5,
    "subject": null,
    "expiresAt": "<timestamp>",
    "questions": [
      {
        "number": 1,
        "questionText": "Which expression is a quadratic?",
        "options": ["Option A", "Option B", "Option C", "Option D"]
      }
    ]
  }
}
```

The response intentionally does **not** contain `correctAnswer`, `explanation`, or correctness flags. Generation does not write a `QuizAttempt`; the answer key is held only in the server process until submission or expiry.

### Submit a quiz

```http
POST /api/quizzes/<quiz-session-uuid>/submit
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "answers": [
    { "questionIndex": 0, "selectedAnswer": "Option B" },
    { "questionIndex": 1, "selectedAnswer": "Option A" }
  ]
}
```

Every question must be answered exactly once, each index must be valid, and each selection must be one of that question's four options. The server derives correctness, score, completion time, owner, subject, and quiz metadata rather than trusting the client.

Successful response: HTTP `201`.

```json
{
  "success": true,
  "message": "Quiz submitted.",
  "attempt": {
    "id": "<attempt-id>",
    "title": "Quadratic equations · Medium quiz",
    "topic": "Quadratic equations",
    "difficulty": "medium",
    "subject": null,
    "scorePercentage": 80,
    "correctAnswers": 4,
    "totalQuestions": 5,
    "timeTakenSeconds": 122,
    "completedAt": "<timestamp>",
    "questions": [
      {
        "questionText": "Which expression is a quadratic?",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "selectedAnswer": "Option B",
        "correctAnswer": "Option B",
        "isCorrect": true,
        "explanation": "The highest power is two."
      }
    ]
  }
}
```

Missing, expired, or another user's quiz sessions return HTTP `404`. Repeating a submission returns HTTP `409` and never creates a second attempt.

### Quiz history

```http
GET /api/quizzes/history?page=1&limit=5
Authorization: Bearer <jwt>
```

`page` defaults to `1`. `limit` defaults to `10` and is capped at `50`. Both must be whole numbers. Attempts are sorted by `completedAt` descending and include summary fields such as title, topic, difficulty, subject, score, correct answers, total questions, time taken, and completion date. Full answer reviews are returned only by the submit response.

```json
{
  "success": true,
  "attempts": [],
  "pagination": {
    "page": 1,
    "limit": 5,
    "total": 0,
    "totalPages": 0
  }
}
```

### AI configuration and session behavior

- `GROQ_API_KEY` is server-only and must never be placed in `client/.env`, browser code, API responses, or logs.
- `GROQ_MODEL` selects the Groq model. The example uses `openai/gpt-oss-120b`; choose an available model for your account.
- If the key is missing, generation returns HTTP `503` with `reason: "ai_not_configured"`. No fallback or hardcoded questions are generated.
- Provider timeouts, authentication failures, rate limits, outages, malformed JSON, wrong question counts, duplicate options, missing explanations, and invalid correct answers are rejected safely.
- Learner topic and additional instructions are treated as untrusted prompt content and cannot change the required response schema or expose server secrets.
- Quiz sessions live in backend memory for 30 minutes by default (`QUIZ_SESSION_TTL_MINUTES`). A backend restart discards active sessions; submitted attempts remain in MongoDB. Redis is intentionally not used.
- Expired sessions are cleaned from memory and return a safe HTTP `404` if submitted later.

## Revision endpoints

Every route below requires `Authorization: Bearer <jwt>`. Revision records are always queried by the authenticated user ID from the token. Invalid IDs and records owned by another user return HTTP `404`. Review dates and counts are managed by the server.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/revisions` | List the current user's revision items |
| `POST` | `/api/revisions` | Create a revision item and schedule its first review |
| `GET` | `/api/revisions/today` | List active items due today or overdue |
| `GET` | `/api/revisions/summary` | Return revision status and timing totals |
| `POST` | `/api/revisions/from-study-plan/:planId` | Import a study plan's topics |
| `GET` | `/api/revisions/:id` | Return one revision item |
| `PUT` | `/api/revisions/:id` | Update editable revision fields |
| `DELETE` | `/api/revisions/:id` | Delete a revision item |
| `PATCH` | `/api/revisions/:id/review` | Record a review or mark the item mastered |

### Revision payload

```http
POST /api/revisions
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "topic": "Quadratic equations",
  "notes": "Revisit the discriminant and word problems.",
  "priority": "high",
  "status": "pending",
  "subject": "<optional-subject-id>"
}
```

- `topic` is required and limited to 200 characters.
- `notes` is optional and limited to 3,000 characters.
- `priority` is `low`, `medium`, or `high` and defaults to `medium`.
- `status` is `pending`, `in_progress`, or `completed` and defaults to `pending`.
- `subject` is optional and must belong to the authenticated user.
- Unknown fields are rejected, including client-supplied `owner`, `nextReviewAt`, `lastReviewedAt`, and `reviewCount`.
- Creation sets `nextReviewAt` one day ahead and `reviewCount` to `0`. A successful create returns HTTP `201` with `{ "success": true, "revision": { ... } }`.

`PUT /api/revisions/:id` accepts any non-empty subset of the editable fields above. Editing does not automatically reschedule a review; the schedule changes only when a review is recorded.

### Review payload

```http
PATCH /api/revisions/<revision-id>/review
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "mastered": false
}
```

Only `mastered` is accepted. It is optional and defaults to `false`. A review increments `reviewCount`, sets `lastReviewedAt` to the current server time, and schedules the next review. `mastered: true` changes the status to `completed`; otherwise the status becomes `in_progress`. Completed items cannot be reviewed again and return HTTP `409` with `reason: "revision_completed"`.

| Completed reviews | Days until next review |
| --- | --- |
| `0` (initial schedule) | `1` |
| `1` | `3` |
| `2` | `7` |
| `3` | `14` |
| `4` or more | `30` |

Due-today and upcoming classification uses UTC calendar days. Overdue items have a review date before the start of the current UTC day.

### Due items and summary

```http
GET /api/revisions/today
GET /api/revisions/summary
```

`/today` returns active items whose `nextReviewAt` is before the start of the next UTC day, which includes overdue and due-today items. `/summary` returns totals for `total`, `pending`, `inProgress`, `active`, `dueToday`, `overdue`, `upcoming`, `completed`, and `completionPercentage`.

### Import from a study plan

```http
POST /api/revisions/from-study-plan/<plan-id>
Authorization: Bearer <jwt>
```

The plan must belong to the authenticated user and contain at least one valid topic. Each topic becomes a `pending`, `medium`-priority revision item with the plan's subject, the topic description as notes, and an initial review one day ahead. The source plan is not modified.

Imports use the unique `{ owner, sourcePlan, sourceTopic }` index with upserts, so repeating an import does not duplicate topics. The response includes `created` and `skipped` counts. A fully repeated import returns HTTP `200`; an import that creates at least one item returns HTTP `201`.

## Analytics endpoints

Every route below requires `Authorization: Bearer <jwt>`. Analytics queries derive the owner from the verified token and never trust user IDs in the query string. Missing subjects or plans referenced by older records are handled without leaking another user's data or failing the response.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/analytics/overview` | Combined dashboard and analytics snapshot |
| `GET` | `/api/analytics/quizzes` | Paginated completed quiz attempts with subject details |
| `GET` | `/api/analytics/subjects` | Subject-level plan and quiz performance |
| `GET` | `/api/analytics/revisions` | Revision workload, reminders, and priority breakdown |

### Overview

```http
GET /api/analytics/overview
Authorization: Bearer <jwt>
```

The response contains `studyPlans`, `quizzes`, `revisions`, `overall`, `subjectPerformance`, `topicPerformance`, `recentQuizzes`, `recentActivity`, and `meta.generatedAt`. All values are calculated from the authenticated user's persisted records.

- `plans.total`, `active`, `paused`, `completed`, `topics`, `completedTopics`, `completionPercentage`, `remainingMinutes`, and `items` describe study-plan progress.
- `quizzes.totalAttempts`, `averageScore`, `accuracyPercentage`, `correctAnswers`, `totalQuestions`, `latestAttempt`, `scoreTrend`, `strongestSubject`, and `needsPracticeSubject` describe quiz performance.
- `subjects` includes plan progress and quiz averages for each subject with saved activity.
- `topics` includes only topics with at least `2` completed quiz attempts.
- `revisions` includes status counts, timing counts, mastery, reminders, and a `priorityBreakdown`.
- `recentActivity` merges recent plan creation/completion, quiz completions, and revision reviews in newest-first order.
- `studyPlans.upcoming` is sorted by exam date; the nearest future exam is `studyPlans.upcoming[0]`.

### Metric rules

- Quiz averages use the unweighted mean of persisted `scorePercentage` values and are rounded to whole percentages.
- Accuracy uses `correctAnswers / totalQuestions`, rounded, and is zero-safe when no questions exist.
- Attempts with a `completedAt` later than the request time are excluded.
- The score trend uses the latest `30` completed attempts and returns them in chronological order.
- Today means `[start of current UTC day, start of next UTC day)`. Overdue revisions are before today; upcoming revisions are at or after the next UTC day.
- Topic performance requires `TOPIC_MINIMUM_ATTEMPTS = 2`.
- Revision mastery is the completed percentage of all revision items; no sample scores or fallback metrics are used.

### Quiz pagination

```http
GET /api/analytics/quizzes?page=1&limit=10
Authorization: Bearer <jwt>
```

`page` defaults to `1` and must be a positive integer. `limit` defaults to `10` and must be an integer from `1` to `50`. Decimal or zero values and unsupported query parameters are rejected with HTTP `400`. Results are newest first and include safe subject details when the subject still exists.

The analytics implementation adds no database schema changes or new indexes. Existing owner-scoped indexes are sufficient for the current query shapes.

## Authentication security

- Passwords are hashed with bcryptjs using 12 salt rounds before storage.
- Password hashes are excluded from safe user responses and from the User model's default JSON output.
- Emails are trimmed and normalized to lowercase before lookup or storage.
- Registration validates field types, field lengths, email format, and optional profile values.
- Duplicate email races are handled through both checks and MongoDB's unique index.
- Login uses the same generic 401 response for unknown users and wrong passwords.
- Login performs a bcrypt comparison even when the email is unknown to reduce obvious timing differences.
- JWTs are signed with HS256, an explicit 1-hour expiration, and fixed issuer and audience values.
- Token verification requires the expected algorithm, issuer, audience, and unexpired `exp`.
- The token contains only the user ID in `sub` plus standard claims; it does not contain names, emails, or passwords.
- `JWT_SECRET` is read from the backend environment with no hardcoded fallback.
- Startup fails with a clear error if `JWT_SECRET` is missing, too short, or an obvious placeholder.
- Authentication middleware loads the current user from MongoDB for every protected request and exposes it as `req.user`.
- Registration cannot assign roles or administrative privileges. Only explicitly allowed profile fields are accepted.
- Registration and login use a per-IP in-memory rate limit, returning HTTP `429` with `Retry-After` after repeated attempts.
- API responses include baseline security headers and `Cache-Control: no-store`.
- Authentication responses never include password hashes, stack traces, or internal database errors.
- Passwords, tokens, and secrets are not logged.
- CORS uses `CLIENT_URL`; arbitrary browser origins do not receive an allow-origin header. Non-production development additionally accepts private-network IPv4 HTTP origins.
- No token-refresh, server-side revocation, or persistent-session system is implemented in this phase.
- Rate-limit buckets are process-local, so multi-instance deployments need a shared limiter or edge-level protection.

## In-memory token limitation

The JWT is returned in the authentication response and stored only in the React `AuthContext` and the Axios in-memory token holder. It is **not** stored in `localStorage` or `sessionStorage`.

A full page refresh clears the in-memory token, so the user must sign in again. Protected routes redirect to `/login` until a valid session exists. After signing in, the app returns the user to the protected page they originally requested when that path is safe.

## Database models

All models live in `server/src/models/` and are re-exported from `server/src/models/index.js`.

### User

Stores account identity and study preferences. Fields include `name`, a normalized unique `email`, a bcrypt `password` hash, optional education and exam details, daily study-hour preferences, and timestamps.

- The password hash is excluded from serialized JSON and is not selected by default.
- A user owns subjects, study plans, quiz attempts, and revision items.

### Subject

Represents a user-specific subject, such as "Data Structures" or "Operating Systems".

- Required `name` and `owner` reference.
- Optional description and display color.
- Subject names are not globally unique; each owner manages their own list.

### StudyPlan

Represents a preparation plan for a subject or exam.

- Belongs to one user and can optionally reference one subject.
- Includes exam date, daily study hours, and a status of `active`, `completed`, or `paused`.
- Topics are embedded documents containing title, description, completion state, estimated minutes, and display order.
- `schedule` stores generated study days with UTC dates, total minutes, and the allocated topic IDs/minutes. It defaults to an empty array.
- `generationKey` stores a deterministic hash for generated-plan duplicate protection. The compound index on `owner` and `generationKey` is unique and sparse, so manually created plans are unaffected.
- Adding these fields is backward compatible with existing plans: older records remain valid and load with an empty schedule.

### QuizAttempt

Stores a completed quiz result for future history and analytics.

- Belongs to one user and can optionally reference one subject.
- Records the quiz title, topic, difficulty, quiz-session ID, total questions, correct answers, score percentage, time taken, and completion date.
- Question results are embedded documents containing the question, options, selected and correct answers, correctness, and an optional explanation.
- The schema validates that correct answers cannot exceed total questions.
- The compound index on `owner` and `quizSessionId` is unique and sparse, protecting against duplicate persisted submissions while remaining compatible with older attempts that predate quiz sessions.

### RevisionItem

Represents a topic queued for future revision.

- Belongs to one user and can optionally reference one subject.
- Tracks topic, notes, priority, status, next and last review dates, and review count.
- Priority is `low`, `medium`, or `high`; status is `pending`, `in_progress`, or `completed`.
- Optional `sourcePlan` and `sourceTopic` references record which study-plan topic created the item.
- The compound `{ owner, status, nextReviewAt }` index supports due-item and summary queries.
- The compound `{ owner, sourcePlan, sourceTopic }` index is unique only when both source fields are ObjectIds. This prevents duplicate imports while leaving manually created and older revision items unaffected.

### Relationships

```text
User 1 --- N Subject
User 1 --- N StudyPlan --- 0..1 Subject
StudyPlan 1 --- N embedded Topic

User 1 --- N QuizAttempt --- 0..1 Subject
QuizAttempt 1 --- N embedded QuestionResult

User 1 --- N RevisionItem --- 0..1 Subject
StudyPlan 1 --- N RevisionItem (optional source)
StudyPlan Topic 1 --- 0..1 RevisionItem (optional source)
```

All owner fields are required ObjectId references and are indexed for user-scoped queries. Subject deletion is blocked with HTTP `409` while any study plan, quiz attempt, or revision item references that subject; no cascade delete is performed. Deleting a study plan does not delete its subject or its imported revision items. No endpoint exposes the complete list of users.

## Folder structure

```text
PrepPilotAI/
├── client/
│   ├── public/favicon.svg
│   ├── src/
│   │   ├── components/
│   │   │   ├── analytics/ScoreTrendChart.jsx
│   │   │   ├── planner/{PlanCard,PlanEditor,SubjectManager}.jsx
│   │   │   ├── quiz/{QuizGeneratorPanel,QuizHistory,QuizResults,QuizRunner}.jsx
│   │   │   ├── revision/{RevisionCard,RevisionEditor}.jsx
│   │   │   ├── AuthPending.jsx
│   │   │   ├── GuestRoute.jsx
│   │   │   ├── Navbar.jsx
│   │   │   ├── PageHeader.jsx
│   │   │   ├── ProtectedRoute.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   └── StatCard.jsx
│   │   ├── context/AuthContext.jsx
│   │   ├── pages/
│   │   │   ├── Analytics.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Home.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Quiz.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Revision.jsx
│   │   │   └── StudyPlanner.jsx
│   │   ├── services/api.js
│   │   ├── utils/{analytics,apiError,authRedirect,planner,quiz,revision}.js
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── test/
│   │   ├── analytics.test.jsx
│   │   ├── api.test.js
│   │   ├── authPages.test.jsx
│   │   ├── authRouting.test.jsx
│   │   ├── plannerDashboard.test.jsx
│   │   ├── quiz.test.jsx
│   │   ├── revision.test.jsx
│   │   └── setup.js
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── server/
│   ├── scripts/verify-models.js
│   ├── src/
│   │   ├── config/{auth,db,quiz}.js
│   │   ├── controllers/
│   │   │   ├── analyticsController.js
│   │   │   ├── authController.js
│   │   │   ├── quizController.js
│   │   │   ├── revisionController.js
│   │   │   ├── studyPlanController.js
│   │   │   └── subjectController.js
│   │   ├── middleware/{authenticate,authRateLimit,quizRateLimit}.js
│   │   ├── models/
│   │   │   ├── QuizAttempt.js
│   │   │   ├── RevisionItem.js
│   │   │   ├── StudyPlan.js
│   │   │   ├── Subject.js
│   │   │   ├── User.js
│   │   │   └── index.js
│   │   ├── routes/{analytics,auth,health,quizzes,revisions,studyPlans,subjects}.js
│   │   ├── services/
│   │   │   ├── analyticsService.js
│   │   │   ├── groqQuizGenerator.js
│   │   │   ├── quizSessionStore.js
│   │   │   ├── revisionScheduler.js
│   │   │   └── studyPlanner.js
│   │   ├── utils/
│   │   │   ├── analyticsValidation.js
│   │   │   ├── authValidation.js
│   │   │   ├── http.js
│   │   │   ├── quizValidation.js
│   │   │   ├── revisionValidation.js
│   │   │   ├── serializeRevision.js
│   │   │   ├── serializeStudyPlan.js
│   │   │   ├── serializeSubject.js
│   │   │   ├── serializeUser.js
│   │   │   ├── studyPlanValidation.js
│   │   │   ├── subjectValidation.js
│   │   │   ├── tokens.js
│   │   │   └── validation.js
│   │   ├── app.js
│   │   └── server.js
│   ├── test/
│   │   ├── analytics.test.js
│   │   ├── auth.test.js
│   │   ├── planner.test.js
│   │   ├── quiz.test.js
│   │   ├── revision.test.js
│   │   └── security.test.js
│   ├── .env.example
│   └── package.json
├── .gitignore
└── README.md
```

The repository root acts as the `PrepPilotAI` project folder. Planner, quiz, revision, analytics, and final-hardening files are included in the tree above.

## Prerequisites

- Node.js 20.19 or newer (Node 22+ recommended)
- npm 10 or newer
- MongoDB Community Server 6 or newer for live database features and the authentication integration tests
- MongoDB Compass, the required graphical interface for inspecting the local database

The local MongoDB service must be running before starting the backend or using Compass. On Windows, verify the **MongoDB Server (MongoDB)** service is running and that port `27017` is listening.

Model-only and security tests do not require MongoDB. The API can start without MongoDB, but the health endpoint reports the database as unavailable and auth data endpoints cannot complete.

## Installation

Install the frontend and backend dependencies from the project root:

```bash
cd client
npm install

cd ../server
npm install
```

## Environment setup

Create local environment files from the examples. Never commit a real `.env` file or expose secrets in documentation or source code.

**Frontend - `client/.env`**

```env
VITE_API_URL=http://localhost:5000
```

`VITE_API_URL` is optional. If it is unset, the client targets port `5000` on the same hostname used to open the page, so `http://localhost:5173` calls `http://localhost:5000` and `http://10.254.87.233:5173` calls `http://10.254.87.233:5000`.

**Backend - `server/.env`**

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/preppilot_ai
JWT_SECRET=replace_with_a_long_random_secret
CLIENT_URL=http://localhost:5173
AUTH_RATE_LIMIT=20
AUTH_RATE_WINDOW_MINUTES=15
# TRUST_PROXY=1
GROQ_API_KEY=replace_with_your_groq_api_key
GROQ_MODEL=openai/gpt-oss-120b
GROQ_BASE_URL=https://api.groq.com/openai/v1
GROQ_TIMEOUT_MS=30000
QUIZ_SESSION_TTL_MINUTES=30
QUIZ_GENERATION_RATE_LIMIT=10
QUIZ_GENERATION_RATE_WINDOW_MINUTES=10
```

`GROQ_API_KEY` is required for live quiz generation and must remain server-side. The API still starts without it, but generation returns a safe `503` until it is configured. `GROQ_MODEL` must name a model available to that Groq account; verify availability before changing the example default. `GROQ_TIMEOUT_MS` bounds the provider request.

Generate a strong random JWT secret locally instead of using the example placeholder:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Paste the generated value into your local `server/.env` as `JWT_SECRET`. The placeholder in `.env.example` is intentionally rejected. The backend will not start unless `JWT_SECRET` is present, at least 32 characters long, and not an obvious placeholder or repeated character.

`CLIENT_URL` controls which browser origin may call the API. It may contain a comma-separated list of trusted origins when needed. In non-production development, private-network IPv4 HTTP origins such as `http://10.254.87.233:5173` are also accepted automatically, so LAN development IP changes do not break CORS; production allows only the configured origins and loopback origins. `MONGODB_URI` credentials, if any, belong only in the local `.env` file.

`AUTH_RATE_LIMIT` and `AUTH_RATE_WINDOW_MINUTES` control the in-memory per-IP limit for registration and login. Set `TRUST_PROXY` only when the API is behind a trusted reverse proxy and the forwarded client address should be used; use the number of trusted hops or a trusted address/subnet. Leaving it unset is safest for direct connections.

## Run the development servers

Open two terminals from the project root.

**Backend**

```bash
cd server
npm run dev
```

The API starts on `http://localhost:5000` by default, or on the port configured in `PORT`.

**Frontend**

```bash
cd client
npm run dev
```

The app starts on `http://localhost:5173`.

For a production frontend build:

```bash
cd client
npm run build
npm run preview
```

## Deployment readiness

This phase prepares the project for deployment but does **not** deploy it or connect to a production database.

1. Set production `MONGODB_URI`, a strong unique `JWT_SECRET`, the exact production `CLIENT_URL`, and server-side `GROQ_API_KEY` values in the hosting environment. Never commit them.
2. Build the client with `npm run build`. Vite embeds `VITE_API_URL` at build time, so set it to the public HTTPS API URL before building.
3. Serve `client/dist` from a static host or web server. Configure SPA fallback so application routes return `index.html`; keep client-side routes such as `/dashboard` and `/analytics` working on refresh.
4. Run the API behind HTTPS. If a trusted reverse proxy terminates TLS, configure `TRUST_PROXY` so authentication rate limiting sees the real client IP.
5. Keep MongoDB reachable by the API but private from the public internet, and create a database user with only the required privileges when authentication is enabled.
6. Use a shared limiter or edge-level rate limiting if the API runs as more than one instance. Quiz sessions, auth rate-limit buckets, and quiz-generation rate limits are currently process-local.
7. Re-run `npm test` in both packages and `npm run build` in `client/` before release. No real Groq provider call is required by the test suite.

Known limitations before a production launch: JWTs are not refreshable or server-side revocable, browser sessions are memory-only across refreshes, unsubmitted quiz sessions disappear on restart or across instances, and no automated backup/monitoring or hosted deployment configuration is included.

## API and database health

Once the backend is running:

```bash
curl http://localhost:5000/api/health
```

When MongoDB is connected, the endpoint returns HTTP 200:

```json
{
  "success": true,
  "api": "running",
  "database": "connected",
  "timestamp": "2026-01-01T00:00:00.000Z",
  "service": "PrepPilot AI API",
  "uptimeSeconds": 12
}
```

When MongoDB is unavailable, the endpoint returns HTTP 503 and reports the actual Mongoose state:

```json
{
  "success": false,
  "api": "running",
  "database": "disconnected",
  "timestamp": "2026-01-01T00:00:00.000Z",
  "service": "PrepPilot AI API",
  "uptimeSeconds": 12
}
```

The timestamp is generated when the request is handled. The response never includes connection strings, credentials, stack traces, or other secrets.

## Inspect MongoDB with MongoDB Compass

MongoDB Compass is the required graphical database management interface for this project. The backend and Compass must connect to the same local MongoDB Community Server.

Default local connection details:

```text
Server:   mongodb://127.0.0.1:27017
Database: preppilot_ai
URI:      mongodb://127.0.0.1:27017/preppilot_ai
```

The default local MongoDB configuration has no authentication, so no username or password is required. Never put real credentials in the repository.

### Connect with Compass

1. Confirm the MongoDB Server service is running and the backend's `MONGODB_URI` is `mongodb://127.0.0.1:27017/preppilot_ai`.
2. Open **MongoDB Compass** from the Start Menu.
3. Select **New Connection** if the connection form is not already open.
4. Paste `mongodb://127.0.0.1:27017/preppilot_ai` into the connection string field and select **Connect**.
5. In the left sidebar, select the `preppilot_ai` database. Compass lists its collections once the application has created them: `users`, `subjects`, `studyplans`, `quizattempts`, and `revisionitems`. Empty collections may not appear until their model is initialized or a record is written.
6. Select a collection and open the **Documents** tab to inspect documents. Use the filter bar for read-only lookups, for example `{ "email": "student@example.com" }`, `{ "title": "Physics final revision" }`, `{ "quizSessionId": "<quiz-session-uuid>" }`, `{ "status": "pending" }`, or `{ "sourcePlan": ObjectId("<plan-id>") }`.
7. After creating, editing, submitting, reviewing, or deleting data, click the Compass refresh button or reselect the collection to see the latest writes. Generated schedules are embedded inside each `studyplans` document under `schedule`; submitted quiz results and their embedded question reviews live in `quizattempts`.
8. Revision records in `revisionitems` include `sourcePlan`, `sourceTopic`, `nextReviewAt`, `lastReviewedAt`, and `reviewCount`. Open the **Indexes** tab to verify the `{ owner, status, nextReviewAt }` index and the unique partial `{ owner, sourcePlan, sourceTopic }` import index. Manually created items omit the source fields and are not constrained by that unique index.
9. Generated quizzes that have not been submitted are held only in server memory and do not appear in Compass. A `quizattempts` document is created only after a successful submission.

On Windows, Compass can also be started from PowerShell with the same connection string:

```powershell
& "$env:LOCALAPPDATA\MongoDBCompass\MongoDBCompass.exe" "mongodb://127.0.0.1:27017/preppilot_ai"
```

Compass shows raw stored fields, including bcrypt password hashes when viewing User documents and owner ObjectIds in planner documents; the API never returns password hashes and never trusts client-supplied owners. Treat database access as sensitive. Avoid editing or deleting documents directly in Compass unless the data change is intentional. For verification, prefer read-only filters and refresh after backend writes.

If MongoDB is configured with authentication, add the appropriate credentials through Compass and the local `server/.env`; do not commit them.

## Tests

### Backend

From `server/`:

```bash
npm test
```

This runs:

```bash
npm run test:models
npm run test:security
npm run test:auth
npm run test:planner
npm run test:quiz
npm run test:revision
npm run test:analytics
```

- `test:models` validates all five Mongoose schemas, including the persisted schedule, generation-key index, per-user quiz-session uniqueness, revision source fields, scheduling index, and partial unique import index, without connecting to MongoDB. It currently performs 30 checks.
- `test:security` validates JWT secret policy, token claims, token verification failures, auth rate-limiter behavior, and safe startup without a secret. It currently performs 6 checks.
- `test:auth` runs 10 API integration tests for registration, validation, duplicates, password hashing, login failures, JWT failures, current-user lookup, deleted users, CORS, security headers, and safe responses.
- `test:planner` runs 8 API integration tests for subject and plan CRUD, ownership isolation, validation, malformed IDs, topic progress, deterministic scheduling, infeasible schedules, duplicate generation, and safe subject deletion.
- `test:quiz` runs 16 API and unit tests with a mocked AI provider for request validation, missing configuration, timeouts, provider failures, malformed AI output, answer-key protection, server grading, ownership isolation, duplicate and concurrent submissions, expiry, history pagination, session storage, and per-user rate limiting. No real Groq key or provider credits are required.
- `test:revision` runs 9 API and scheduling tests for authentication, ownership isolation, strict validation, scheduled dates, review progression, mastery, completed-item conflicts, due and summary metrics, safe imports, duplicate-safe reimports, and scheduler edge cases.
- `test:analytics` runs 10 API tests for authentication, empty users, plan metrics, UTC timing, quiz averages and trends, future-attempt exclusion, missing subject and plan references, topic thresholds, revision boundaries, recent-activity ordering, cross-user isolation, pagination validation, and endpoint compatibility.

Across these suites, the backend currently runs 59 API/unit checks plus 30 model-schema checks (89 total). The auth, planner, quiz, revision, and analytics integration tests need MongoDB. By default they use dedicated databases:

```text
Auth:     mongodb://127.0.0.1:27017/preppilot_ai_auth_test
Planner:  mongodb://127.0.0.1:27017/preppilot_ai_planner_test
Quiz:     mongodb://127.0.0.1:27017/preppilot_ai_quiz_test
Revision: mongodb://127.0.0.1:27017/preppilot_ai_revision_test
Analytics: mongodb://127.0.0.1:27017/preppilot_ai_analytics_test
```

To choose another test database, set `MONGODB_TEST_URI` for the test command:

```powershell
# PowerShell
$env:MONGODB_TEST_URI="mongodb://127.0.0.1:27017/preppilot_ai_planner_test"; npm test
```

```bash
# Bash
MONGODB_TEST_URI=mongodb://127.0.0.1:27017/preppilot_ai_planner_test npm test
```

The database name must include a `test` segment. Tests create uniquely named temporary users, subjects, plans, revision items, quiz attempts, and reference records, then clean up only the records they create. They never drop a database and must not be pointed at development or production data.

### Frontend

From `client/`:

```bash
npm test
```

This runs Vitest with jsdom. The 43 tests cover protected and guest route behavior, unresolved-auth rendering, login/logout state in `AuthContext`, safe post-login redirects, login and registration submissions, readable auth errors, bearer-token attachment, protected 401 handling, unrelated server-error handling, planner loading/empty/error states, real plan and schedule rendering, topic-completion updates, plan and subject creation, dashboard metrics and personalization derived from the live overview, priorities, progress, recent activity, dashboard retry behavior, quiz generator validation and failures, generated-question answer-key protection, one-question navigation, submission confirmation, graded results, expired-session handling, paginated quiz history, revision loading/empty/error states, revision creation and editing, filtering, review and mastery actions, study-plan imports, analytics loading/empty/error states, full analytics rendering, topic thresholds, and single-attempt score-trend safety.

## Available routes

| Route | Current state |
| --- | --- |
| `/` | Complete landing page |
| `/login` | Functional login; redirects authenticated users |
| `/register` | Functional registration; redirects authenticated users |
| `/dashboard` | Protected personalized dashboard with live plan, quiz, revision, priority, activity, and exam data |
| `/planner` | Protected functional subject and study-plan workspace |
| `/quiz` | Protected AI quiz generation, attempt, results, and paginated history workspace |
| `/revision` | Protected functional revision CRUD, review, filter, and study-plan import workspace |
| `/analytics` | Protected performance analytics page driven by live saved data |

Unauthenticated visits to protected routes redirect to `/login` with the requested path remembered. After login or registration, that safe path is restored; otherwise the app opens `/dashboard`.

## Notes

- The frontend and backend remain separate packages and must be started independently.
- The `.gitignore` excludes `node_modules`, build output, logs, and `.env` files while keeping `.env.example` files tracked.
- The backend currently exposes health, authentication, subject, study-plan, quiz, revision, and analytics endpoints.
- The authenticated user is available as `req.user`; every owner-scoped query filters by the token-backed user ID. Client-supplied owner IDs are ignored.
- No data is seeded and no development test users exist. Quizzes are generated only by the configured provider; tests mock the provider and never present fake AI output in the application.
- Study-plan schedule generation and revision scheduling are rule-based and deterministic. AI is used only for quiz question generation.
- Revision review dates and counts are server-managed; the browser can edit only topic, notes, priority, status, and subject, or submit a review.
- Quiz answer keys stay in server memory until submission. Backend restarts discard unsubmitted sessions and expire them without creating attempts.
- JWTs expire after 1 hour and are not refreshed in this phase.
- Browser auth sessions are intentionally memory-only, so a full browser refresh signs the user out.
- Nothing is deployed or connected to a production database.
