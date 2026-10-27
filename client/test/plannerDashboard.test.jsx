import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Dashboard from "../src/pages/Dashboard";
import StudyPlanner from "../src/pages/StudyPlanner";
import {
  createStudyPlan,
  createSubject,
  deleteStudyPlan,
  deleteSubject,
  generateStudyPlan,
  generateStudyPlanSchedule,
  getAnalyticsOverview,
  getStudyPlans,
  getSubjects,
  updateStudyPlan,
  updateStudyPlanTopic,
  updateSubject,
} from "../src/services/api";

vi.mock("../src/context/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "user-1", name: "Aarav Sharma" },
    isAuthenticated: true,
  }),
}));

vi.mock("../src/services/api", () => ({
  getSubjects: vi.fn(),
  createSubject: vi.fn(),
  updateSubject: vi.fn(),
  deleteSubject: vi.fn(),
  getStudyPlans: vi.fn(),
  createStudyPlan: vi.fn(),
  updateStudyPlan: vi.fn(),
  deleteStudyPlan: vi.fn(),
  generateStudyPlan: vi.fn(),
  generateStudyPlanSchedule: vi.fn(),
  updateStudyPlanTopic: vi.fn(),
  getAnalyticsOverview: vi.fn(),
}));

const subject = {
  id: "subject-1",
  name: "Physics",
  description: "Mechanics and waves",
  color: "#38bdf8",
};

function makePlan(overrides = {}) {
  return {
    id: "plan-1",
    title: "Physics finals",
    description: "Cover the full syllabus",
    subject,
    examDate: "2026-12-10T00:00:00.000Z",
    dailyStudyHours: 2,
    status: "active",
    topics: [
      {
        id: "topic-1",
        title: "Mechanics",
        completed: true,
        estimatedMinutes: 45,
        order: 0,
      },
      {
        id: "topic-2",
        title: "Waves",
        completed: false,
        estimatedMinutes: 30,
        order: 1,
      },
    ],
    schedule: [
      {
        date: "2026-11-20T00:00:00.000Z",
        totalMinutes: 60,
        topics: [{ topicId: "topic-2", minutes: 30 }],
      },
    ],
    progress: {
      totalTopics: 2,
      completedTopics: 1,
      completionPercentage: 50,
    },
    createdAt: "2026-11-01T00:00:00.000Z",
    updatedAt: "2026-11-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeAnalytics(overrides = {}) {
  const base = {
    studyPlans: {
      total: 3,
      active: 1,
      paused: 1,
      completed: 1,
      totalTopics: 6,
      completedTopics: 3,
      completionPercentage: 50,
      estimatedMinutes: 300,
      remainingMinutes: 160,
      upcoming: [
        {
          id: "plan-1",
          title: "Physics finals",
          examDate: "2026-12-10T00:00:00.000Z",
          totalTopics: 3,
          completedTopics: 2,
          completionPercentage: 67,
        },
      ],
    },
    quizzes: {
      totalAttempts: 4,
      averageScore: 72,
      highestScore: 100,
      latestScore: 60,
      correctAnswers: 14,
      totalQuestions: 20,
      accuracyPercentage: 70,
      trend: [
        {
          id: "quiz-1",
          title: "Mechanics quiz",
          scorePercentage: 60,
          completedAt: "2026-10-27T09:00:00.000Z",
        },
      ],
    },
    revisions: {
      total: 5,
      pending: 2,
      inProgress: 1,
      active: 3,
      dueToday: 2,
      overdue: 1,
      upcoming: 2,
      unscheduled: 0,
      completed: 2,
      completionPercentage: 40,
      reminders: {
        overdue: [
          {
            id: "revision-overdue",
            topic: "Cell respiration",
            priority: "high",
            status: "pending",
          },
        ],
        dueToday: [
          {
            id: "revision-today",
            topic: "Photosynthesis",
            priority: "medium",
            status: "pending",
          },
        ],
        upcoming: [],
      },
    },
    overall: {
      studyCompletionPercentage: 50,
      quizAverageScore: 72,
      revisionCompletionPercentage: 40,
      trackedRecords: 12,
    },
    recentActivity: [
      {
        id: "revision-today",
        type: "revision",
        action: "reviewed",
        title: "Photosynthesis",
        timestamp: "2026-10-27T13:30:00.000Z",
      },
      {
        id: "quiz-1",
        type: "quiz",
        action: "completed",
        title: "Mechanics quiz",
        timestamp: "2026-10-27T09:00:00.000Z",
        scorePercentage: 60,
      },
    ],
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
    },
    overall: { ...base.overall, ...(overrides.overall || {}) },
    recentActivity:
      overrides.recentActivity || base.recentActivity,
  };
}

function renderPlanner() {
  return render(
    <MemoryRouter>
      <StudyPlanner />
    </MemoryRouter>
  );
}

function renderDashboard() {
  return render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  getSubjects.mockResolvedValue({ data: { subjects: [] } });
  getStudyPlans.mockResolvedValue({ data: { plans: [] } });
  getAnalyticsOverview.mockResolvedValue({
    data: makeAnalytics(),
  });
});

describe("study planner page", () => {
  it("shows loading and empty states from the API", async () => {
    let resolveSubjects;
    let resolvePlans;

    getSubjects.mockReturnValue(
      new Promise((resolve) => {
        resolveSubjects = resolve;
      })
    );
    getStudyPlans.mockReturnValue(
      new Promise((resolve) => {
        resolvePlans = resolve;
      })
    );

    renderPlanner();

    expect(
      screen.getByText("Loading your subjects and study plans...")
    ).toBeTruthy();

    resolveSubjects({ data: { subjects: [] } });
    resolvePlans({ data: { plans: [] } });

    expect(await screen.findByText("No study plans yet")).toBeTruthy();
    expect(
      screen.getByText("Add subjects to group related study plans.")
    ).toBeTruthy();
  });

  it("renders real plans, schedule details, and subject data", async () => {
    getSubjects.mockResolvedValue({ data: { subjects: [subject] } });
    getStudyPlans.mockResolvedValue({ data: { plans: [makePlan()] } });

    renderPlanner();

    expect(await screen.findByText("Physics finals")).toBeTruthy();
    expect(screen.getByText("50%")).toBeTruthy();
    expect(screen.getByText("1/2 topics complete")).toBeTruthy();
    expect(screen.getByText("Waves")).toBeTruthy();
    expect(screen.getByText(/Nov 20, 2026/)).toBeTruthy();
    expect(screen.getAllByText("Physics").length).toBeGreaterThan(0);
    expect(
      screen.queryByText("The planner arrives in a later milestone")
    ).toBeNull();
  });

  it("updates topic progress and recalculates the plan progress", async () => {
    const user = userEvent.setup();
    const initialPlan = makePlan();
    const completedPlan = makePlan({
      topics: initialPlan.topics.map((topic) =>
        topic.id === "topic-2" ? { ...topic, completed: true } : topic
      ),
      progress: {
        totalTopics: 2,
        completedTopics: 2,
        completionPercentage: 100,
      },
    });

    getSubjects.mockResolvedValue({ data: { subjects: [subject] } });
    getStudyPlans.mockResolvedValue({ data: { plans: [initialPlan] } });
    updateStudyPlanTopic.mockResolvedValue({
      data: { plan: completedPlan },
    });

    renderPlanner();

    const topicCheckbox = await screen.findByRole("checkbox", {
      name: "Waves",
    });

    await user.click(topicCheckbox);

    await waitFor(() => {
      expect(updateStudyPlanTopic).toHaveBeenCalledWith(
        "plan-1",
        "topic-2",
        true
      );
    });
    expect(await screen.findByText("100%")).toBeTruthy();
    expect(screen.getByText("2/2 topics complete")).toBeTruthy();
  });

  it("creates a plan through the editor and generate endpoint", async () => {
    const user = userEvent.setup();
    const generatedPlan = makePlan({
      id: "plan-new",
      title: "Organic chemistry",
      description: "",
      subject: null,
      schedule: [],
      progress: {
        totalTopics: 1,
        completedTopics: 0,
        completionPercentage: 0,
      },
      topics: [
        {
          id: "topic-new",
          title: "Alkanes",
          description: "",
          completed: false,
          estimatedMinutes: 30,
          order: 0,
        },
      ],
    });

    generateStudyPlan.mockResolvedValue({
      data: { plan: generatedPlan },
    });

    renderPlanner();

    await screen.findByText("No study plans yet");
    await user.click(screen.getByRole("button", { name: "New study plan" }));
    await user.type(screen.getByLabelText("Plan title"), "Organic chemistry");
    fireEvent.change(screen.getByLabelText("Exam date"), {
      target: { value: "2026-12-20" },
    });
    await user.type(screen.getByLabelText("Topic 1"), "Alkanes");
    await user.click(
      screen.getByRole("button", { name: "Generate & save" })
    );

    await waitFor(() => {
      expect(generateStudyPlan).toHaveBeenCalledTimes(1);
    });

    const payload = generateStudyPlan.mock.calls[0][0];

    expect(payload.title).toBe("Organic chemistry");
    expect(payload.examDate).toBe("2026-12-20");
    expect(payload.dailyStudyHours).toBe(2);
    expect(payload.topics).toEqual([
      {
        title: "Alkanes",
        description: "",
        estimatedMinutes: 30,
        completed: false,
      },
    ]);
    expect(await screen.findByText("Organic chemistry")).toBeTruthy();
    expect(
      screen.getByText("Study plan and schedule generated.")
    ).toBeTruthy();
    expect(createStudyPlan).not.toHaveBeenCalled();
  });

  it("creates subjects from the subject panel", async () => {
    const user = userEvent.setup();
    const newSubject = {
      id: "subject-new",
      name: "Biology",
      description: "",
      color: "#22c55e",
    };

    createSubject.mockResolvedValue({ data: { subject: newSubject } });

    renderPlanner();

    await screen.findByText("No study plans yet");
    await user.click(screen.getByRole("button", { name: "Add subject" }));
    await user.type(screen.getByLabelText("Subject name"), "Biology");
    await user.click(screen.getByRole("button", { name: "Save subject" }));

    await waitFor(() => {
      expect(createSubject).toHaveBeenCalledWith({
        name: "Biology",
        description: "",
        color: "#6ea8fe",
      });
    });
    expect(await screen.findByText("Subject created.")).toBeTruthy();
    expect(screen.getByText("Biology")).toBeTruthy();
  });

  it("shows a load error and retries successfully", async () => {
    const user = userEvent.setup();

    getSubjects.mockRejectedValueOnce({
      response: { data: { message: "Planner service unavailable" } },
    });

    renderPlanner();

    expect(await screen.findByText("Planner unavailable")).toBeTruthy();
    expect(screen.getByText("Planner service unavailable")).toBeTruthy();

    getSubjects.mockResolvedValue({ data: { subjects: [] } });
    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByText("No study plans yet")).toBeTruthy();
  });
});

describe("dashboard page", () => {
  it("renders personalized live metrics from analytics", async () => {
    getAnalyticsOverview.mockResolvedValue({
      data: makeAnalytics({
        studyPlans: {
          total: 2,
          active: 1,
          paused: 1,
          completed: 0,
          totalTopics: 3,
          completedTopics: 1,
          completionPercentage: 33,
          remainingMinutes: 120,
        },
      }),
    });

    renderDashboard();

    expect(
      await screen.findByText("Welcome back, Aarav")
    ).toBeTruthy();
    expect(
      (await screen.findAllByText("Physics finals")).length
    ).toBeGreaterThan(0);

    const plansStat = screen.getByText("Study plans").closest("article");
    const quizStat = screen
      .getByText("Quiz average", { selector: ".stat-card__label" })
      .closest("article");
    const dueStat = screen.getByText("Due today").closest("article");
    const completionStat = screen
      .getByText("Study completion")
      .closest("article");

    expect(within(plansStat).getByText("2")).toBeTruthy();
    expect(within(quizStat).getByText("72%")).toBeTruthy();
    expect(within(dueStat).getByText("2")).toBeTruthy();
    expect(within(completionStat).getByText("33%")).toBeTruthy();
    expect(
      screen.getByText("1 active · 1 paused")
    ).toBeTruthy();
    expect(screen.getByText("Cell respiration")).toBeTruthy();
    expect(screen.getAllByText("Photosynthesis").length).toBeGreaterThan(0);
  });

  it("shows revision priorities, progress, and recent activity", async () => {
    renderDashboard();

    expect(
      await screen.findByText("Your priorities")
    ).toBeTruthy();
    expect(screen.getByText("3 items")).toBeTruthy();
    expect(screen.getByText("You reviewed a revision item")).toBeTruthy();
    expect(
      screen.getByText("You completed a quiz · 60%")
    ).toBeTruthy();
    expect(
      screen.getByText("12 tracked records across plans, quizzes, and revisions.")
    ).toBeTruthy();
    expect(
      screen.getByRole("progressbar", {
        name: "Study plan completion: 50%",
      })
    ).toBeTruthy();
  });

  it("shows honest empty priorities and activity states", async () => {
    getAnalyticsOverview.mockResolvedValue({
      data: makeAnalytics({
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
        revisions: {
          total: 0,
          active: 0,
          dueToday: 0,
          overdue: 0,
          upcoming: 0,
          completed: 0,
          completionPercentage: 0,
          reminders: { overdue: [], dueToday: [], upcoming: [] },
        },
        recentActivity: [],
        overall: {
          studyCompletionPercentage: 0,
          quizAverageScore: 0,
          revisionCompletionPercentage: 0,
          trackedRecords: 0,
        },
      }),
    });

    renderDashboard();

    expect(await screen.findByText("No upcoming exams")).toBeTruthy();
    expect(
      screen.getByText(/No revision items are due today/)
    ).toBeTruthy();
    expect(
      screen.getByText(/Your plan updates, quiz attempts, and revision reviews/)
    ).toBeTruthy();
    expect(
      screen.getByText(
        "Add an exam date to a study plan and it will appear here with a live completion snapshot."
      )
    ).toBeTruthy();
  });

  it("shows dashboard errors and supports retry", async () => {
    const user = userEvent.setup();

    getAnalyticsOverview.mockRejectedValueOnce({
      response: { data: { message: "Could not reach analytics" } },
    });

    renderDashboard();

    expect(
      await screen.findByText("Dashboard data unavailable")
    ).toBeTruthy();
    expect(screen.getByText("Could not reach analytics")).toBeTruthy();

    getAnalyticsOverview.mockResolvedValue({
      data: makeAnalytics(),
    });
    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(
      (await screen.findAllByText("Physics finals")).length
    ).toBeGreaterThan(0);
  });
});
