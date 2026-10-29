import { Button } from "@mingzhan/ui/button";
import { ConfirmDialog } from "@mingzhan/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@mingzhan/ui/dropdown-menu";
import { Textarea } from "@mingzhan/ui/textarea";
import { toast } from "@mingzhan/ui/toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  Add01Icon,
  ArrowLeft01Icon,
  Comment01Icon,
  Delete02Icon,
  Folder01Icon,
  FolderMinusIcon,
  MoreHorizontalIcon,
  PencilEdit02Icon,
} from "hugeicons-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ProjectDialog } from "@/components/projects/ProjectDialog";
import { ProjectSourcesPanel } from "@/components/projects/ProjectSourcesPanel";
import { renderProjectIcon } from "@/components/projects/project-icons";
import { useActiveChatProfile } from "@/context/use-active-chat-profile";
import {
  useDeleteProjectMutation,
  useProjectFilesQuery,
  useProjectQuery,
  useProjectSessionsQuery,
  useUpdateProjectMutation,
} from "@/hooks/use-projects";
import { buildChatPath, buildNewChatPath } from "@/lib/chat-history";
import { client, formatError } from "@/lib/client";

type ProjectTab = "chats" | "files" | "instructions";

export function ProjectWorkspacePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profileId: activeProfileId } = useActiveChatProfile();

  const [confirmDeleteProject, setConfirmDeleteProject] = useState(false);

  const [activeTab, setActiveTab] = useState<ProjectTab>("chats");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [instructionsDraft, setInstructionsDraft] = useState("");

  const {
    data: project,
    error: projectError,
    isLoading: isProjectLoading,
  } = useProjectQuery(projectId);

  const { data: files = [] } = useProjectFilesQuery(projectId);

  const sessionsQuery = useProjectSessionsQuery(projectId);

  const updateMutation = useUpdateProjectMutation();
  const deleteMutation = useDeleteProjectMutation();

  useEffect(() => {
    if (project) {
      setInstructionsDraft(project.customInstructions || "");
    }
  }, [project]);

  if (isProjectLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground text-sm">Memuat proyek...</div>
      </div>
    );
  }

  if (projectError || !project) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="font-semibold text-base">Proyek tidak ditemukan</div>
        <p className="max-w-sm text-muted-foreground text-sm">
          Proyek ini mungkin telah dihapus atau Anda tidak memiliki akses ke
          proyek ini.
        </p>
        <Button onClick={() => navigate("/")} variant="outline">
          Kembali ke Obrolan
        </Button>
      </div>
    );
  }

  const projectColor = project.color || "#00b2be";

  const projectSessions = (sessionsQuery.data ?? []).filter(
    (s) => s.projectId === project.id
  );

  const handleStartNewChat = () => {
    localStorage.setItem("mingzhan:active-project-id", project.id);
    const profileId = project.defaultProfileId || activeProfileId;
    navigate(
      `${buildNewChatPath(profileId)}&project=${encodeURIComponent(project.id)}`
    );
  };

  const handleOpenSession = (sessionId: string) => {
    localStorage.setItem("mingzhan:active-project-id", project.id);
    const session = projectSessions.find((item) => item.id === sessionId);

    if (session) {
      navigate(buildChatPath(session.profileId, session.id));
    }
  };

  const handleRemoveSessionFromProject = async (sessionId: string) => {
    try {
      await client.updateSession(sessionId, { projectId: null });
      await queryClient.invalidateQueries({ queryKey: ["sessions"] });
      toast("Obrolan dikeluarkan dari proyek.");
    } catch (err) {
      toast(formatError(err));
    }
  };

  const handleDeleteProject = async () => {
    try {
      await deleteMutation.mutateAsync(project.id);
      localStorage.removeItem("mingzhan:active-project-id");
      toast("Proyek berhasil dihapus.");
      navigate("/");
    } catch (err) {
      toast(formatError(err));
    }
  };

  const handleSaveInstructions = async () => {
    try {
      await updateMutation.mutateAsync({
        id: project.id,
        request: {
          customInstructions: instructionsDraft.trim(),
        },
      });
      toast("Petunjuk kustom proyek berhasil disimpan.");
    } catch (err) {
      toast(formatError(err));
    }
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-background">
      {confirmDeleteProject ? (
        <ConfirmDialog
          confirmLabel="Hapus"
          description="File dan petunjuk proyek akan dihapus. Chat tetap disimpan sebagai obrolan umum."
          onClose={() => setConfirmDeleteProject(false)}
          onConfirm={handleDeleteProject}
          title="Hapus proyek?"
        />
      ) : null}
      {/* Top Banner / Breadcrumb */}
      <div className="border-b px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <button
            className="flex items-center gap-1.5 text-muted-foreground text-xs transition-colors hover:text-foreground"
            onClick={() => navigate("/")}
            type="button"
          >
            <ArrowLeft01Icon className="h-4 w-4" />
            <span>Kembali ke Obrolan</span>
          </button>

          <div className="flex items-center gap-2">
            <Button
              className="gap-1.5 shadow-xs"
              onClick={handleStartNewChat}
              size="sm"
            >
              <Add01Icon className="h-4 w-4" />
              <span>Chat Baru di Proyek Ini</span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    aria-label="Pengaturan proyek"
                    size="icon"
                    variant="ghost"
                  />
                }
              >
                <MoreHorizontalIcon className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)}>
                  <PencilEdit02Icon className="mr-2 h-4 w-4" />
                  <span>Pengaturan proyek</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setConfirmDeleteProject(true)}
                >
                  <Delete02Icon className="mr-2 h-4 w-4" />
                  <span>Hapus Proyek</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Project Hero Header */}
      <div className="border-b bg-card/40 px-6 py-8">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-start gap-4">
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
              style={{ backgroundColor: projectColor }}
            >
              {renderProjectIcon(project.icon, "h-7 w-7")}
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-3">
                <h1 className="font-bold text-2xl tracking-tight">
                  {project.name}
                </h1>
                <span
                  className="rounded-full px-2.5 py-0.5 font-medium text-xs"
                  style={{
                    backgroundColor: `${projectColor}20`,
                    color: projectColor,
                  }}
                >
                  Proyek
                </span>
              </div>
              <p className="text-muted-foreground text-sm">
                {project.description ||
                  "Chat, sumber, dan petunjuk untuk pekerjaan ini."}
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="mt-8 flex gap-2 border-b">
            <button
              className={`flex items-center gap-2 border-b-2 px-4 py-2 font-medium text-sm transition-colors ${
                activeTab === "chats"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setActiveTab("chats")}
              type="button"
            >
              <Comment01Icon className="h-4 w-4" />
              <span>Obrolan ({projectSessions.length})</span>
            </button>

            <button
              className={`flex items-center gap-2 border-b-2 px-4 py-2 font-medium text-sm transition-colors ${
                activeTab === "files"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setActiveTab("files")}
              type="button"
            >
              <Folder01Icon className="h-4 w-4" />
              <span>Sumber ({files.length})</span>
            </button>

            <button
              className={`flex items-center gap-2 border-b-2 px-4 py-2 font-medium text-sm transition-colors ${
                activeTab === "instructions"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setActiveTab("instructions")}
              type="button"
            >
              <PencilEdit02Icon className="h-4 w-4" />
              <span>Petunjuk Kustom</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 px-6 py-6">
        <div className="mx-auto max-w-5xl">
          {/* TAB 1: CHATS */}
          {activeTab === "chats" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-base">Daftar Obrolan</h2>
                  <p className="text-muted-foreground text-xs">
                    Semua obrolan dalam proyek ini mewarisi petunjuk kustom dan
                    file referensi pengetahuan proyek.
                  </p>
                </div>
                <Button
                  className="gap-1.5"
                  onClick={handleStartNewChat}
                  size="sm"
                  variant="outline"
                >
                  <Add01Icon className="h-4 w-4" />
                  <span>Chat Baru</span>
                </Button>
              </div>

              {projectSessions.length === 0 ? (
                <div className="rounded-xl border border-dashed p-10 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <Comment01Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-3 font-semibold text-sm">
                    Belum ada obrolan di proyek ini
                  </h3>
                  <p className="mt-1 text-muted-foreground text-xs">
                    Mulai percakapan baru untuk mendiskusikan topik dengan
                    konteks proyek ini.
                  </p>
                  <Button
                    className="mt-4 gap-1.5"
                    onClick={handleStartNewChat}
                    size="sm"
                  >
                    <Add01Icon className="h-4 w-4" />
                    <span>Mulai Chat Pertama</span>
                  </Button>
                </div>
              ) : (
                <div className="divide-y rounded-xl border bg-card shadow-xs">
                  {projectSessions.map((s) => (
                    <div
                      className="flex items-center justify-between p-4 transition-colors hover:bg-muted/50"
                      key={s.id}
                    >
                      <button
                        className="flex flex-1 items-center gap-3 text-left"
                        onClick={() => handleOpenSession(s.id)}
                        type="button"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Comment01Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-medium text-foreground text-sm">
                            {s.title || "Percakapan MíngZhàn"}
                          </div>
                          <div className="text-muted-foreground text-xs">
                            {s.messageCount} pesan • Terakhir diperbarui{" "}
                            {new Date(s.updatedAt).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </div>
                        </div>
                      </button>

                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => handleOpenSession(s.id)}
                          size="sm"
                          variant="ghost"
                        >
                          Buka Obrolan
                        </Button>
                        <Button
                          onClick={() => handleRemoveSessionFromProject(s.id)}
                          size="icon"
                          title="Keluarkan dari proyek"
                          variant="ghost"
                        >
                          <FolderMinusIcon className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: FILES (KNOWLEDGE) */}
          {activeTab === "files" ? (
            <ProjectSourcesPanel projectId={project.id} />
          ) : null}

          {/* TAB 3: INSTRUCTIONS */}
          {activeTab === "instructions" && (
            <div className="space-y-4">
              <div>
                <h2 className="font-semibold text-base">
                  Petunjuk Kustom Proyek
                </h2>
                <p className="text-muted-foreground text-xs">
                  Petunjuk ini akan disematkan secara otomatis ke dalam prompt
                  sistem untuk semua percakapan di dalam proyek ini.
                </p>
              </div>

              <div className="rounded-xl border bg-card p-4 shadow-xs">
                <Textarea
                  className="min-h-[220px] text-sm"
                  onChange={(e) => setInstructionsDraft(e.target.value)}
                  placeholder="Contoh: Selalu jawab dalam bahasa Indonesia baku. Gunakan TypeScript strict mode dan sertakan komentar dokumentasi. Fokus pada performa dan hindari dependensi pihak ketiga yang tidak perlu..."
                  value={instructionsDraft}
                />

                <div className="mt-4 flex items-center justify-end">
                  <Button
                    disabled={updateMutation.isPending}
                    onClick={handleSaveInstructions}
                    size="sm"
                  >
                    {updateMutation.isPending
                      ? "Menyimpan..."
                      : "Simpan Petunjuk"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <ProjectDialog
        onOpenChange={setIsEditDialogOpen}
        open={isEditDialogOpen}
        project={project}
      />
    </div>
  );
}
