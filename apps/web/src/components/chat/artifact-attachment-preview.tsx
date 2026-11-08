import { Button } from "@mingzhan/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@mingzhan/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@mingzhan/ui/tooltip";
import { cn } from "@mingzhan/ui/utils";
import {
  ArrowDown01Icon,
  Download04Icon,
  File01Icon,
  Globe02Icon,
  Image01Icon,
  Video01Icon,
  ViewIcon,
} from "hugeicons-react";
import { useArtifactAttachmentPreviewPanel } from "@/components/chat/use-artifact-attachment-preview-panel";
import { isXlsxFile } from "@/lib/artifact-spreadsheet";
import type { ChatArtifactRef } from "@/lib/chat-artifacts";
import { formatBytes } from "@/lib/knowledge-base-files";

interface ArtifactAttachmentPreviewProps {
  artifact: ChatArtifactRef;
  className?: string;
  id: string;
  profileId: string;
  /** `overlay` makes the containing file card the preview target. */
  variant?: "chip" | "icon" | "overlay";
}

export function ArtifactAttachmentPreview({
  profileId,
  id,
  artifact,
  className,
  variant = "chip",
}: ArtifactAttachmentPreviewProps) {
  const {
    imagePreviewUrl,
    isImage,
    isVideo,
    openPanel,
    downloadFile,
    downloading,
  } = useArtifactAttachmentPreviewPanel({
    artifact,
    id,
    // Preview, download, share and save all go through this id.
    profileId: artifact.ownerProfileId ?? profileId,
  });

  return (
    <ArtifactAttachmentPreviewTrigger
      artifact={artifact}
      className={className}
      downloading={downloading}
      imagePreviewUrl={imagePreviewUrl}
      isImage={isImage}
      isVideo={isVideo}
      onDownload={() => void downloadFile()}
      onOpen={openPanel}
      variant={variant}
    />
  );
}

export function FilePreviewCard({
  artifact,
  className,
  isImage,
  isVideo,
  onDownload,
  onOpen,
}: {
  artifact: ChatArtifactRef;
  className?: string;
  isImage: boolean;
  isVideo: boolean;
  onDownload: () => void;
  onOpen: () => void;
}) {
  return (
    <ArtifactAttachmentPreviewTrigger
      artifact={artifact}
      className={className}
      downloading={false}
      imagePreviewUrl={null}
      isImage={isImage}
      isVideo={isVideo}
      onDownload={onDownload}
      onOpen={onOpen}
      variant="chip"
    />
  );
}

// eslint-disable-next-line react-doctor/no-high-complexity-react-function -- The trigger renders three variants and picks a label and icon for the file type.
function ArtifactAttachmentPreviewTrigger({
  artifact,
  className,
  imagePreviewUrl,
  isImage,
  isVideo,
  onOpen,
  onDownload,
  downloading,
  variant,
}: {
  artifact: ChatArtifactRef;
  className?: string;
  imagePreviewUrl: string | null;
  isImage: boolean;
  isVideo: boolean;
  onOpen: () => void;
  onDownload: () => void;
  downloading: boolean;
  variant: "chip" | "icon" | "overlay";
}) {
  if (variant === "overlay") {
    return (
      <button
        aria-label={`View ${artifact.filename}`}
        className={cn(
          "absolute inset-0 cursor-pointer rounded-[inherit] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset",
          className
        )}
        onClick={onOpen}
        type="button"
      />
    );
  }

  if (variant === "icon") {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              aria-label="View"
              className={className}
              onClick={onOpen}
              size="icon-sm"
              title="View"
              type="button"
              variant="outline"
            >
              <ViewIcon aria-hidden className="size-3.5" />
            </Button>
          }
        />
        <TooltipContent side="top" sideOffset={8}>
          View
        </TooltipContent>
      </Tooltip>
    );
  }

  const excel = isXlsxFile(artifact.filename, artifact.mimeType);
  const extension = artifact.filename.split(".").pop()?.toLowerCase() ?? "";

  const fileTypes = new Map<string, string>([
    ["csv", "CSV"],
    ["doc", "Word"],
    ["docx", "Word"],
    ["htm", "Website"],
    ["html", "Website"],
    ["json", "JSON"],
    ["markdown", "Markdown"],
    ["md", "Markdown"],
    ["pdf", "PDF"],
    ["ppt", "PowerPoint"],
    ["pptx", "PowerPoint"],
    ["tsv", "TSV"],
    ["txt", "Text"],
    ["zip", "Archive"],
  ]);

  const website = extension === "html" || extension === "htm";

  const label = excel
    ? "Excel"
    : isImage
      ? "Image"
      : isVideo
        ? "Video"
        : (fileTypes.get(extension) ??
          (extension === artifact.filename.toLowerCase()
            ? "File"
            : extension.toUpperCase()));

  return (
    <div
      className={cn(
        "flex w-full min-w-0 max-w-full items-center gap-3 rounded-xl border border-border bg-muted/50 p-3 transition-colors hover:bg-muted/70 sm:gap-4 sm:p-4",
        className
      )}
    >
      <button
        aria-label={`Preview ${artifact.filename}`}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring sm:gap-4"
        onClick={onOpen}
        type="button"
      >
        <span
          className={cn(
            "flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-background",
            excel
              ? "text-emerald-600 dark:text-emerald-400"
              : website
                ? "text-sky-500"
                : "text-muted-foreground"
          )}
        >
          {isImage && imagePreviewUrl ? (
            <img
              alt=""
              className="size-full object-cover"
              src={imagePreviewUrl}
            />
          ) : isImage ? (
            <Image01Icon aria-hidden className="size-6" />
          ) : isVideo ? (
            <Video01Icon aria-hidden className="size-6" />
          ) : website ? (
            <Globe02Icon aria-hidden className="size-6" />
          ) : (
            <File01Icon aria-hidden className="size-6" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span
            className="block truncate font-medium text-foreground text-sm"
            title={artifact.filename}
          >
            {artifact.filename}
          </span>
          <span className="mt-1 block text-muted-foreground text-xs">
            {label}
            {artifact.sizeBytes > 0
              ? ` · ${formatBytes(artifact.sizeBytes)}`
              : ""}
          </span>
        </span>
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              aria-label={`Open in: ${artifact.filename}`}
              className="min-h-11 shrink-0 gap-1.5 sm:gap-2"
              size="sm"
              variant="outline"
            />
          }
        >
          Open in <ArrowDown01Icon aria-hidden className="size-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onOpen}>
            <ViewIcon aria-hidden className="size-4" />
            Preview
          </DropdownMenuItem>
          <DropdownMenuItem disabled={downloading} onClick={onDownload}>
            <Download04Icon aria-hidden className="size-4" />
            {downloading ? "Downloading…" : "Download"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
