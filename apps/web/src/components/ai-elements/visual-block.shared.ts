/* oxlint-disable anti-slop/no-runtime-typeof -- This is the JSON I/O boundary; primitive checks validate untrusted chart payloads before rendering. */
import type { AgentQuestionAnswer, JsonValue } from "@mingzhan/core/contract";
import { createContext } from "react";

export function record(
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

export const VisualQuestionSubmitContext = createContext<
  ((answers: AgentQuestionAnswer[]) => void) | undefined
>(undefined);
