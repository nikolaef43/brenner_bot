"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { parseDistillation } from "@/lib/distillation-parser";
import type { ParsedDistillation } from "@/lib/distillation-parser";

// ============================================================================
// TYPES
// ============================================================================

type ModelId = "opus" | "gpt" | "gemini";

interface ModelConfig {
  id: ModelId;
  name: string;
  shortName: string;
  color: string;
  docId: string;
}

const MODELS: ModelConfig[] = [
  {
    id: "opus",
    name: "Claude Opus 4.5",
    shortName: "Opus",
    color: "from-violet-500 to-purple-600",
    docId: "distillation-opus-45",
  },
  {
    id: "gpt",
    name: "GPT-5.2",
    shortName: "GPT",
    color: "from-emerald-500 to-teal-600",
    docId: "distillation-gpt-52",
  },
  {
    id: "gemini",
    name: "Gemini 3",
    shortName: "Gemini",
    color: "from-blue-500 to-cyan-600",
    docId: "distillation-gemini-3",
  },
];

// ============================================================================
// MODEL SELECTOR
// ============================================================================

interface ModelSelectorProps {
  selected: ModelId;
  onChange: (id: ModelId) => void;
  exclude?: ModelId[];
}

function ModelSelector({ selected, onChange, exclude = [] }: ModelSelectorProps) {
  const available = MODELS.filter((m) => !exclude.includes(m.id));
  const current = MODELS.find((m) => m.id === selected)!;

  return (
    <div className="relative">
      <select
        value={selected}
        onChange={(e) => onChange(e.target.value as ModelId)}
        className={`
          appearance-none cursor-pointer
          px-4 py-2 pr-10 rounded-xl
          bg-gradient-to-r ${current.color} text-white
          font-semibold text-sm
          border-0 outline-none
          shadow-lg
        `}
      >
        {available.map((m) => (
          <option key={m.id} value={m.id} className="bg-background text-foreground">
            {m.name}
          </option>
        ))}
      </select>
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
        <svg className="size-4 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </div>
    </div>
  );
}

// ============================================================================
// COMPARE PANE
// ============================================================================

interface ComparePaneProps {
  data: ParsedDistillation;
  model: ModelConfig;
  paneRef: React.RefObject<HTMLDivElement | null>;
  onScroll: () => void;
}

function ComparePane({ data, model, paneRef, onScroll }: ComparePaneProps) {
  return (
    <div
      ref={paneRef}
      onScroll={onScroll}
      className="flex-1 min-w-0 overflow-y-auto h-full px-4 lg:px-6 py-6 scroll-smooth"
    >
      {/* Model Header */}
      <div className="sticky top-0 z-10 -mx-4 lg:-mx-6 px-4 lg:px-6 py-3 mb-6 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-3">
          <div className={`size-8 rounded-lg bg-gradient-to-br ${model.color} flex items-center justify-center text-white font-bold text-sm shadow-md`}>
            {model.shortName[0]}
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{model.name}</h3>
            <p className="text-xs text-muted-foreground">{data.wordCount.toLocaleString()} words</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="prose prose-sm dark:prose-invert max-w-none">
        {data.parts.map((part) => (
          <div key={part.number} className="mb-8">
            {data.parts.length > 1 && (
              <h2 className="text-lg font-bold text-foreground mb-4 pb-2 border-b border-border">
                Part {part.number}: {part.title}
              </h2>
            )}

            {part.sections.map((section, sIdx) => (
              <div key={sIdx} className="mb-6">
                <h3 className={`font-semibold text-foreground mb-2 ${
                  section.level === 1 ? "text-base" : "text-sm"
                }`}>
                  {section.title}
                </h3>

                {section.content.map((content, cIdx) => {
                  switch (content.type) {
                    case "paragraph":
                      return (
                        <p key={cIdx} className="text-sm text-foreground/85 leading-relaxed mb-3">
                          {content.text}
                        </p>
                      );
                    case "quote":
                      return (
                        <blockquote
                          key={cIdx}
                          className="border-l-2 border-primary/50 pl-3 my-3 text-sm italic text-foreground/80"
                        >
                          {content.text}
                          {content.reference && (
                            <span className="text-xs text-muted-foreground ml-2">§{content.reference}</span>
                          )}
                        </blockquote>
                      );
                    case "list":
                      return content.ordered ? (
                        <ol key={cIdx} className="list-decimal list-inside space-y-1 my-3 text-sm text-foreground/85">
                          {content.items.map((item, i) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ol>
                      ) : (
                        <ul key={cIdx} className="list-disc list-inside space-y-1 my-3 text-sm text-foreground/85">
                          {content.items.map((item, i) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      );
                    case "code":
                      return (
                        <pre key={cIdx} className="bg-muted/50 rounded-lg p-3 my-3 text-xs overflow-x-auto">
                          <code>{content.text}</code>
                        </pre>
                      );
                    default:
                      return null;
                  }
                })}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// MOBILE TABS
// ============================================================================

interface MobileTabsProps {
  models: ModelConfig[];
  activeModel: ModelId;
  onSelect: (id: ModelId) => void;
}

function MobileTabs({ models, activeModel, onSelect }: MobileTabsProps) {
  return (
    <div className="flex gap-1 p-1 rounded-xl bg-muted/50">
      {models.map((m) => (
        <button
          key={m.id}
          onClick={() => onSelect(m.id)}
          className={`
            flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all
            ${activeModel === m.id
              ? `bg-gradient-to-r ${m.color} text-white shadow-md`
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }
          `}
        >
          {m.shortName}
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// MAIN COMPARE VIEW
// ============================================================================

interface CompareViewProps {
  distillations: Record<ModelId, { content: string }>;
}

export function CompareView({ distillations }: CompareViewProps) {
  // Parse all distillations
  const parsedData = Object.fromEntries(
    Object.entries(distillations).map(([id, { content }]) => {
      const model = MODELS.find((m) => m.id === id)!;
      return [id, parseDistillation(content, model.docId)];
    })
  ) as Record<ModelId, ParsedDistillation>;

  // State
  const [leftModel, setLeftModel] = useState<ModelId>("opus");
  const [rightModel, setRightModel] = useState<ModelId>("gpt");
  const [syncScroll, setSyncScroll] = useState(true);
  const [mobileActiveModel, setMobileActiveModel] = useState<ModelId>("opus");

  // Refs for synchronized scrolling
  const leftPaneRef = useRef<HTMLDivElement>(null);
  const rightPaneRef = useRef<HTMLDivElement>(null);
  const isScrolling = useRef(false);

  // Sync scroll handler
  const handleScroll = useCallback((source: "left" | "right") => {
    if (!syncScroll || isScrolling.current) return;

    const sourcePane = source === "left" ? leftPaneRef.current : rightPaneRef.current;
    const targetPane = source === "left" ? rightPaneRef.current : leftPaneRef.current;

    if (!sourcePane || !targetPane) return;

    isScrolling.current = true;

    const sourceScrollableHeight = sourcePane.scrollHeight - sourcePane.clientHeight;
    const targetScrollableHeight = targetPane.scrollHeight - targetPane.clientHeight;

    // Avoid division by zero when content doesn't overflow
    if (sourceScrollableHeight <= 0 || targetScrollableHeight <= 0) {
      isScrolling.current = false;
      return;
    }

    const scrollRatio = sourcePane.scrollTop / sourceScrollableHeight;
    const targetScrollTop = scrollRatio * targetScrollableHeight;

    targetPane.scrollTop = targetScrollTop;

    // Reset scrolling flag after a short delay
    requestAnimationFrame(() => {
      isScrolling.current = false;
    });
  }, [syncScroll]);

  const handleLeftScroll = useCallback(() => handleScroll("left"), [handleScroll]);
  const handleRightScroll = useCallback(() => handleScroll("right"), [handleScroll]);

  const leftModelConfig = MODELS.find((m) => m.id === leftModel)!;
  const rightModelConfig = MODELS.find((m) => m.id === rightModel)!;

  return (
    <div className="h-full flex flex-col">
      {/* Desktop Header */}
      <div className="hidden lg:flex items-center justify-between px-6 py-4 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <ModelSelector
            selected={leftModel}
            onChange={setLeftModel}
            exclude={[rightModel]}
          />
          <span className="text-muted-foreground">vs</span>
          <ModelSelector
            selected={rightModel}
            onChange={setRightModel}
            exclude={[leftModel]}
          />
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={syncScroll}
              onChange={(e) => setSyncScroll(e.target.checked)}
              className="rounded border-border"
            />
            <span className="text-muted-foreground">Sync scroll</span>
          </label>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden px-4 py-3 border-b border-border">
        <MobileTabs
          models={MODELS}
          activeModel={mobileActiveModel}
          onSelect={setMobileActiveModel}
        />
      </div>

      {/* Desktop Split View */}
      <div className="hidden lg:flex flex-1 min-h-0 divide-x divide-border">
        <ComparePane
          data={parsedData[leftModel]}
          model={leftModelConfig}
          paneRef={leftPaneRef}
          onScroll={handleLeftScroll}
        />
        <ComparePane
          data={parsedData[rightModel]}
          model={rightModelConfig}
          paneRef={rightPaneRef}
          onScroll={handleRightScroll}
        />
      </div>

      {/* Mobile Single View */}
      <div className="lg:hidden flex-1 overflow-y-auto px-4 py-6">
        <div className="prose prose-sm dark:prose-invert max-w-none">
          {parsedData[mobileActiveModel].parts.map((part) => (
            <div key={part.number} className="mb-8">
              {parsedData[mobileActiveModel].parts.length > 1 && (
                <h2 className="text-lg font-bold text-foreground mb-4 pb-2 border-b border-border">
                  Part {part.number}: {part.title}
                </h2>
              )}

              {part.sections.map((section, sIdx) => (
                <div key={sIdx} className="mb-6">
                  <h3 className={`font-semibold text-foreground mb-2 ${
                    section.level === 1 ? "text-base" : "text-sm"
                  }`}>
                    {section.title}
                  </h3>

                  {section.content.map((content, cIdx) => {
                    switch (content.type) {
                      case "paragraph":
                        return (
                          <p key={cIdx} className="text-sm text-foreground/85 leading-relaxed mb-3">
                            {content.text}
                          </p>
                        );
                      case "quote":
                        return (
                          <blockquote
                            key={cIdx}
                            className="border-l-2 border-primary/50 pl-3 my-3 text-sm italic text-foreground/80"
                          >
                            {content.text}
                          </blockquote>
                        );
                      case "list":
                        return content.ordered ? (
                          <ol key={cIdx} className="list-decimal list-inside space-y-1 my-3 text-sm">
                            {content.items.map((item, i) => (
                              <li key={i}>{item}</li>
                            ))}
                          </ol>
                        ) : (
                          <ul key={cIdx} className="list-disc list-inside space-y-1 my-3 text-sm">
                            {content.items.map((item, i) => (
                              <li key={i}>{item}</li>
                            ))}
                          </ul>
                        );
                      case "code":
                        return (
                          <pre key={cIdx} className="bg-muted/50 rounded-lg p-3 my-3 text-xs overflow-x-auto">
                            <code>{content.text}</code>
                          </pre>
                        );
                      default:
                        return null;
                    }
                  })}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
