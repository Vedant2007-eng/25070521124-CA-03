import {
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Analytics from "../src/pages/Analytics";
import { getAnalyticsOverview } from "../src/services/api";

vi.mock("../src/services/api", () => ({
  getAnalyticsOverview: vi.fn(),
}));

function makeAnalytics(overrides = {}) {
  const base = {
    studyPlans: {
      total: 3,
      active: 1,
      paused: 1,
      completed: 1,
      totalTopics: 8,
      completedTopics: 5,
      completionPercentage: 63,
      estimatedMinutes: 480,
      remainingMinutes: 180,
      upcoming: [
        {
          id: "plan-1",
          title: "Physics finals",
          examDate: "2026-12-10T00:00:00.000Z",
          totalTopics: 4,
          completedTopics: 3,
          completionPercentage: 75,
        },
      ],
    },
    quizzes: {
      totalAttempts: 3,
      averageScore: 67,
      highestScore: 90,
      latestScore: 90,
      correctAnswers: 20,
      totalQuestions: 30,
      accuracyPercentage: 67,
      trend: [
        {
          id: "quiz-1",
          title: "Mechanics quiz",
          scorePercentage: 50,
          completedAt: "2026-10-24T09:00:00.000Z",
        },
        {
          id: "quiz-2",
          title: "Mechanics quiz",
          scorePercentage: 90,
          completedAt: "2026-10-27T09:00:00.000Z",
        },
      ],
    },
    revisions: {
      total: 6,
      pending: 2,
      inProgress: 1,
      active: 3,
      dueToday: 1,
      overdue: 1,
      upcoming: 1,
      unscheduled: 0,
      completed: 3,
      completionPercentage: 50,
      totalReviews: 12,
      reminders: {
        overdue: [
          {
            id: "revision-overdue",
            topic: "Cell respiration",
            priority: "high",
            status: "pending",
            reviewCount: 2,
          },
        ],
        dueToday: [
          {
            id: "revision-today",
            topic: "Photosynthesis",
            priority: "medium",
            status: "pending",
            reviewCount: 1,
          },
        ],
        upcoming: [],
      },
      priorityBreakdown: { low: 2, medium: 3, high: 1 },
    },
    overall: {
      studyCompletionPercentage: 63,
      quizAverageScore: 67,
      revisionCompletionPercentage: 50,
      trackedRecords: 12,
    },
    subjectPerformance: [
      {
        id: "subject-physics",
        name: "Physics",
        color: "#38bdf8",
        plans: {
          total: 2,
          totalTopics: 6,
          completedTopics: 4,
          completionPercentage: 67,
          estimatedMinutes: 360,
          remainingMinutes: 120,
        },
        quizzes: {
          attempts: 3,
          averageScore: 67,
          highestScore: 90,
          correctAnswers: 20,
          totalQuestions: 30,
          accuracyPercentage: 67,
        },
        hasQuizData: true,
      },
      {
        id: "subject-math",
        name: "Mathematics",
        color: "#a78bfa",
        plans: {
          total: 1,
          totalTopics: 2,
          completedTopics: 1,
          completionPercentage: 50,
          estimatedMinutes: 120,
          remainingMinutes: 60,
        },
        quizzes: {
          attempts: 0,
          averageScore: 0,
          highestScore: 0,
          correctAnswers: 0,
          totalQuestions: 0,
          accuracyPercentage: 0,
        },
        hasQuizData: false,
      },
    ],
    topicPerformance: [
      {
        topic: "Algebra",
        attempts: 2,
        averageScore: 55,
        highestScore: 60,
        correctAnswers: 5,
        totalQuestions: 10,
        accuracyPercentage: 50,
      },
      {
        topic: "Mechanics",
        attempts: 3,
        averageScore: 75,
        highestScore: 90,
        correctAnswers: 15,
        totalQuestions: 20,
        accuracyPercentage: 75,
      },
    ],
    recentQuizzes: [
      {
        id: "quiz-2",
        title: "Mechanics quiz",
        topic: "Mechanics",
        difficulty: "medium",
        subjectId: "subject-physics",
        scorePercentage: 90,
        correctAnswers: 9,
        totalQuestions: 10,
        completedAt: "2026-10-27T09:00:00.000Z",
      },
    ],
    recentActivity: [],
  };

  return {
    ...base,
    ...overrides,
    studyPlans: { ...base.studyPlans, ...(overrides.studyPlans || {}) },
    quizzes: { ...base.quizzes, ...(overrides.quizzes || {}) },
    revisions: {
      ...base.revisions,
      ...(overrides.revisions || {}),
      reminders: {
        ...base.revisions.reminders,
        ...(overrides.revisions?.reminders || {}),
      },
      priorityBreakdown: {
        ...base.revisions.priorityBreakdown,
        ...(overrides.revisions?.priorityBreakdown || {}),
      },
    },
    overall: { ...base.overall, ...(overrides.overall || {}) },
    subjectPerformance:
      overrides.subjectPerformance || base.subjectPerformance,
    topicPerformance:
      overrides.topicPerformance || base.topicPerformance,
    recentQuizzes: overrides.recentQuizzes || base.recentQuizzes,
    recentActivity: overrides.recentActivity || base.recentActivity,
  };
}

function emptyAnalytics() {
  return makeAnalytics({
    studyPlans: {
      total: 0,
      active: 0,
      paused: 0,
      completed: 0,
      totalTopics: 0,
      completedTopics: 0,
      completionPercentage: 0,
      estimatedMinutes: 0,
      remainingMinutes: 0,
      upcoming: [],
    },
    quizzes: {
      totalAttempts: 0,
      averageScore: 0,
      highestScore: 0,
      latestScore: null,
      correctAnswers: 0,
      totalQuestions: 0,
      accuracyPercentage: 0,
      trend: [],
    },
    revisions: {
      total: 0,
      pending: 0,
      inProgress: 0,
      active: 0,
      dueToday: 0,
      overdue: 0,
      upcoming: 0,
      unscheduled: 0,
      completed: 0,
      completionPercentage: 0,
      totalReviews: 0,
      reminders: { overdue: [], dueToday: [], upcoming: [] },
      priorityBreakdown: { low: 0, medium: 0, high: 0 },
    },
    overall: {
      studyCompletionPercentage: 0,
      quizAverageScore: 0,
      revisionCompletionPercentage: 0,
      trackedRecords: 0,
    },
    subjectPerformance: [],
    topicPerformance: [],
    recentQuizzes: [],
    recentActivity: [],
  });
}

function renderAnalytics() {
  return render(
    <MemoryRouter>
      <Analytics />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  getAnalyticsOverview.mockResolvedValue({
    data: makeAnalytics(),
  });
});

describe("analytics page", () => {
  it("shows a loading state and then an honest empty state", async () => {
    let resolveAnalytics;

    getAnalyticsOverview.mockReturnValue(
      new Promise((resolve) => {
        resolveAnalytics = resolve;
      })
    );

    renderAnalytics();

    expect(screen.getByText("Building your analytics")).toBeTruthy();
    expect(
      screen.getByText(
        "Reading your plans, quiz attempts, and revision progress."
      )
    ).toBeTruthy();

    resolveAnalytics({ data: emptyAnalytics() });

    expect(
      await screen.findByText(
        "Your analytics start with your first study action"
      )
    ).toBeTruthy();
    expect(
      screen.getByText(/No sample scores are used/)
    ).toBeTruthy();
    expect(screen.queryByText("Average quiz score")).toBeNull();
    expect(screen.queryByText("Score trend")).toBeNull();
  });

  it("renders plan, quiz, subject, topic, and revision analytics", async () => {
    renderAnalytics();

    expect(
      await screen.findByRole("heading", { name: "Plan progress" })
    ).toBeTruthy();
    expect(screen.getAllByText("63%").length).toBeGreaterThan(0);
    expect(screen.getByText("8h planned")).toBeTruthy();
    expect(screen.getByText("Physics finals")).toBeTruthy();
    expect(
      screen.getByText("Dec 10, 2026")
    ).toBeTruthy();

    expect(
      screen.getByRole("img", {
        name: "Quiz score trend across 2 attempts",
      })
    ).toBeTruthy();
    expect(screen.getByText("Trend average: 70%")).toBeTruthy();

    const physicsCard = screen
      .getByText("Physics", { selector: "strong" })
      .closest("article");
    expect(within(physicsCard).getByText("Quiz data")).toBeTruthy();
    expect(within(physicsCard).getAllByText("67%").length).toBeGreaterThan(0);
    expect(
      within(physicsCard).getByText(/4\/6 topics/)
    ).toBeTruthy();

    const algebraTopic = screen.getByText("Algebra").closest("li");
    expect(within(algebraTopic).getByText("55%")).toBeTruthy();
    expect(
      within(algebraTopic).getByText(/2 attempts/)
    ).toBeTruthy();

    const overdueReminder = screen
      .getByText("Cell respiration")
      .closest("li");
    expect(
      within(overdueReminder).getByText("Overdue · high priority")
    ).toBeTruthy();
    expect(within(overdueReminder).getByText("2 reviews")).toBeTruthy();
    expect(screen.getByText("1 high")).toBeTruthy();

    const quizRow = screen.getByText("Mechanics quiz").closest("tr");
    expect(within(quizRow).getByText("Physics")).toBeTruthy();
    expect(within(quizRow).getByText("90%")).toBeTruthy();
    expect(within(quizRow).getByText("9/10")).toBeTruthy();
  });

  it("shows topic performance only from the backend threshold data", async () => {
    getAnalyticsOverview.mockResolvedValue({
      data: makeAnalytics({
        topicPerformance: [],
      }),
    });

    renderAnalytics();

    expect(await screen.findByText("Topic performance")).toBeTruthy();
    expect(
      screen.getByText(/Complete at least two quizzes on the same topic/)
    ).toBeTruthy();
  });

  it("shows an analytics error and retries successfully", async () => {
    const user = userEvent.setup();

    getAnalyticsOverview.mockRejectedValueOnce({
      response: { data: { message: "Analytics service unavailable" } },
    });

    renderAnalytics();

    expect(
      await screen.findByText("Analytics unavailable")
    ).toBeTruthy();
    expect(
      screen.getByText("Analytics service unavailable")
    ).toBeTruthy();

    getAnalyticsOverview.mockResolvedValue({
      data: makeAnalytics(),
    });
    await user.click(screen.getByRole("button", { name: "Try again" }));

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Plan progress" })
      ).toBeTruthy();
    });
  });

  it("renders a single-attempt trend without dividing by zero", async () => {
    getAnalyticsOverview.mockResolvedValue({
      data: makeAnalytics({
        quizzes: {
          totalAttempts: 1,
          averageScore: 80,
          highestScore: 80,
          latestScore: 80,
          correctAnswers: 4,
          totalQuestions: 5,
          accuracyPercentage: 80,
          trend: [
            {
              id: "quiz-single",
              title: "Single quiz",
              scorePercentage: 80,
              completedAt: "2026-10-27T09:00:00.000Z",
            },
          ],
        },
        recentQuizzes: [],
      }),
    });

    renderAnalytics();

    expect(
      await screen.findByRole("img", {
        name: "Quiz score trend across 1 attempt",
      })
    ).toBeTruthy();
    expect(screen.getByText("Trend average: 80%")).toBeTruthy();
    expect(
      screen.getByText("Complete a quiz to see your latest results here.")
    ).toBeTruthy();
  });
});
