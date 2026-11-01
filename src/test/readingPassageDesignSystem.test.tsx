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
      passageCount={readings.length}
      selectedAnswers={answers}
      results={results}
      onAnswerChange={(questionId, choiceId) => setAnswers((current) => ({ ...current, [questionId]: choiceId }))}
      onCheckAnswer={(question) => setResults((current) => ({ ...current, [question.id]: answers[question.id] === question.choices[0]?.id }))}
      hasPreviousPassage={index > 0}
      hasNextPassage={index < readings.length - 1}
    />)}
  </div>;
}

function ReadingNavigationHarness() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const reading = readings[activeIndex];
  return <ReadingPassageDesignSystem
    reading={reading}
    passageNumber={activeIndex + 1}
    passageCount={readings.length}
    selectedAnswers={answers}
    results={{}}
    onAnswerChange={(questionId, choiceId) => setAnswers((current) => ({ ...current, [questionId]: choiceId }))}
    onCheckAnswer={() => {}}
    hasPreviousPassage={activeIndex > 0}
    hasNextPassage={activeIndex < readings.length - 1}
    onPreviousPassage={() => setActiveIndex((index) => Math.max(0, index - 1))}
    onNextPassage={() => setActiveIndex((index) => Math.min(readings.length - 1, index + 1))}
  />;
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

  it("shows one passage at a time and preserves the first passage answer when moving forward and back", () => {
    render(<ReadingNavigationHarness />);

    fireEvent.click(screen.getByRole("radio", { name: "الخيار الطاقة 1-1" }));
    fireEvent.click(screen.getByRole("button", { name: /انتقلي إلى القطعة التالية/ }));
    expect(screen.getByRole("heading", { name: "الغدد الصماء" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "كيف تحصل الخلية على الطاقة؟" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /القطعة السابقة/ }));
    expect(screen.getByRole("heading", { name: "كيف تحصل الخلية على الطاقة؟" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "الخيار الطاقة 1-1" })).toBeChecked();
  });
});
