import { expect, test } from "bun:test";
import { parseVisualBlock } from "./visual-block";

test("visual accepts inline charts and nested table/stat compositions", () => {
  expect(
    parseVisualBlock(
      '{"mark":"bar","data":{"values":[{"x":"A","y":4}]},"encoding":{"x":{"field":"x"},"y":{"field":"y"}}}'
    ).mark
  ).toBe("bar");
  expect(
    parseVisualBlock(
      '{"rows":[{"stats":[{"label":"Total","value":4}]},{"table":{"columns":["A"],"rows":[[4]]}},{"columns":[{"text":"Result"}]}]}'
    ).rows
  ).toHaveLength(3);
});

test("visual rejects external and executable chart inputs and oversized blocks", () => {
  expect(() =>
    parseVisualBlock('{"mark":"bar","data":{"url":"https://example.com/data"}}')
  ).toThrow();
  expect(() =>
    parseVisualBlock(
      '{"mark":"bar","data":{"values":[]},"encoding":{"x":{"expr":"fetch()"}}}'
    )
  ).toThrow();
  expect(() =>
    parseVisualBlock('{"mark":"image","data":{"values":[]}}')
  ).toThrow();
  expect(() => parseVisualBlock(" ".repeat(300_001))).toThrow();
  expect(() => parseVisualBlock('{"rows":[1]}')).toThrow();
});

test("questions send actual selected answers and remain read-only without a chat callback", async () => {
  const { act } = await import("react");
  const { createRoot } = await import("react-dom/client");

  const { QuestionsBlock, VisualQuestionSubmitContext } = await import(
    "./visual-block"
  );

  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);

  const code = JSON.stringify({
    questions: [
      { choices: ["Mac", "Linux"], multiple: false, title: "Platform" },
    ],
    title: "Choose",
  });

  let answer = "";

  try {
    await act(async () =>
      root.render(
        <QuestionsBlock code={code} isIncomplete={false} language="questions" />
      )
    );
    expect(host.querySelector<HTMLButtonElement>("button")!.disabled).toBe(
      true
    );
    await act(async () =>
      root.render(
        <VisualQuestionSubmitContext.Provider
          value={(answers) => {
            answer = answers[0]!.answer;
          }}
        >
          <QuestionsBlock
            code={code}
            isIncomplete={false}
            language="questions"
          />
        </VisualQuestionSubmitContext.Provider>
      )
    );
    await act(async () =>
      host.querySelector<HTMLInputElement>("input")!.click()
    );
    await act(async () =>
      host.querySelector<HTMLButtonElement>("button")!.click()
    );
    expect(answer).toBe("Mac");
    expect(host.querySelector<HTMLButtonElement>("button")!.disabled).toBe(
      true
    );
  } finally {
    await act(async () => root.unmount());
    host.remove();
  }
});

test("inline Vega-Lite chart renders SVG using the CSP expression interpreter", async () => {
  const [vega, lite, { expressionInterpreter }] = await Promise.all([
    import("vega"),
    import("vega-lite"),
    import("vega-interpreter"),
  ]);

  const { spec } = lite.compile({
    data: { values: [{ count: 4, label: "A" }] },
    encoding: {
      x: { field: "label", type: "nominal" },
      y: { field: "count", type: "quantitative" },
    },
    mark: "bar",
  });

  const view = new vega.View(vega.parse(spec, undefined, { ast: true }), {
    expr: expressionInterpreter,
    renderer: "none",
  });

  try {
    const svg = await view.toSVG();
    expect(svg).toContain("<svg");
    expect(svg).toContain("A");
  } finally {
    view.finalize();
  }
}, 15_000);

test("chat Markdown routes visual and questions fences to native renderers", async () => {
  const { act } = await import("react");
  const { createRoot } = await import("react-dom/client");
  const { MemoryRouter } = await import("react-router-dom");
  const { ThemeContext } = await import("@/context/theme-context-shared");
  const { MessageResponse } = await import("./message");
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);

  const markdown =
    '```visual\n{"rows":[{"stats":[{"label":"Revenue","value":120}]},{"table":{"columns":["Month","Total"],"rows":[["Jan",120]]}}]}\n```\n\n```questions\n{"questions":[{"title":"Continue?","choices":["Yes","No"]}]}\n```';

  try {
    await act(async () =>
      root.render(
        <MemoryRouter>
          <ThemeContext.Provider
            value={{
              resolvedTheme: "light",
              setTheme: () => {},
              theme: "light",
              toggleTheme: () => {},
            }}
          >
            <MessageResponse mode="static">{markdown}</MessageResponse>
          </ThemeContext.Provider>
        </MemoryRouter>
      )
    );
    expect(host.querySelector("dl")?.textContent).toContain("Revenue");
    expect(host.querySelector("table")?.textContent).toContain("Jan");
    expect(host.querySelector("form")?.textContent).toContain("Continue?");
    expect(
      host.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled
    ).toBe(true);
  } finally {
    await act(async () => root.unmount());
    host.remove();
  }
}, 15_000);
