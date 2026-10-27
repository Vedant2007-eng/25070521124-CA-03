import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Revision from "../src/pages/Revision";
import {
  createRevision,
  deleteRevision,
  generateRevisionsFromStudyPlan,
  getRevisionSummary,
  getRevisions,
  getStudyPlans,
  getSubjects,
  reviewRevision,
  updateRevision,
} from "../src/services/api";

vi.mock("../src/services/api", () => ({
  getRevisions: vi.fn(),
  createRevision: vi.fn(),
  updateRevision: vi.fn(),
  deleteRevision: vi.fn(),
  reviewRevision: vi.fn(),
  getRevisionSummary: vi.fn(),
  generateRevisionsFromStudyPlan: vi.fn(),
  getStudyPlans: vi.fn(),
  getSubjects: vi.fn(),
}));

const subject = {
  id: "subject-1",
  name: "Biology",
  color: "#22c55e",
};

const plan = {
  id: "plan-1",
  title: "Biology finals",
  topics: [
    { id: "topic-1", title: "Cells" },
    { id: "topic-2", title: "Genetics" },
  ],
};

function makeSummary(overrides = {}) {
  return {
    total: 0,
    pending: 0,
    inProgress: 0,
    active: 0,
    dueToday: 0,
    overdue: 0,
    upcoming: 0,
    completed: 0,
    completionPercentage: 0,
    ...overrides,
  };
}

function makeItem(overrides = {}) {
  return {
    id: "revision-1",
    topic: "Photosynthesis",
    notes: "Review the light and dark reactions.",
    priority: "medium",
    status: "pending",
    subject,
    nextReviewAt: "2026-10-28T12:00:00.000Z",
    lastReviewedAt: null,
    reviewCount: 0,
    sourcePlanId: null,
    sourceTopicId: null,
    isOverdue: false,
    isDueToday: true,
    isUpcoming: false,
    isCompleted: false,
    createdAt: "2026-10-27T12:00:00.000Z",
    updatedAt: "2026-10-27T12:00:00.000Z",
    ...overrides,
  };
}

function renderRevision() {
  return render(
    <MemoryRouter>
      <Revision />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  getRevisions.mockResolvedValue({ data: { revisions: [] } });
  getRevisionSummary.mockResolvedValue({
    data: { summary: makeSummary() },
  });
  getSubjects.mockResolvedValue({ data: { subjects: [subject] } });
  getStudyPlans.mockResolvedValue({ data: { plans: [plan] } });
});

describe("revision page", () => {
  it("loads real items, summary metrics, and filters", async () => {
    const overdue = makeItem({
      id: "revision-overdue",
      topic: "Cell respiration",
      isOverdue: true,
      isDueToday: false,
      nextReviewAt: "2026-10-20T12:00:00.000Z",
    });
    const upcoming = makeItem({
      id: "revision-upcoming",
      topic: "Genetics",
      isDueToday: false,
      isUpcoming: true,
      nextReviewAt: "2026-11-02T12:00:00.000Z",
    });
    const completed = makeItem({
      id: "revision-completed",
      topic: "Enzymes",
      status: "completed",
      isDueToday: false,
      isCompleted: true,
      reviewCount: 4,
    });

    getRevisions.mockResolvedValue({
      data: { revisions: [overdue, upcoming, completed] },
    });
    getRevisionSummary.mockResolvedValue({
      data: {
        summary: makeSummary({
          total: 3,
          active: 2,
          dueToday: 1,
          overdue: 1,
          upcoming: 1,
          completed: 1,
          completionPercentage: 33,
        }),
      },
    });

    const user = userEvent.setup();
    renderRevision();

    expect(
      await screen.findByText("Cell respiration")
    ).toBeTruthy();
    expect(screen.getByText("Genetics")).toBeTruthy();
    expect(screen.getByText("Enzymes")).toBeTruthy();

    const dueStat = screen
      .getByText("Due today", { selector: ".stat-card__label" })
      .closest("article");
    const overdueStat = screen
      .getByText("Overdue", { selector: ".stat-card__label" })
      .closest("article");
    const masteredStat = screen
      .getByText("Mastered", { selector: ".stat-card__label" })
      .closest("article");

    expect(within(dueStat).getByText("1")).toBeTruthy();
    expect(within(overdueStat).getByText("1")).toBeTruthy();
    expect(within(masteredStat).getByText("33%")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /^Overdue/ }));

    expect(screen.getByText("Cell respiration")).toBeTruthy();
    expect(screen.queryByText("Genetics")).toBeNull();
    expect(screen.queryByText("Enzymes")).toBeNull();
  });

  it("creates a revision item through the editor", async () => {
    const user = userEvent.setup();
    const created = makeItem({
      id: "revision-new",
      topic: "Protein synthesis",
      priority: "high",
      subject: null,
    });

    createRevision.mockResolvedValue({
      data: { revision: created },
    });

    renderRevision();

    await screen.findByText("Your revision queue is empty");
    await user.click(
      screen.getByRole("button", { name: "New revision item" })
    );
    await user.type(
      screen.getByLabelText("Revision topic"),
      "Protein synthesis"
    );
    await user.selectOptions(
      screen.getByLabelText("Priority"),
      "high"
    );
    await user.type(
      screen.getByLabelText("Notes"),
      "Transcription and translation"
    );
    await user.click(
      screen.getByRole("button", { name: "Add revision item" })
    );

    await waitFor(() => {
      expect(createRevision).toHaveBeenCalledWith({
        topic: "Protein synthesis",
        notes: "Transcription and translation",
        priority: "high",
        status: "pending",
        subject: null,
      });
    });
    expect(await screen.findByText("Protein synthesis")).toBeTruthy();
    expect(screen.getByText("Revision item added.")).toBeTruthy();
    expect(updateRevision).not.toHaveBeenCalled();
  });

  it("records reviews and confirms mastery explicitly", async () => {
    const user = userEvent.setup();
    const item = makeItem({ id: "revision-review" });
    const reviewed = makeItem({
      id: "revision-review",
      status: "in_progress",
      reviewCount: 1,
      lastReviewedAt: "2026-10-27T14:00:00.000Z",
      nextReviewAt: "2026-10-30T14:00:00.000Z",
      isDueToday: false,
      isUpcoming: true,
    });
    const mastered = {
      ...reviewed,
      status: "completed",
      reviewCount: 2,
      isCompleted: true,
      isUpcoming: false,
    };

    getRevisions.mockResolvedValue({ data: { revisions: [item] } });
    reviewRevision
      .mockResolvedValueOnce({ data: { revision: reviewed } })
      .mockResolvedValueOnce({ data: { revision: mastered } });

    renderRevision();

    await user.click(await screen.findByRole("button", { name: "Review now" }));

    await waitFor(() => {
      expect(reviewRevision).toHaveBeenCalledWith("revision-review", {
        mastered: false,
      });
    });
    expect(
      screen.getByText("Review recorded. The next review has been scheduled.")
    ).toBeTruthy();

    await user.click(
      screen.getByRole("button", { name: "Mark mastered" })
    );
    await user.click(
      screen.getByRole("button", { name: "Confirm mastered" })
    );

    await waitFor(() => {
      expect(reviewRevision).toHaveBeenLastCalledWith("revision-review", {
        mastered: true,
      });
    });
    expect(
      screen.getByText("Revision item marked as mastered.")
    ).toBeTruthy();
    expect(screen.getByText("Completed on Oct 27, 2026")).toBeTruthy();
  });

  it("imports study-plan topics and reports skipped duplicates", async () => {
    const user = userEvent.setup();
    const imported = makeItem({
      id: "revision-imported",
      topic: "Cells",
      sourcePlanId: "plan-1",
      sourceTopicId: "topic-1",
    });
    const updatedSummary = makeSummary({
      total: 1,
      pending: 1,
      active: 1,
      dueToday: 1,
    });

    getRevisions
      .mockResolvedValueOnce({ data: { revisions: [] } })
      .mockResolvedValue({ data: { revisions: [imported] } });
    getRevisionSummary
      .mockResolvedValueOnce({ data: { summary: makeSummary() } })
      .mockResolvedValue({ data: { summary: updatedSummary } });
    generateRevisionsFromStudyPlan.mockResolvedValue({
      data: { created: 2, skipped: 1 },
    });

    renderRevision();

    await screen.findByText("Your revision queue is empty");
    await user.selectOptions(
      screen.getByLabelText("Study plan"),
      "plan-1"
    );
    await user.click(
      screen.getByRole("button", { name: "Generate revision items" })
    );

    await waitFor(() => {
      expect(generateRevisionsFromStudyPlan).toHaveBeenCalledWith(
        "plan-1"
      );
    });
    expect(
      screen.getByText(
        "2 revision items created; 1 existing item skipped."
      )
    ).toBeTruthy();
    expect(await screen.findByText("From study plan")).toBeTruthy();
  });

  it("edits and deletes an existing revision item", async () => {
    const user = userEvent.setup();
    const item = makeItem();
    const updated = makeItem({
      topic: "Updated photosynthesis",
      notes: "Updated notes",
      priority: "low",
    });

    getRevisions.mockResolvedValue({ data: { revisions: [item] } });
    updateRevision.mockResolvedValue({ data: { revision: updated } });
    deleteRevision.mockResolvedValue({ data: {} });

    renderRevision();

    await user.click(await screen.findByRole("button", { name: "Edit" }));
    const topicInput = screen.getByLabelText("Revision topic");
    await user.clear(topicInput);
    await user.type(topicInput, "Updated photosynthesis");
    await user.selectOptions(screen.getByLabelText("Priority"), "low");
    await user.click(
      screen.getByRole("button", { name: "Save changes" })
    );

    await waitFor(() => {
      expect(updateRevision).toHaveBeenCalledWith(
        "revision-1",
        expect.objectContaining({
          topic: "Updated photosynthesis",
          priority: "low",
        })
      );
    });
    expect(await screen.findByText("Updated photosynthesis")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Delete" }));
    await user.click(
      screen.getByRole("button", { name: "Confirm delete" })
    );

    await waitFor(() => {
      expect(deleteRevision).toHaveBeenCalledWith("revision-1");
    });
    expect(screen.queryByText("Updated photosynthesis")).toBeNull();
    expect(screen.getByText("Revision item deleted.")).toBeTruthy();
  });

  it("shows a load error and retries successfully", async () => {
    const user = userEvent.setup();

    getRevisions.mockRejectedValueOnce({
      response: { data: { message: "Revision service unavailable" } },
    });

    renderRevision();

    expect(
      await screen.findByText("Revision queue unavailable")
    ).toBeTruthy();
    expect(screen.getByText("Revision service unavailable")).toBeTruthy();

    getRevisions.mockResolvedValue({ data: { revisions: [] } });
    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(
      await screen.findByText("Your revision queue is empty")
    ).toBeTruthy();
  });
});
