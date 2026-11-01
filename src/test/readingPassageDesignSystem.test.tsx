import { fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import {
  ReadingPassageDesignSystem,
  type ReadingPassageItem,
  type ReadingQuestionItem,
} from "@/components/student/reading/ReadingPassageDesignSystem";

const makeQuestions = (prefix: string, count: number): ReadingQuestionItem[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `${prefix}-q${index + 1}`,
    question_order: index + 1,
    text: `نص السؤال ${prefix} ${index + 1}`,
    choices: Array.from({ length: 4 }, (_, choiceIndex) => ({
      id: `${prefix}-q${index + 1}-c${choiceIndex + 1}`,
      text: `الخيار ${prefix} ${index + 1}-${choiceIndex + 1}`,
    })),
  }));

const readings: ReadingPassageItem[] = [
  {
    id: "cell-energy",
    title: "كيف تحصل الخلية على الطاقة؟",
    passage: "تستخدم الخلية الجلوكوز والأكسجين لإنتاج الطاقة.\n\nيساعد البناء الضوئي النبات على صنع غذائه.",
    questions: makeQuestions("الطاقة", 5),
  },
  {
    id: "endocrine",
    title: "الغدد الصماء",
    passage: "تفرز الغدد الصماء الهرمونات التي تنظم وظائف الجسم.",
    questions: makeQuestions("الهرمونات", 4),
  },
];

function ReadingHarness() {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, boolean>>({});

  return <div>
    {readings.map((reading, index) => <ReadingPassageDesignSystem
      key={reading.id}
      reading={reading}
      passageNumber={index + 1}
      selectedAnswers={answers}
      results={results}
      onAnswerChange={(questionId, choiceId) => setAnswers((current) => ({ ...current, [questionId]: choiceId }))}
      onCheckAnswer={(question) => setResults((current) => ({ ...current, [question.id]: answers[question.id] === question.choices[0]?.id }))}
    />)}
  </div>;
}

describe("reading passage design system", () => {
  it("renders the two ordered reading passages with all nine questions and four choices each", () => {
    render(<ReadingHarness />);

    const headings = screen.getAllByRole("heading", { level: 2 });
    expect(headings.map((heading) => heading.textContent)).toEqual(["كيف تحصل الخلية على الطاقة؟", "الغدد الصماء"]);
    expect(screen.getAllByRole("heading", { name: "أسئلة الفهم والاستيعاب" })).toHaveLength(2);
    expect(screen.getAllByRole("radio")).toHaveLength(36);
    expect(screen.getByLabelText("النص القرائي: كيف تحصل الخلية على الطاقة؟")).toHaveTextContent("تستخدم الخلية الجلوكوز والأكسجين لإنتاج الطاقة.");
    expect(screen.getByLabelText("النص القرائي: الغدد الصماء")).toHaveTextContent("تفرز الغدد الصماء الهرمونات التي تنظم وظائف الجسم.");
  });

  it("keeps radio controls on the right, preserves responsive answer columns, and checks only after the student submits", () => {
    render(<ReadingHarness />);

    const firstRadio = screen.getByRole("radio", { name: "الخيار الطاقة 1-1" });
    const optionLabel = firstRadio.closest("label");
    expect(optionLabel?.firstElementChild).toBe(firstRadio);
    expect(optionLabel).toHaveClass("grid-cols-[auto_1fr]");
    expect(optionLabel?.parentElement).toHaveClass("md:grid-cols-2");
    expect(screen.queryByRole("status", { name: /إجابة صحيحة/ })).not.toBeInTheDocument();

    fireEvent.click(firstRadio);
    const firstQuestion = screen.getByText("نص السؤال الطاقة 1").closest("div.rounded-3xl");
    expect(firstQuestion).toBeTruthy();
    fireEvent.click(within(firstQuestion as HTMLElement).getByRole("button", { name: "تحققي من الإجابة" }));

    expect(within(firstQuestion as HTMLElement).getByRole("status")).toHaveTextContent("إجابة صحيحة، أحسنتِ!");
  });
});
