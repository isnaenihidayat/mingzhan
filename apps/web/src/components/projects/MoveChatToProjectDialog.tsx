import { Button } from "@mingzhan/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@mingzhan/ui/dialog";
import { useQueryClient } from "@tanstack/react-query";
import { CheckmarkCircle01Icon, FolderMinusIcon } from "hugeicons-react";
import { useState } from "react";
import { useProjectsQuery } from "@/hooks/use-projects";
import { client, formatError } from "@/lib/client";
import { renderProjectIcon } from "./project-icons";

interface MoveChatToProjectDialogProps {
  currentProjectId?: string | null;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  open: boolean;
  sessionId: string;
  sessionTitle?: string | null;
}

export function MoveChatToProjectDialog({
  currentProjectId,
  onOpenChange,
  onSuccess,
  open,
  sessionId,
  sessionTitle,
}: MoveChatToProjectDialogProps) {
  const queryClient = useQueryClient();
  const { data: projects = [], isLoading } = useProjectsQuery();

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    currentProjectId ?? null
  );

  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setIsPending(true);
    setError(null);

    try {
      await client.updateSession(sessionId, {
        projectId: selectedProjectId,
      });

      await queryClient.invalidateQueries({
        queryKey: ["sessions"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["projects"],
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      setError(formatError(err));
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pindahkan ke Proyek</DialogTitle>
          <DialogDescription>
            Pilih proyek tujuan untuk obrolan{" "}
            <span className="font-medium text-foreground">
              "{sessionTitle || "Percakapan MíngZhàn"}"
            </span>
            . Obrolan akan mewarisi petunjuk kustom dan file referensi proyek
            tersebut.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {error && (
            <div className="rounded-md bg-destructive/15 p-3 text-destructive text-sm">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="py-6 text-center text-muted-foreground text-sm">
              Memuat daftar proyek...
            </div>
          ) : (
            <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
              {/* Option to clear project (General chat) */}
              <button
                className={`flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors ${
                  selectedProjectId === null
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border hover:bg-muted/50"
                }`}
                onClick={() => setSelectedProjectId(null)}
                type="button"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <FolderMinusIcon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-medium text-sm">Obrolan Umum</div>
                    <div className="text-muted-foreground text-xs">
                      Bukan bagian dari proyek manapun
                    </div>
                  </div>
                </div>
                {selectedProjectId === null && (
                  <CheckmarkCircle01Icon className="h-4 w-4 text-primary" />
                )}
              </button>

              {projects.map((project) => {
                const isSelected = selectedProjectId === project.id;
                const projectColor = project.color || "#00b2be";

                return (
                  <button
                    className={`flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors ${
                      isSelected
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border hover:bg-muted/50"
                    }`}
                    key={project.id}
                    onClick={() => setSelectedProjectId(project.id)}
                    type="button"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-md text-white shadow-xs"
                        style={{ backgroundColor: projectColor }}
                      >
                        {renderProjectIcon(project.icon, "h-4 w-4")}
                      </div>
                      <div>
                        <div className="font-medium text-foreground text-sm">
                          {project.name}
                        </div>
                        {project.description && (
                          <div className="line-clamp-1 text-muted-foreground text-xs">
                            {project.description}
                          </div>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <CheckmarkCircle01Icon className="h-4 w-4 text-primary" />
                    )}
                  </button>
                );
              })}

              {projects.length === 0 && (
                <div className="rounded-lg border border-dashed py-6 text-center text-muted-foreground text-sm">
                  Belum ada proyek yang dibuat.
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            onClick={() => onOpenChange(false)}
            type="button"
            variant="outline"
          >
            Batal
          </Button>
          <Button disabled={isPending} onClick={handleSave} type="button">
            {isPending ? "Menyimpan..." : "Terapkan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
