import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

export function baseOptions(): BaseLayoutProps {
  return {
    githubUrl: "https://github.com/ahmadrosid/mingzhan",
    links: [
      {
        external: true,
        text: "Managed hosting",
        url: "https://getmingzhan.cloud/",
      },
    ],
    nav: {
      title: "MíngZhàn",
    },
  };
}
