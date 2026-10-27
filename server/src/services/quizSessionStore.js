import { randomUUID } from "node:crypto";
import { getQuizSettings } from "../config/quiz.js";

export class QuizSessionStore {
  constructor({
    ttlMs = getQuizSettings().sessionTtlMs,
    cleanupIntervalMs = 60000,
    now = Date.now,
  } = {}) {
    this.ttlMs = ttlMs;
    this.now = now;
    this.sessions = new Map();
    this.cleanupIntervalMs = cleanupIntervalMs;
    this.cleanupTimer = setInterval(
      () => this.cleanup(),
      this.cleanupIntervalMs
    );
    this.cleanupTimer.unref?.();
  }

  create(data) {
    const startedAt = this.now();
    const id = randomUUID();
    const session = {
      ...data,
      id,
      ownerId: String(data.ownerId),
      status: "active",
      startedAt,
      expiresAt: startedAt + this.ttlMs,
      submittedAttemptId: null,
    };

    this.sessions.set(id, session);
    return session;
  }

  get(id) {
    const session = this.sessions.get(id);

    if (!session) {
      return null;
    }

    if (this.isExpired(session)) {
      this.sessions.delete(id);
      return null;
    }

    return session;
  }

  getForOwner(id, ownerId) {
    const session = this.get(id);

    if (!session || session.ownerId !== String(ownerId)) {
      return null;
    }

    return session;
  }

  beginSubmission(id, ownerId) {
    const session = this.getForOwner(id, ownerId);

    if (!session) {
      return { status: "missing" };
    }

    if (session.status !== "active") {
      return { status: "duplicate" };
    }

    session.status = "submitting";
    return { status: "ready", session };
  }

  releaseSubmission(id) {
    const session = this.sessions.get(id);

    if (session?.status === "submitting") {
      session.status = "active";
    }
  }

  complete(id, attemptId) {
    const session = this.sessions.get(id);

    if (session) {
      session.status = "completed";
      session.submittedAttemptId = String(attemptId);
    }
  }

  delete(id) {
    this.sessions.delete(id);
  }

  isExpired(session) {
    return this.now() >= session.expiresAt;
  }

  cleanup() {
    for (const [id, session] of this.sessions) {
      if (this.isExpired(session)) {
        this.sessions.delete(id);
      }
    }
  }

  clear() {
    this.sessions.clear();
  }
}

export const quizSessionStore = new QuizSessionStore();
