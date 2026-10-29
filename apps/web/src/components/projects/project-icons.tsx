import {
  AiProgrammingIcon,
  Book01Icon,
  Briefcase01Icon,
  Folder01Icon,
  Idea01Icon,
  Rocket01Icon,
  StarIcon,
} from "hugeicons-react";
import type { ComponentType } from "react";

export interface ProjectIconOption {
  icon: ComponentType<{ className?: string }>;
  id: string;
  label: string;
}

export const PROJECT_ICONS: ProjectIconOption[] = [
  { icon: Folder01Icon, id: "folder", label: "Folder" },
  { icon: Rocket01Icon, id: "rocket", label: "Roket" },
  { icon: AiProgrammingIcon, id: "code", label: "Kode" },
  { icon: Book01Icon, id: "book", label: "Buku" },
  { icon: Briefcase01Icon, id: "briefcase", label: "Karier" },
  { icon: Idea01Icon, id: "bulb", label: "Ide" },
  { icon: StarIcon, id: "star", label: "Bintang" },
];

export const PROJECT_COLORS = [
  { label: "Teal MíngZhàn", value: "#00b2be" },
  { label: "Biru", value: "#3b82f6" },
  { label: "Zamrud", value: "#10b981" },
  { label: "Ungu", value: "#8b5cf6" },
  { label: "Mawar", value: "#f43f5e" },
  { label: "Kuning", value: "#f59e0b" },
  { label: "Abu-abu", value: "#64748b" },
];

export function renderProjectIcon(iconId?: string | null, className?: string) {
  const match = PROJECT_ICONS.find((item) => item.id === iconId);
  const IconComponent = match ? match.icon : Folder01Icon;

  return <IconComponent className={className} />;
}
