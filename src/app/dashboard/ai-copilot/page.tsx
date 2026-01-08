"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";

interface QuestionnaireField {
  name: string;
  label: string;
  type: "text" | "textarea" | "url" | "multiselect" | "tags";
  placeholder?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
}

interface QuestionnaireStep {
  id: string;
  title: string;
  description: string;
  fields: QuestionnaireField[];
}

interface ContentPillar {
  name: string;
  description: string;
  examples: string[];
}

interface RecommendedPlatform {
  platform: string;
  reason: string;
  priority: "high" | "medium" | "low";
}

interface GeneratedStrategy {
  recommendedPlatforms: RecommendedPlatform[];
  postsPerWeek: Record<string, number>;
  contentPillars: ContentPillar[];
  toneOfVoice: string;
  hashtagStrategy: string;
  bestTimes: Record<string, string[]>;
  strategyDocument: string;
}

interface SavedStrategy {
  id: string;
  name: string;
  brandName: string | null;
  createdAt: string;
  isActive: boolean;
}

type FormData = Record<string, string | string[]>;

export default function AiCopilotPage() {
  const { data: session, status } = useSession();
  const [steps, setSteps] = useState<QuestionnaireStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<FormData>({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [strategy, setStrategy] = useState<GeneratedStrategy | null>(null);
  const [savedStrategy, setSavedStrategy] = useState<SavedStrategy | null>(null);
  const [savedStrategies, setSavedStrategies] = useState<SavedStrategy[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [view, setView] = useState<"wizard" | "results" | "list">("list");
  const [applyingToCalendar, setApplyingToCalendar] = useState(false);
  const [calendarGenerated, setCalendarGenerated] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      fetchQuestionnaire();
      fetchStrategies();
    }
  }, [status]);

  if (status === "loading") return <div className="p-8">Loading...</div>;
  if (status === "unauthenticated") redirect("/login");

  async function fetchQuestionnaire() {
    try {
      const res = await fetch("/api/ai-copilot/questionnaire");
      const data = await res.json();
      setSteps(data.steps || []);
    } catch (error) {
      console.error("Failed to fetch questionnaire:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchStrategies() {
    try {
      const res = await fetch("/api/ai-copilot");
      const data = await res.json();
      setSavedStrategies(data);
    } catch (error) {
      console.error("Failed to fetch strategies:", error);
    }
  }

  function handleFieldChange(fieldName: string, value: string | string[]) {
    setFormData((prev) => ({ ...prev, [fieldName]: value }));
  }

  function handleTagAdd(fieldName: string) {
    if (!tagInput.trim()) return;
    const currentTags = (formData[fieldName] as string[]) || [];
    if (!currentTags.includes(tagInput.trim())) {
      handleFieldChange(fieldName, [...currentTags, tagInput.trim()]);
    }
    setTagInput("");
  }

  function handleTagRemove(fieldName: string, tag: string) {
    const currentTags = (formData[fieldName] as string[]) || [];
    handleFieldChange(
      fieldName,
      currentTags.filter((t) => t !== tag)
    );
  }

  function handleMultiSelect(fieldName: string, value: string) {
    const current = (formData[fieldName] as string[]) || [];
    if (current.includes(value)) {
      handleFieldChange(
        fieldName,
        current.filter((v) => v !== value)
      );
    } else {
      handleFieldChange(fieldName, [...current, value]);
    }
  }

  function validateStep(): boolean {
    const step = steps[currentStep];
    if (!step) return false;

    for (const field of step.fields) {
      if (field.required) {
        const value = formData[field.name];
        if (!value || (Array.isArray(value) && value.length === 0)) {
          return false;
        }
      }
    }
    return true;
  }

  async function handleGenerateStrategy() {
    setGenerating(true);
    try {
      const res = await fetch("/api/ai-copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to generate strategy");
      }

      const data = await res.json();
      setStrategy(data.generated);
      setSavedStrategy(data.strategy);
      setView("results");
      fetchStrategies();
    } catch (error) {
      console.error("Failed to generate strategy:", error);
      alert("Failed to generate strategy. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleApplyToCalendar() {
    if (!savedStrategy) return;
    setApplyingToCalendar(true);

    try {
      const res = await fetch("/api/ai-copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate-calendar",
          strategyId: savedStrategy.id,
          weeks: 4,
        }),
      });

      if (!res.ok) throw new Error("Failed to generate calendar");

      const data = await res.json();
      setCalendarGenerated(true);
      alert(`Generated ${data.count} posts for your calendar!`);
    } catch (error) {
      console.error("Failed to apply to calendar:", error);
      alert("Failed to generate calendar. Please try again.");
    } finally {
      setApplyingToCalendar(false);
    }
  }

  async function handleDeleteStrategy(strategyId: string) {
    if (!confirm("Are you sure you want to delete this strategy?")) return;

    try {
      await fetch(`/api/ai-copilot?strategyId=${strategyId}`, {
        method: "DELETE",
      });
      fetchStrategies();
    } catch (error) {
      console.error("Failed to delete strategy:", error);
    }
  }

  async function handleViewStrategy(strategyId: string) {
    try {
      const res = await fetch(`/api/ai-copilot?strategyId=${strategyId}`);
      const data = await res.json();
      setSavedStrategy(data);

      // Reconstruct the generated strategy from saved data
      setStrategy({
        recommendedPlatforms: data.recommendedPlatforms.map((p: string) => ({
          platform: p,
          reason: "",
          priority: "high" as const,
        })),
        postsPerWeek: data.postsPerWeek || {},
        contentPillars: data.contentPillars.map((name: string) => ({
          name,
          description: "",
          examples: [],
        })),
        toneOfVoice: data.toneOfVoice || "",
        hashtagStrategy: data.hashtagStrategy || "",
        bestTimes: data.bestTimes || {},
        strategyDocument: data.strategyDocument || "",
      });
      setView("results");
    } catch (error) {
      console.error("Failed to fetch strategy:", error);
    }
  }

  function startNewStrategy() {
    setFormData({});
    setStrategy(null);
    setSavedStrategy(null);
    setCurrentStep(0);
    setCalendarGenerated(false);
    setView("wizard");
  }

  function downloadStrategy() {
    if (!strategy) return;

    const content = strategy.strategyDocument;
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${savedStrategy?.name || "strategy"}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function renderField(field: QuestionnaireField) {
    switch (field.type) {
      case "text":
      case "url":
        return (
          <input
            type={field.type}
            value={(formData[field.name] as string) || ""}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            className="x-input"
          />
        );

      case "textarea":
        return (
          <textarea
            value={(formData[field.name] as string) || ""}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            className="x-input min-h-[120px]"
            rows={4}
          />
        );

      case "tags":
        return (
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleTagAdd(field.name);
                  }
                }}
                placeholder={field.placeholder}
                className="x-input flex-1"
              />
              <button
                type="button"
                onClick={() => handleTagAdd(field.name)}
                className="btn-secondary"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {((formData[field.name] as string[]) || []).map((tag) => (
                <span
                  key={tag}
                  className="x-badge flex items-center gap-1 px-3 py-1"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleTagRemove(field.name, tag)}
                    className="ml-1 hover:text-red-500"
                  >
                    x
                  </button>
                </span>
              ))}
            </div>
          </div>
        );

      case "multiselect":
        return (
          <div className="grid grid-cols-2 gap-2">
            {field.options?.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleMultiSelect(field.name, option.value)}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  ((formData[field.name] as string[]) || []).includes(
                    option.value
                  )
                    ? "border-[var(--x-blue)] bg-[var(--x-blue)]/10 text-[var(--x-blue)]"
                    : "border-[var(--x-border)] hover:border-[var(--x-text-tertiary)]"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        );

      default:
        return null;
    }
  }

  // Strategy List View
  if (view === "list") {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold">AI Strategy Copilot</h1>
            <p className="text-[var(--x-text-secondary)]">
              Create AI-powered social media strategies for your brand
            </p>
          </div>
          <button onClick={startNewStrategy} className="btn-primary">
            Create New Strategy
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-[var(--x-text-secondary)]">
            Loading...
          </div>
        ) : savedStrategies.length === 0 ? (
          <div className="x-card p-12 text-center">
            <div className="text-4xl mb-4">*</div>
            <h3 className="text-xl font-bold mb-2">No strategies yet</h3>
            <p className="text-[var(--x-text-secondary)] mb-6">
              Create your first AI-powered social media strategy
            </p>
            <button onClick={startNewStrategy} className="btn-primary">
              Get Started
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {savedStrategies.map((s) => (
              <div
                key={s.id}
                className="x-card p-4 flex justify-between items-center"
              >
                <div>
                  <h3 className="font-bold">{s.name}</h3>
                  <p className="text-sm text-[var(--x-text-secondary)]">
                    {s.brandName} - Created{" "}
                    {new Date(s.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleViewStrategy(s.id)}
                    className="btn-secondary"
                  >
                    View
                  </button>
                  <button
                    onClick={() => handleDeleteStrategy(s.id)}
                    className="btn-secondary text-red-500 hover:bg-red-500/10"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Results View
  if (view === "results" && strategy) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <button
              onClick={() => setView("list")}
              className="text-[var(--x-blue)] hover:underline mb-2 inline-block"
            >
              &larr; Back to Strategies
            </button>
            <h1 className="text-2xl font-bold">
              {savedStrategy?.name || "Your Strategy"}
            </h1>
          </div>
          <div className="flex gap-3">
            <button onClick={downloadStrategy} className="btn-secondary">
              Download Strategy
            </button>
            <button
              onClick={handleApplyToCalendar}
              disabled={applyingToCalendar || calendarGenerated}
              className="btn-primary"
            >
              {applyingToCalendar
                ? "Generating..."
                : calendarGenerated
                ? "Calendar Generated!"
                : "Apply to Calendar"}
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Recommended Platforms */}
          <div className="x-card p-6">
            <h2 className="text-xl font-bold mb-4">Recommended Platforms</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {strategy.recommendedPlatforms.map((p, i) => (
                <div
                  key={i}
                  className="p-4 bg-[var(--x-bg-secondary)] rounded-lg"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-bold">{p.platform}</span>
                    <span
                      className={`x-badge ${
                        p.priority === "high"
                          ? "x-badge-green"
                          : p.priority === "medium"
                          ? "x-badge-blue"
                          : ""
                      }`}
                    >
                      {p.priority}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--x-text-secondary)]">
                    {p.reason}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Posting Frequency */}
          <div className="x-card p-6">
            <h2 className="text-xl font-bold mb-4">
              Suggested Posting Frequency
            </h2>
            <div className="grid gap-4 md:grid-cols-3">
              {Object.entries(strategy.postsPerWeek).map(
                ([platform, count]) => (
                  <div
                    key={platform}
                    className="p-4 bg-[var(--x-bg-secondary)] rounded-lg text-center"
                  >
                    <div className="text-2xl font-bold text-[var(--x-blue)]">
                      {count}
                    </div>
                    <div className="text-sm text-[var(--x-text-secondary)]">
                      posts/week on {platform}
                    </div>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Content Pillars */}
          <div className="x-card p-6">
            <h2 className="text-xl font-bold mb-4">Content Pillars</h2>
            <div className="space-y-4">
              {strategy.contentPillars.map((pillar, i) => (
                <div
                  key={i}
                  className="p-4 bg-[var(--x-bg-secondary)] rounded-lg"
                >
                  <h3 className="font-bold mb-2">{pillar.name}</h3>
                  <p className="text-sm text-[var(--x-text-secondary)] mb-3">
                    {pillar.description}
                  </p>
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-[var(--x-text-tertiary)]">
                      Example posts:
                    </p>
                    {pillar.examples.map((example, j) => (
                      <div
                        key={j}
                        className="text-sm p-2 bg-[var(--x-bg)] rounded border border-[var(--x-border)]"
                      >
                        {example}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tone of Voice */}
          <div className="x-card p-6">
            <h2 className="text-xl font-bold mb-4">Tone of Voice</h2>
            <p className="text-[var(--x-text-secondary)]">
              {strategy.toneOfVoice}
            </p>
          </div>

          {/* Hashtag Strategy */}
          <div className="x-card p-6">
            <h2 className="text-xl font-bold mb-4">Hashtag Strategy</h2>
            <p className="text-[var(--x-text-secondary)] whitespace-pre-wrap">
              {strategy.hashtagStrategy}
            </p>
          </div>

          {/* Best Posting Times */}
          <div className="x-card p-6">
            <h2 className="text-xl font-bold mb-4">Best Posting Times</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {Object.entries(strategy.bestTimes).map(([platform, times]) => (
                <div
                  key={platform}
                  className="p-4 bg-[var(--x-bg-secondary)] rounded-lg"
                >
                  <h3 className="font-bold mb-2">{platform}</h3>
                  <div className="flex flex-wrap gap-2">
                    {(times as string[]).map((time, i) => (
                      <span key={i} className="x-badge">
                        {time}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Full Strategy Document */}
          <div className="x-card p-6">
            <h2 className="text-xl font-bold mb-4">Full Strategy Document</h2>
            <div className="prose prose-invert max-w-none">
              <pre className="whitespace-pre-wrap text-sm bg-[var(--x-bg-secondary)] p-4 rounded-lg overflow-x-auto">
                {strategy.strategyDocument}
              </pre>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Wizard View
  const step = steps[currentStep];
  const progress = steps.length > 0 ? ((currentStep + 1) / steps.length) * 100 : 0;

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <button
        onClick={() => setView("list")}
        className="text-[var(--x-blue)] hover:underline mb-4 inline-block"
      >
        &larr; Back to Strategies
      </button>

      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Create Your Strategy</h1>
        <p className="text-[var(--x-text-secondary)]">
          Answer a few questions and let AI create your personalized social
          media strategy
        </p>
      </div>

      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-[var(--x-text-secondary)] mb-2">
          <span>
            Step {currentStep + 1} of {steps.length}
          </span>
          <span>{Math.round(progress)}% complete</span>
        </div>
        <div className="h-2 bg-[var(--x-bg-secondary)] rounded-full overflow-hidden">
          <div
            className="h-full bg-[var(--x-blue)] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-[var(--x-text-secondary)]">
          Loading questionnaire...
        </div>
      ) : step ? (
        <div className="x-card p-6">
          <h2 className="text-xl font-bold mb-2">{step.title}</h2>
          <p className="text-[var(--x-text-secondary)] mb-6">
            {step.description}
          </p>

          <div className="space-y-6">
            {step.fields.map((field) => (
              <div key={field.name}>
                <label className="block text-sm font-medium mb-2">
                  {field.label}
                  {field.required && (
                    <span className="text-red-500 ml-1">*</span>
                  )}
                </label>
                {renderField(field)}
              </div>
            ))}
          </div>

          <div className="flex justify-between mt-8">
            <button
              onClick={() => setCurrentStep((s) => s - 1)}
              disabled={currentStep === 0}
              className="btn-secondary"
            >
              Previous
            </button>

            {currentStep === steps.length - 1 ? (
              <button
                onClick={handleGenerateStrategy}
                disabled={!validateStep() || generating}
                className="btn-primary"
              >
                {generating ? (
                  <span className="flex items-center gap-2">
                    <svg
                      className="animate-spin h-4 w-4"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Generating Strategy...
                  </span>
                ) : (
                  "Generate Strategy"
                )}
              </button>
            ) : (
              <button
                onClick={() => setCurrentStep((s) => s + 1)}
                disabled={!validateStep()}
                className="btn-primary"
              >
                Next
              </button>
            )}
          </div>
        </div>
      ) : null}

      {/* Step indicators */}
      <div className="flex justify-center gap-2 mt-8">
        {steps.map((_, i) => (
          <button
            key={i}
            onClick={() => i < currentStep && setCurrentStep(i)}
            className={`w-3 h-3 rounded-full transition-colors ${
              i === currentStep
                ? "bg-[var(--x-blue)]"
                : i < currentStep
                ? "bg-[var(--x-blue)]/50 cursor-pointer"
                : "bg-[var(--x-bg-secondary)]"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
