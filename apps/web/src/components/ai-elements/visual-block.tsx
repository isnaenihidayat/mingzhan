/* oxlint-disable anti-slop/no-runtime-typeof -- This is the JSON I/O boundary; primitive checks validate untrusted chart payloads before rendering. */
import type { AgentQuestionAnswer, JsonValue } from "@mingzhan/core/contract";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { CustomRendererProps } from "streamdown";
import { MarkdownA } from "@/components/ai-elements/markdown-a";
import { useTheme } from "@/context/use-theme";

function record(
  value: JsonValue | undefined
): value is Record<string, JsonValue> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const marks = new Set([
  "bar",
  "line",
  "area",
  "point",
  "circle",
  "square",
  "arc",
]);

export function parseVisualBlock(code: string): Record<string, JsonValue> {
  if (code.length > 300_000) {
    throw new Error("Visual block is too large.");
  }

  // SAFETY: JSON.parse returns only JSON values; check below validates the supported visual shape.
  const value = JSON.parse(code) as JsonValue;

  let parts = 0;

  function check(part: JsonValue, depth: number): void {
    if (++parts > 200) {
      throw new Error("Too many visual parts.");
    }

    if (!record(part) || depth > 8) {
      throw new Error("Invalid visual composition.");
    }

    if (part.mark) {
      const mark = record(part.mark) ? part.mark.type : part.mark;

      if (typeof mark !== "string" || !marks.has(mark)) {
        throw new Error("Unsupported chart mark.");
      }

      if (record(part.mark)) {
        const allowedMark = new Set([
          "type",
          "point",
          "innerRadius",
          "opacity",
          "strokeWidth",
        ]);

        if (
          Object.keys(part.mark).some((key) => !allowedMark.has(key)) ||
          (part.mark.point !== undefined &&
            typeof part.mark.point !== "boolean")
        ) {
          throw new Error("Unsupported chart mark options.");
        }
      }

      if (
        !(record(part.data) && Array.isArray(part.data.values)) ||
        part.data.values.length > 5000 ||
        Object.keys(part.data).some((key) => key !== "values")
      ) {
        throw new Error(
          "Charts require inline data.values (at most 5000 rows)."
        );
      }

      const allowed = new Set([
        "mark",
        "data",
        "encoding",
        "title",
        "height",
        "$schema",
      ]);

      if (Object.keys(part).some((key) => !allowed.has(key))) {
        throw new Error("Unsupported chart option.");
      }

      if (record(part.encoding)) {
        const forbidden =
          /"(?:[^"\n]*expr|test|condition|calculate|url|href|signal)"\s*:/i;

        if (forbidden.test(JSON.stringify(part.encoding))) {
          throw new Error("Executable and external encodings are unsupported.");
        }
      }

      return;
    }

    if (record(part.chart)) {
      check(part.chart, depth + 1);

      return;
    }

    const children = part.rows ?? part.columns;

    if (Array.isArray(children)) {
      if (children.length > 40) {
        throw new Error("Too many visual parts.");
      }

      for (const child of children) {
        check(child, depth + 1);
      }

      return;
    }

    if (
      Array.isArray(part.stats) &&
      part.stats.length <= 20 &&
      part.stats.every(record)
    ) {
      return;
    }

    if (
      record(part.table) &&
      Array.isArray(part.table.rows) &&
      part.table.rows.length <= 500 &&
      (!part.table.columns ||
        (Array.isArray(part.table.columns) && part.table.columns.length <= 32))
    ) {
      return;
    }

    if (
      record(part.page) &&
      typeof part.page.url === "string" &&
      /^(https?:\/\/|\/(?!\/))/.test(part.page.url)
    ) {
      return;
    }

    if (typeof part.text === "string") {
      return;
    }

    throw new Error("Unsupported visual block.");
  }

  check(value, 0);

  if (!record(value)) {
    throw new Error("Visual must be an object.");
  }

  return value;
}

function Chart({ spec }: { spec: Record<string, JsonValue> }) {
  const { resolvedTheme } = useTheme();
  const host = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    let finalize: (() => void) | undefined;
    setError("");
    void Promise.all([import("vega-embed"), import("vega-interpreter")])
      .then(async ([{ default: embed }, { expressionInterpreter }]) => {
        if (cancelled || !host.current) {
          return;
        }

        // SAFETY: parseVisualBlock restricts the chart to supported marks and inline data; the loader below denies external resources.
        const chart = {
          ...spec,
          height: Math.max(100, Math.min(600, Number(spec.height) || 250)),
          width: "container",
        } as import("vega-embed").VisualizationSpec;

        const result = await embed(host.current, chart, {
          actions: false,
          ast: true,
          config: {
            axis: {
              gridColor: resolvedTheme === "dark" ? "#404040" : "#e5e5e5",
              labelColor: resolvedTheme === "dark" ? "#d4d4d4" : "#404040",
              titleColor: resolvedTheme === "dark" ? "#e5e5e5" : "#262626",
            },
            background: "transparent",
            legend: {
              labelColor: resolvedTheme === "dark" ? "#d4d4d4" : "#404040",
              titleColor: resolvedTheme === "dark" ? "#e5e5e5" : "#262626",
            },
            title: { color: resolvedTheme === "dark" ? "#e5e5e5" : "#262626" },
          },
          expr: expressionInterpreter,
          loader: {
            file: async () => {
              throw new Error("Local chart files are disabled.");
            },
            http: async () => {
              throw new Error("External chart data is disabled.");
            },
            load: async () => {
              throw new Error("External chart data is disabled.");
            },
            sanitize: async () => {
              throw new Error("External chart resources are disabled.");
            },
          },
          mode: "vega-lite",
          renderer: "svg",
        });

        finalize = result.finalize;

        if (cancelled) {
          finalize();
        }
      })
      // oxlint-disable-next-line anti-slop/no-unknown-parameters -- Vega rejects with arbitrary values, narrowed before display.
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Chart rendering failed."
          );
        }
      });

    return () => {
      cancelled = true;
      finalize?.();
    };
  }, [resolvedTheme, spec]);

  return (
    <div className="w-full min-w-0 overflow-x-auto">
      {error ? <p role="alert">{error}</p> : null}
      <div className="w-full min-w-0" ref={host} />
    </div>
  );
}

function keyedValues<T extends JsonValue>(values: T[]) {
  const occurrences = new Map<string, number>();

  return values.map((value, index) => {
    const identity = JSON.stringify(value);
    const occurrence = occurrences.get(identity) ?? 0;
    occurrences.set(identity, occurrence + 1);

    return { index, key: `${identity}:${occurrence}`, value };
  });
}

function Part({ value }: { value: Record<string, JsonValue> }) {
  if (value.mark) {
    return <Chart spec={value} />;
  }

  if (record(value.chart)) {
    return <Part value={value.chart} />;
  }

  const children = value.rows ?? value.columns;
  const title = typeof value.title === "string" ? value.title : null;

  return (
    <section className="min-w-0 space-y-3">
      {title ? <h3 className="font-medium">{title}</h3> : null}
      {Array.isArray(children) ? (
        <div
          className={
            value.columns
              ? "grid grid-cols-1 gap-4 sm:grid-cols-2"
              : "space-y-4"
          }
        >
          {keyedValues(children.filter(record)).map(({ value: child, key }) => (
            <Part key={key} value={child} />
          ))}
        </div>
      ) : null}
      {record(value.page) ? (
        <div className="rounded-lg border border-border p-4">
          <MarkdownA href={String(value.page.url)}>
            {String(value.page.title ?? "Open page")}
          </MarkdownA>
        </div>
      ) : null}
      {typeof value.text === "string" ? (
        <p className="whitespace-pre-wrap">{value.text}</p>
      ) : null}
      {Array.isArray(value.stats) ? (
        <dl className="flex flex-wrap gap-6">
          {keyedValues(value.stats.filter(record)).map(
            ({ value: stat, key }) => (
              <div key={key}>
                <dt className="text-muted-foreground text-xs">
                  {String(stat.label ?? "")}
                </dt>
                <dd
                  className={
                    stat.tone === "good"
                      ? "font-semibold text-2xl text-emerald-600 dark:text-emerald-400"
                      : stat.tone === "bad"
                        ? "font-semibold text-2xl text-destructive"
                        : "font-semibold text-2xl"
                  }
                >
                  {String(stat.value ?? "")}
                </dd>
                {stat.note ? (
                  <p className="text-xs">{String(stat.note)}</p>
                ) : null}
              </div>
            )
          )}
        </dl>
      ) : null}
      {record(value.table) && Array.isArray(value.table.rows) ? (
        <DataTable rows={value.table.rows} table={value.table} />
      ) : null}
    </section>
  );
}

function DataTable({
  table,
  rows,
}: {
  table: Record<string, JsonValue>;
  rows: JsonValue[];
}) {
  const columns = (
    Array.isArray(table.columns)
      ? table.columns.map(String)
      : [...new Set(rows.filter(record).flatMap(Object.keys))]
  ).slice(0, 32);

  return (
    <div className="max-w-full overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr>
            {columns.map((column) => (
              <th className="border-border border-b p-2" key={column}>
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {keyedValues(rows).map(({ value: row, key }) => (
            <tr key={key}>
              {columns.map((column, col) => (
                <td className="border-border border-b p-2" key={column}>
                  {String(
                    (Array.isArray(row)
                      ? row[col]
                      : record(row)
                        ? row[column]
                        : "") ?? ""
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function VisualBlock({ code, isIncomplete }: CustomRendererProps) {
  if (isIncomplete) {
    return <p role="status">Receiving visual…</p>;
  }

  try {
    return (
      <div className="my-4 w-[48rem] min-w-0 max-w-full rounded-xl border border-border p-4">
        <Part value={parseVisualBlock(code)} />
      </div>
    );
  } catch (error) {
    return (
      <div role="alert">
        <p>{error instanceof Error ? error.message : "Invalid visual."}</p>
        <pre className="overflow-auto text-xs">{code}</pre>
      </div>
    );
  }
}

export const VisualQuestionSubmitContext = createContext<
  ((answers: AgentQuestionAnswer[]) => void) | undefined
>(undefined);

export function QuestionsBlock({ code, isIncomplete }: CustomRendererProps) {
  const submit = useContext(VisualQuestionSubmitContext);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [custom, setCustom] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (isIncomplete) {
    return <p role="status">Receiving questions…</p>;
  }

  let data: JsonValue;

  try {
    if (code.length > 30_000) {
      throw new Error("Questions block is too large.");
    }

    // SAFETY: JSON.parse returns JSON values; the boundary guards below validate the form shape.
    data = JSON.parse(code) as JsonValue;

    if (
      !(record(data) && Array.isArray(data.questions)) ||
      data.questions.length > 10 ||
      !data.questions.every(
        (q) =>
          record(q) &&
          typeof q.title === "string" &&
          Array.isArray(q.choices) &&
          q.choices.length <= 20 &&
          q.choices.every((c) => typeof c === "string")
      )
    ) {
      throw new Error("Questions need a title and a list of text choices.");
    }
  } catch (error) {
    return (
      <p role="alert">
        {error instanceof Error ? error.message : "Invalid questions block."}
      </p>
    );
  }

  if (!(record(data) && Array.isArray(data.questions))) {
    return null;
  }

  const questions = data.questions.filter(record);
  const disabled = !submit || submitted;

  return (
    <form
      className="my-4 w-full min-w-0 space-y-4 rounded-xl border border-border p-4"
      onSubmit={(event) => {
        event.preventDefault();

        if (disabled) {
          return;
        }

        const result = questions.map((q, index) => ({
          answer:
            [
              ...(answers[String(index)] ?? []),
              custom[String(index)]?.trim() ?? "",
            ]
              .filter(Boolean)
              .join(", ") || "Skipped",
          prompt: String(q.title),
          questionId: `visual-${index}`,
        }));

        if (notes.trim()) {
          result.push({
            answer: notes.trim(),
            prompt: "Additional notes",
            questionId: "visual-notes",
          });
        }

        submit?.(result);
        setSubmitted(true);
      }}
    >
      {typeof data.title === "string" ? (
        <h3 className="font-medium">{data.title}</h3>
      ) : null}
      {keyedValues(questions).map(({ value: q, index, key }) => {
        const selected = new Set(answers[String(index)] ?? []);

        return (
          <fieldset className="space-y-2" disabled={disabled} key={key}>
            <legend>{String(q.title)}</legend>
            {Array.isArray(q.choices)
              ? keyedValues(q.choices).map(
                  ({ value: choice, key: choiceKey }) => (
                    <label
                      className="flex items-center gap-2 text-sm"
                      key={choiceKey}
                    >
                      <input
                        checked={selected.has(String(choice))}
                        name={`visual-question-${index}`}
                        onChange={() =>
                          setAnswers((prev) => {
                            const old = new Set(prev[String(index)] ?? []);

                            return {
                              ...prev,
                              [String(index)]:
                                q.multiple === true
                                  ? old.has(String(choice))
                                    ? [...old].filter((v) => v !== choice)
                                    : [...old, String(choice)]
                                  : [String(choice)],
                            };
                          })
                        }
                        onClick={() => {
                          if (q.multiple !== true) {
                            setCustom((prev) => ({
                              ...prev,
                              [String(index)]: "",
                            }));
                          }
                        }}
                        type={q.multiple === true ? "checkbox" : "radio"}
                      />
                      {String(choice)}
                    </label>
                  )
                )
              : null}
            <label className="block text-muted-foreground text-xs">
              Other answer
              <input
                className="mt-1 w-full rounded border border-border bg-background p-2 text-sm"
                onChange={(event) => {
                  const text = event.target.value;
                  setCustom((prev) => ({ ...prev, [String(index)]: text }));

                  if (q.multiple !== true && text.trim()) {
                    setAnswers((prev) => ({ ...prev, [String(index)]: [] }));
                  }
                }}
                value={custom[String(index)] ?? ""}
              />
            </label>
          </fieldset>
        );
      })}
      <label className="block text-sm">
        Additional notes
        <textarea
          className="mt-2 w-full rounded border border-border bg-background p-2"
          disabled={disabled}
          onChange={(event) => setNotes(event.target.value)}
          value={notes}
        />
      </label>
      <button
        className="rounded-lg border border-border px-3 py-2 text-sm disabled:opacity-50"
        disabled={disabled}
        type="submit"
      >
        {submitted
          ? "Answers sent"
          : submit
            ? "Send answers"
            : "Read-only form"}
      </button>
    </form>
  );
}
