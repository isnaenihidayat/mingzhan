import { Button } from "@mingzhan/ui/button";
import { ConfirmDialog } from "@mingzhan/ui/dialog";
import { Textarea } from "@mingzhan/ui/textarea";
import { toast } from "@mingzhan/ui/toast";
import {
  Delete02Icon,
  Download04Icon,
  Folder01Icon,
  Upload04Icon,
} from "hugeicons-react";
import { useRef, useState } from "react";
import {
  useDeleteProjectFileMutation,
  useProjectFilesQuery,
  useUploadProjectFileMutation,
} from "@/hooks/use-projects";
import { client, formatError } from "@/lib/client";

function formatBytes(bytes: number): string {
  if (bytes === 0) {
    return "0 B";
  }

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
}

export function ProjectSourcesPanel({ projectId }: { projectId: string }) {
  const [deleteFile, setDeleteFile] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const [sourceText, setSourceText] = useState("");
  const [sourceName, setSourceName] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { data: files = [], isLoading: isFilesLoading } =
    useProjectFilesQuery(projectId);

  const uploadFileMutation = useUploadProjectFileMutation();
  const deleteFileMutation = useDeleteProjectFileMutation();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      await uploadFileMutation.mutateAsync({ file, projectId });
      toast(`File "${file.name}" berhasil diunggah.`);
    } catch (err) {
      toast(formatError(err));
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    try {
      await deleteFileMutation.mutateAsync({ fileId, projectId });
      toast("File referensi dihapus.");
    } catch (err) {
      toast(formatError(err));
    }
  };

  return (
    <>
      {deleteFile ? (
        <ConfirmDialog
          confirmLabel="Hapus"
          description="Sumber ini tidak lagi tersedia untuk chat proyek."
          onClose={() => setDeleteFile(null)}
          onConfirm={async () => {
            await handleDeleteFile(deleteFile.id);
            setDeleteFile(null);
          }}
          title={`Hapus ${deleteFile.name}?`}
        />
      ) : null}
      <div className="space-y-4">
        <form
          className="space-y-3 rounded-md border p-4"
          onSubmit={async (event) => {
            event.preventDefault();

            try {
              await uploadFileMutation.mutateAsync({
                file: new File(
                  [sourceText],
                  `${sourceName.trim() || "Catatan"}.txt`,
                  { type: "text/plain" }
                ),
                projectId,
              });
              setSourceText("");
              setSourceName("");
            } catch (error) {
              toast(formatError(error));
            }
          }}
        >
          <label className="block">
            Nama sumber
            <input
              className="mt-2 w-full rounded-md border bg-background p-2"
              maxLength={120}
              onChange={(event) => setSourceName(event.target.value)}
              value={sourceName}
            />
          </label>
          <label className="block">
            Tempel teks sebagai sumber
            <Textarea
              className="mt-2"
              maxLength={50_000}
              onChange={(event) => setSourceText(event.target.value)}
              value={sourceText}
            />
          </label>
          <Button
            disabled={!sourceText.trim() || uploadFileMutation.isPending}
            type="submit"
          >
            Tambahkan sumber
          </Button>
        </form>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-base">Sumber proyek</h2>
            <p className="text-muted-foreground text-xs">
              Unggah dokumen pendukung (PDF, panduan, kode, catatan) agar dapat
              dijadikan referensi oleh AI pada obrolan di proyek ini.
            </p>
          </div>
          <div>
            <input
              aria-label="Unggah file referensi proyek"
              className="hidden"
              onChange={handleFileUpload}
              ref={fileInputRef}
              type="file"
            />
            <Button
              className="gap-1.5"
              disabled={uploadFileMutation.isPending}
              onClick={() => fileInputRef.current?.click()}
              size="sm"
            >
              <Upload04Icon className="h-4 w-4" />
              <span>
                {uploadFileMutation.isPending ? "Mengunggah..." : "Unggah File"}
              </span>
            </Button>
          </div>
        </div>

        {isFilesLoading ? (
          <div className="py-8 text-center text-muted-foreground text-sm">
            Memuat daftar file...
          </div>
        ) : files.length === 0 ? (
          <div className="rounded-xl border border-dashed p-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Folder01Icon className="h-6 w-6" />
            </div>
            <h3 className="mt-3 font-semibold text-sm">
              Belum ada file referensi
            </h3>
            <p className="mt-1 text-muted-foreground text-xs">
              Unggah dokumen spesifikasi, panduan, atau berkas data untuk
              memperkaya pemahaman AI.
            </p>
            <Button
              className="mt-4 gap-1.5"
              disabled={uploadFileMutation.isPending}
              onClick={() => fileInputRef.current?.click()}
              size="sm"
              variant="outline"
            >
              <Upload04Icon className="h-4 w-4" />
              <span>Unggah File Pertama</span>
            </Button>
          </div>
        ) : (
          <div className="divide-y rounded-xl border bg-card shadow-xs">
            {files.map((file) => (
              <div
                className="flex items-center justify-between p-4"
                key={file.id}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Folder01Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-medium text-foreground text-sm">
                      {file.filename}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      {formatBytes(file.sizeBytes)} • Diunggah{" "}
                      {new Date(file.createdAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    download={file.filename}
                    href={client.getProjectFileDownloadUrl(projectId, file.id)}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <Button size="icon" title="Unduh file" variant="ghost">
                      <Download04Icon className="h-4 w-4" />
                    </Button>
                  </a>
                  <Button
                    onClick={() =>
                      setDeleteFile({ id: file.id, name: file.filename })
                    }
                    size="icon"
                    title="Hapus file"
                    variant="ghost"
                  >
                    <Delete02Icon className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
