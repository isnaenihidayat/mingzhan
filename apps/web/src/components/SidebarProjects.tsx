import type { ProjectSummary } from "@mingzhan/core/contract";
import { Button } from "@mingzhan/ui/button";
import { cn } from "@mingzhan/ui/utils";
import {
  Add01Icon,
  ArrowDown01Icon,
  MoreHorizontalIcon,
} from "hugeicons-react";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ProjectDialog } from "@/components/projects/ProjectDialog";
import { renderProjectIcon } from "@/components/projects/project-icons";
import {
  useProjectSessionsQuery,
  useProjectsQuery,
} from "@/hooks/use-projects";
import { useLocalStorageFlag } from "@/hooks/use-sidebar-collapsed";
import { buildChatPath } from "@/lib/chat-history";

const SIDEBAR_PROJECTS_COLLAPSED_KEY = "mingzhan:sidebar-projects-collapsed";

function ProjectItem({ project }: { project: ProjectSummary }) {
  const location = useLocation();
  const href = `/projects/${encodeURIComponent(project.id)}`;
  const [expanded, setExpanded] = useState(location.pathname === href);
  const chats = useProjectSessionsQuery(expanded ? project.id : undefined);
  const panelId = `project-chats-${project.id}`;

  return (
    <div className="group/project min-w-0">
      <div className="flex min-w-0 items-center rounded-md hover:bg-muted/70">
        <button
          aria-controls={panelId}
          aria-expanded={expanded}
          className={cn(
            "flex min-w-0 flex-1 items-center gap-2.5 px-2 py-2 text-left text-muted-foreground text-sm hover:text-foreground",
            location.pathname === href && "text-foreground"
          )}
          onClick={() => setExpanded((value) => !value)}
          type="button"
        >
          <span className="shrink-0">
            {renderProjectIcon(project.icon, "size-4")}
          </span>
          <span className="truncate">{project.name}</span>
          <ArrowDown01Icon
            aria-hidden="true"
            className={cn(
              "ml-auto size-3 shrink-0 opacity-0 group-focus-within/project:opacity-60 group-hover/project:opacity-60",
              !expanded && "-rotate-90"
            )}
          />
        </button>
        <Link
          aria-label={`Buka proyek ${project.name}`}
          className="shrink-0 rounded p-1 text-muted-foreground opacity-0 hover:text-foreground focus-visible:opacity-100 group-focus-within/project:opacity-100 group-hover/project:opacity-100"
          to={href}
        >
          <MoreHorizontalIcon className="size-4" />
        </Link>
      </div>
      {expanded ? (
        <div className="space-y-0.5 pb-1 pl-8" id={panelId}>
          {chats.isLoading ? (
            <p
              className="px-2 py-1.5 text-muted-foreground text-xs"
              role="status"
            >
              Memuat chat...
            </p>
          ) : null}
          {chats.error ? (
            <div className="px-2 py-1.5 text-xs">
              <p role="alert">Chat tidak dapat dimuat.</p>
              <button
                className="underline"
                onClick={() => void chats.refetch()}
                type="button"
              >
                Coba lagi
              </button>
            </div>
          ) : null}
          {chats.data?.map((chat) => {
            const chatHref = buildChatPath(chat.profileId, chat.id);

            return (
              <Link
                aria-current={
                  location.pathname === chatHref ? "page" : undefined
                }
                className={cn(
                  "block truncate rounded-md px-2 py-2 text-muted-foreground text-sm hover:bg-muted/70 hover:text-foreground",
                  location.pathname === chatHref && "bg-muted text-foreground"
                )}
                key={chat.id}
                title={chat.title || "Untitled chat"}
                to={chatHref}
              >
                {chat.title || "Untitled chat"}
              </Link>
            );
          })}
          {chats.data?.length === 0 ? (
            <p className="px-2 py-1.5 text-muted-foreground text-xs">
              Belum ada chat.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function SidebarProjects() {
  const { data: projects = [], isLoading } = useProjectsQuery();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const { collapsed, toggle } = useLocalStorageFlag(
    SIDEBAR_PROJECTS_COLLAPSED_KEY,
    () => false
  );

  return (
    <div className="mb-2 shrink-0 px-2">
      <div className="group flex items-center justify-between py-1">
        <button
          aria-expanded={!collapsed}
          className="sidebar-nav-group-label mb-0 flex w-auto items-center gap-1.5 px-0 font-medium text-sm"
          onClick={toggle}
          type="button"
        >
          <span>Proyek</span>
          <ArrowDown01Icon
            aria-hidden="true"
            className={cn(
              "sidebar-nav-group-chevron size-3.5 opacity-0 transition-[opacity,transform] group-focus-within:opacity-100 group-hover:opacity-100",
              collapsed && "-rotate-90"
            )}
            strokeWidth={1.75}
          />
        </button>

        <Button
          aria-label="Buat proyek baru"
          className="h-6 w-6 text-muted-foreground/60 opacity-0 transition-opacity hover:text-foreground group-focus-within:opacity-100 group-hover:opacity-100"
          onClick={() => setIsCreateOpen(true)}
          size="icon-sm"
          title="Buat proyek baru"
          variant="ghost"
        >
          <Add01Icon className="h-3.5 w-3.5" />
        </Button>
      </div>

      {!collapsed && (
        <div className="space-y-0.5 pt-0.5">
          {isLoading && (
            <div className="px-2 py-1 text-muted-foreground text-xs">
              Memuat proyek...
            </div>
          )}

          {!isLoading &&
            (showAll ? projects : projects.slice(0, 5)).map((project) => (
              <ProjectItem key={project.id} project={project} />
            ))}
          {projects.length > 5 ? (
            <button
              aria-expanded={showAll}
              className="w-full rounded-md px-2 py-2 text-left text-muted-foreground text-sm hover:bg-muted/70 hover:text-foreground"
              onClick={() => setShowAll((value) => !value)}
              type="button"
            >
              {showAll ? "Show less" : "Show more"}
            </button>
          ) : null}

          {!isLoading && projects.length === 0 && (
            <button
              className="flex w-full items-center gap-2 rounded-md border border-border/70 border-dashed px-2 py-2 text-muted-foreground text-xs transition-colors hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
              onClick={() => setIsCreateOpen(true)}
              type="button"
            >
              <Add01Icon className="h-3.5 w-3.5" />
              <span>Buat Proyek Baru</span>
            </button>
          )}
        </div>
      )}

      <ProjectDialog onOpenChange={setIsCreateOpen} open={isCreateOpen} />
    </div>
  );
}
