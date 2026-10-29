import type { ProjectSummary } from "@mingzhan/core/contract";
import { Button } from "@mingzhan/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@mingzhan/ui/dialog";
import { Input } from "@mingzhan/ui/input";
import { Textarea } from "@mingzhan/ui/textarea";
import { useEffect, useState } from "react";
import {
  useCreateProjectMutation,
  useUpdateProjectMutation,
} from "@/hooks/use-projects";
import { formatError } from "@/lib/client";
import {
  PROJECT_COLORS,
  PROJECT_ICONS,
  renderProjectIcon,
} from "./project-icons";

interface ProjectDialogProps {
  onOpenChange: (open: boolean) => void;
  onSuccess?: (savedProject: ProjectSummary) => void;
  open: boolean;
  project?: ProjectSummary | null;
}

export function ProjectDialog({
  onOpenChange,
  onSuccess,
  open,
  project,
}: ProjectDialogProps) {
  const isEditing = Boolean(project);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("folder");
  const [color, setColor] = useState("#00b2be");
  const [customInstructions, setCustomInstructions] = useState("");
  const [error, setError] = useState<string | null>(null);

  const createMutation = useCreateProjectMutation();
  const updateMutation = useUpdateProjectMutation();

  useEffect(() => {
    if (project) {
      setName(project.name);
      setDescription(project.description || "");
      setIcon(project.icon || "folder");
      setColor(project.color || "#00b2be");
      setCustomInstructions(project.customInstructions || "");
    } else {
      setName("");
      setDescription("");
      setIcon("folder");
      setColor("#00b2be");
      setCustomInstructions("");
    }

    setError(null);
  }, [project, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError("Nama proyek wajib diisi.");

      return;
    }

    try {
      if (isEditing && project) {
        const updated = await updateMutation.mutateAsync({
          id: project.id,
          request: {
            color,
            customInstructions: customInstructions.trim(),
            description: description.trim(),
            icon,
            name: name.trim(),
          },
        });

        onSuccess?.(updated);
      } else {
        const created = await createMutation.mutateAsync({
          color,
          customInstructions: customInstructions.trim(),
          description: description.trim(),
          icon,
          name: name.trim(),
        });

        onSuccess?.(created);
      }

      onOpenChange(false);
    } catch (err) {
      setError(formatError(err));
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg shadow-sm"
                style={{ backgroundColor: `${color}20`, color }}
              >
                {renderProjectIcon(icon, "h-5 w-5")}
              </div>
              <div>
                <DialogTitle>
                  {isEditing ? "Edit Proyek" : "Buat Proyek Baru"}
                </DialogTitle>
                <DialogDescription>
                  Proyek menyatukan obrolan, petunjuk kustom, dan file referensi
                  dalam satu ruang kerja.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {error && (
              <div className="rounded-md bg-destructive/15 p-3 text-destructive text-sm">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="font-medium text-sm" htmlFor="project-name">
                Nama Proyek <span className="text-destructive">*</span>
              </label>
              <Input
                id="project-name"
                onChange={(e) => setName(e.target.value)}
                placeholder="mis. Riset Pasar 2026, Backend Refactoring..."
                value={name}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="font-medium text-sm">Ikon</label>
                <div className="flex flex-wrap gap-1.5">
                  {PROJECT_ICONS.map((item) => {
                    const isSelected = icon === item.id;
                    const IconComp = item.icon;

                    return (
                      <button
                        className={`flex h-8 w-8 items-center justify-center rounded-md border text-muted-foreground transition-all hover:bg-muted ${
                          isSelected
                            ? "border-primary bg-primary/10 text-primary shadow-xs"
                            : "border-border"
                        }`}
                        key={item.id}
                        onClick={() => setIcon(item.id)}
                        title={item.label}
                        type="button"
                      >
                        <IconComp className="h-4 w-4" />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-medium text-sm">Warna Tema</label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {PROJECT_COLORS.map((c) => {
                    const isSelected = color === c.value;

                    return (
                      <button
                        className={`h-6 w-6 rounded-full transition-transform hover:scale-110 ${
                          isSelected ? "ring-2 ring-primary ring-offset-2" : ""
                        }`}
                        key={c.value}
                        onClick={() => setColor(c.value)}
                        style={{ backgroundColor: c.value }}
                        title={c.label}
                        type="button"
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                className="font-medium text-sm"
                htmlFor="project-description"
              >
                Deskripsi Singkat (Opsional)
              </label>
              <Input
                id="project-description"
                onChange={(e) => setDescription(e.target.value)}
                placeholder="mis. Fokus analisis arsitektur dan integrasi API"
                value={description}
              />
            </div>

            <div className="space-y-1.5">
              <label
                className="font-medium text-sm"
                htmlFor="project-instructions"
              >
                Petunjuk Kustom Proyek (Opsional)
              </label>
              <Textarea
                className="min-h-[90px] text-xs"
                id="project-instructions"
                onChange={(e) => setCustomInstructions(e.target.value)}
                placeholder="Beri tahu MíngZhàn cara merespons dalam proyek ini (mis. gaya bahasa, arsitektur yang dipakai, aturan validasi data)..."
                value={customInstructions}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              onClick={() => onOpenChange(false)}
              type="button"
              variant="outline"
            >
              Batal
            </Button>
            <Button disabled={isPending} type="submit">
              {isPending
                ? "Menyimpan..."
                : isEditing
                  ? "Simpan Perubahan"
                  : "Buat Proyek"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
