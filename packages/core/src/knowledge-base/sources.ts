import type { KnowledgeBaseSource } from "../contract";

export const MINGZHAN_DOCS_SITE_URL = "https://ahmadrosid.github.io/mingzhan";

export const MINGZHAN_DOCS_LLMS_URL = `${MINGZHAN_DOCS_SITE_URL}/llms.txt`;

export const DEFAULT_KNOWLEDGE_SOURCES: KnowledgeBaseSource[] = [
  {
    description:
      "Official MíngZhàn docs index (llms.txt). Fetch this first with web_fetch, then fetch specific .md pages listed in the index.",
    enabled: true,
    id: "mingzhan-docs",
    inherited: true,
    kind: "url",
    title: "MíngZhàn Documentation",
    url: MINGZHAN_DOCS_LLMS_URL,
  },
];
