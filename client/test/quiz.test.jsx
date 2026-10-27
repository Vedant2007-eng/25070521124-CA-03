import {
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Quiz from "../src/pages/Quiz";
import {
  generateQuiz,
  getQuizHistory,
  getSubjects,
  submitQuiz,
} from "../src/services/api";

vi.mock("../src/services/api", () => ({
  getSubjects: vi.fn(),
  generateQuiz: vi.fn(),
  submitQuiz: vi.fn(),
  getQuizHistory: vi.fn(),
}));

const subject = {
  id: "subject-1",
  name: "Physics",
  description: "Mechanics",
  color: "#38bdf8",
};

const generatedQuiz = {
  id: "quiz-1",
  topic: "Mechanics",
  difficulty: "medium",
  questionCount: 2,
  subject,
  expiresAt: "2026-12-10T12:30:00.000Z",
  questions: [
    {
      number: 1,
      questionText: "Which quantity is a vector?",
      options: ["Mass", "Velocity", "Time", "Temperature"],
    },
    {
      number: 2,
      questionText: "What is the SI unit of force?",
      options: ["Joule", "Newton", "Watt", "Pascal"],
    },
  ],
};

const attempt = {
  id: "attempt-1",
  title: "Mechanics · Medium quiz",
  topic: "Mechanics",
  difficulty: "medium",
  subject,
  scorePercentage: 50,
  correctAnswers: 1,
  totalQuestions: 2,
  timeTakenSeconds: 65,
  completedAt: "2026-10-27T10:00:00.000Z",
  questions: [
    {
      questionText: "Which quantity is a vector?",
      options: ["Mass", "Velocity", "Time", "Temperature"],
      selectedAnswer: "Velocity",
      correctAnswer: "Velocity",
      isCorrect: true,
      explanation: "Velocity has both magnitude and direction.",
    },
    {
      questionText: "What is the SI unit of force?",
      options: ["Joule", "Newton", "Watt", "Pascal"],
      selectedAnswer: "Joule",
      correctAnswer: "Newton",
      isCorrect: false,
      explanation: "Force is measured in newtons.",
    },
  ],
};

const historySummary = {
  id: attempt.id,
  title: attempt.title,
  topic: attempt.topic,
  difficulty: attempt.difficulty,
  subject: attempt.subject,
  scorePercentage: attempt.scorePercentage,
  correctAnswers: attempt.correctAnswers,
  totalQuestions: attempt.totalQuestions,
  timeTakenSeconds: attempt.timeTakenSeconds,
  completedAt: attempt.completedAt,
};

function renderQuiz() {
  return render(
    <MemoryRouter>
      <Quiz />
    </MemoryRouter>
  );
}

function emptyHistory() {
  return {
    data: {
      attempts: [],
      pagination: {
        page: 1,
        limit: 5,
        total: 0,
        totalPages: 0,
      },
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  getSubjects.mockResolvedValue({ data: { subjects: [subject] } });
  getQuizHistory.mockResolvedValue(emptyHistory());
  generateQuiz.mockResolvedValue({ data: { quiz: generatedQuiz } });
  submitQuiz.mockResolvedValue({
    data: {
      attempt,
    },
  });
});

describe("quiz page", () => {
  it("shows the generator, real subjects, and an empty history state", async () => {
    renderQuiz();

    expect(
      screen.getByRole("heading", { name: "Generate a new quiz" })
    ).toBeTruthy();
    expect(await screen.findByText("Physics")).toBeTruthy();
    expect(
      await screen.findByText(/No quiz attempts yet/)
    ).toBeTruthy();
    expect(
      screen.getByText("Generate quiz with AI")
    ).toBeTruthy();
  });

  it("validates an empty topic before calling the API", async () => {
    const user = userEvent.setup();
    renderQuiz();

    await screen.findByText("Physics");
    const topicInput = screen.getByPlaceholderText(
      "e.g. Quadratic equations"
    );

    await user.type(topicInput, "   ");
    await user.click(
      screen.getByRole("button", { name: "Generate quiz with AI" })
    );

    expect(
      await screen.findByText("Enter a topic for the quiz.")
    ).toBeTruthy();
    expect(generateQuiz).not.toHaveBeenCalled();
  });

  it("shows a friendly error when quiz generation fails", async () => {
    const user = userEvent.setup();
    generateQuiz.mockRejectedValue({
      response: {
        data: {
          message: "The AI service is temporarily unavailable.",
        },
      },
    });
    renderQuiz();

    await screen.findByText("Physics");
    await user.type(
      screen.getByPlaceholderText("e.g. Quadratic equations"),
      "Mechanics"
    );
    await user.click(
      screen.getByRole("button", { name: "Generate quiz with AI" })
    );

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain(
      "The AI service is temporarily unavailable."
    );
    expect(submitQuiz).not.toHaveBeenCalled();
  });

  it("generates a quiz, prevents premature submission, and shows no answer key", async () => {
    const user = userEvent.setup();
    renderQuiz();

    await screen.findByText("Physics");
    await user.type(
      screen.getByPlaceholderText("e.g. Quadratic equations"),
      "Mechanics"
    );
    await user.selectOptions(
      screen.getByLabelText("Number of questions"),
      "5"
    );
    await user.selectOptions(
      screen.getByLabelText("Difficulty"),
      "hard"
    );
    await user.click(
      screen.getByRole("button", { name: "Generate quiz with AI" })
    );

    expect(generateQuiz).toHaveBeenCalledWith({
      subjectId: null,
      topic: "Mechanics",
      difficulty: "hard",
      numberOfQuestions: 5,
      questionType: "mcq",
      additionalInstructions: "",
    });

    expect(
      await screen.findByRole("heading", {
        name: "Which quantity is a vector?",
      })
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "Mechanics" })
    ).toBeTruthy();
    expect(screen.queryByText("Correct answer")).toBeNull();
    expect(screen.queryByText("Explanation for question 1.")).toBeNull();

    await user.click(
      screen.getByRole("button", { name: "Next question" })
    );

    const submitButton = screen.getByRole("button", {
      name: "Review and submit",
    });
    expect(submitButton.disabled).toBe(true);
    expect(
      screen.getByText("Answer every question before submitting.")
    ).toBeTruthy();
  });

  it("submits every answer after confirmation and renders graded results", async () => {
    const user = userEvent.setup();
    renderQuiz();

    await screen.findByText("Physics");
    await user.type(
      screen.getByPlaceholderText("e.g. Quadratic equations"),
      "Mechanics"
    );
    await user.click(
      screen.getByRole("button", { name: "Generate quiz with AI" })
    );

    await screen.findByRole("heading", {
      name: "Which quantity is a vector?",
    });
    await user.click(
      screen.getByRole("radio", { name: "Velocity" })
    );
    await user.click(
      screen.getByRole("button", { name: "Next question" })
    );
    await user.click(
      screen.getByRole("radio", { name: "Joule" })
    );

    const reviewButton = screen.getByRole("button", {
      name: "Review and submit",
    });
    expect(reviewButton.disabled).toBe(false);
    await user.click(reviewButton);

    expect(screen.getByText("Submit this quiz?")).toBeTruthy();
    expect(submitQuiz).not.toHaveBeenCalled();

    await user.click(
      screen.getByRole("button", { name: "Submit final answers" })
    );

    await waitFor(() => {
      expect(submitQuiz).toHaveBeenCalledWith("quiz-1", [
        { questionIndex: 0, selectedAnswer: "Velocity" },
        { questionIndex: 1, selectedAnswer: "Joule" },
      ]);
    });

    expect(
      await screen.findByRole("heading", {
        name: "Mechanics · Medium quiz",
      })
    ).toBeTruthy();
    expect(screen.getByText("50%")).toBeTruthy();
    expect(
      screen.getByText(/You answered 1 of 2 questions correctly/)
    ).toBeTruthy();
    expect(screen.getByText("Needs review")).toBeTruthy();
    expect(
      screen.getByText(/Force is measured in newtons/)
    ).toBeTruthy();
    expect(getQuizHistory).toHaveBeenCalledTimes(2);
  });

  it("keeps the quiz available when submission reports an expired session", async () => {
    const user = userEvent.setup();
    submitQuiz.mockRejectedValue({
      response: {
        status: 404,
        data: {
          message: "Quiz session not found or expired.",
        },
      },
    });
    renderQuiz();

    await screen.findByText("Physics");
    await user.type(
      screen.getByPlaceholderText("e.g. Quadratic equations"),
      "Mechanics"
    );
    await user.click(
      screen.getByRole("button", { name: "Generate quiz with AI" })
    );
    await screen.findByRole("heading", {
      name: "Which quantity is a vector?",
    });

    await user.click(
      screen.getByRole("radio", { name: "Velocity" })
    );
    await user.click(
      screen.getByRole("button", { name: "Next question" })
    );
    await user.click(
      screen.getByRole("radio", { name: "Newton" })
    );
    await user.click(
      screen.getByRole("button", { name: "Review and submit" })
    );
    await user.click(
      screen.getByRole("button", { name: "Submit final answers" })
    );

    expect(
      await screen.findByText("Quiz session not found or expired.")
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", {
        name: "What is the SI unit of force?",
      })
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Start over" })
    ).toBeTruthy();
  });

  it("renders paginated history from the API", async () => {
    const user = userEvent.setup();
    const secondAttempt = {
      ...historySummary,
      id: "attempt-2",
      title: "Waves · Easy quiz",
      topic: "Waves",
      difficulty: "easy",
      scorePercentage: 100,
    };

    getQuizHistory.mockImplementation(({ page }) =>
      Promise.resolve({
        data: {
          attempts:
            page === 1 ? [historySummary] : [secondAttempt],
          pagination: {
            page,
            limit: 5,
            total: 6,
            totalPages: 2,
          },
        },
      })
    );

    renderQuiz();

    expect(
      await screen.findByText("Mechanics · Medium quiz")
    ).toBeTruthy();
    expect(screen.getByText("Page 1 of 2")).toBeTruthy();

    await user.click(
      screen.getByRole("button", { name: "Next" })
    );

    expect(
      await screen.findByText("Waves · Easy quiz")
    ).toBeTruthy();
    expect(screen.getByText("Page 2 of 2")).toBeTruthy();

    await waitFor(() => {
      expect(getQuizHistory).toHaveBeenLastCalledWith({
        page: 2,
        limit: 5,
      });
    });
  });

  it("shows a history error with a retry action", async () => {
    getQuizHistory
      .mockRejectedValueOnce({
        response: {
          data: {
            message: "Could not load quiz history.",
          },
        },
      })
      .mockResolvedValueOnce(emptyHistory());

    renderQuiz();

    expect(
      await screen.findByText("Could not load quiz history.")
    ).toBeTruthy();

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Try again" }));

    expect(
      await screen.findByText(/No quiz attempts yet/)
    ).toBeTruthy();
  });
});
