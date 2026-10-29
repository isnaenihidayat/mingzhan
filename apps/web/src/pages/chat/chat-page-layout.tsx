import type { ProfileSummary } from "@mingzhan/core/contract";
import { cn } from "@mingzhan/ui/utils";
import {
  Analytics01Icon,
  ArrowRight01Icon,
  Book01Icon,
  ChartHistogramIcon,
  Coins01Icon,
  GitBranchIcon,
  Invoice01Icon,
  Location01Icon,
  Megaphone01Icon,
  MoneyBag01Icon,
  PresentationBarChart01Icon,
  Shield01Icon,
  SourceCodeIcon,
  SparklesIcon,
  Target01Icon,
  UserGroupIcon,
} from "hugeicons-react";
import { useEffect, useRef, useState } from "react";
import { useOptionalPromptInputController } from "@/components/ai-elements/prompt-input-context";
import { ChatProfileSwitcher } from "@/components/chat/chat-profile-switcher";
import { useChatAttachmentPanel } from "@/context/use-chat-attachment-panel";
import { useLanguage } from "@/context/use-language";
import { TRANSLATIONS } from "@/lib/language";
import { welcomeAnimationKey } from "@/pages/chat/chat-page.shared";

/**
 * Applied straight to the column rather than as an overlay child, so nothing
 * has to be lifted out of the way with z-index. It follows the app theme: a
 * pale indigo glow in light mode, the near-black one in dark mode.
 */
const COGNITO_SURFACE =
  "bg-[radial-gradient(125%_125%_at_50%_100%,#ffffff_40%,#f1f5f9_100%)] dark:bg-[radial-gradient(125%_125%_at_50%_100%,#0c0d12_40%,#141721_100%)]";

/** Size of one dither pixel, in CSS pixels. */
const DITHER_CELL_PX = 4;

const DITHER_FRAME_MS = 1000 / 20;

/**
 * The canvas is drawn at a higher opacity than the idle pattern needs, so a
 * ripple can be brighter than the background. Idle pixels use a low alpha to
 * keep the old look.
 */
const DITHER_BASE_ALPHA = 32;

const RIPPLE_ALPHA = 255;

const RIPPLE_MS = 5000;

const RIPPLE_MAX = 6;

/** Clicks on these elements do their own job and do not touch the water. */
const RIPPLE_IGNORE =
  "button, a, input, textarea, select, label, [contenteditable='true'], [role='menu'], [role='listbox'], [role='dialog']";

interface Ripple {
  start: number;
  x: number;
  y: number;
}

/** Normalised 8x8 Bayer thresholds, the same ordered dither as the logo. */
function bayerThresholds(): number[] {
  let matrix = [[0]];

  while (matrix.length < 8) {
    const prev = matrix;
    const n = prev.length;
    matrix = Array.from({ length: n * 2 }, (_, y) =>
      Array.from(
        { length: n * 2 },
        (_, x) =>
          4 * prev[y % n][x % n] +
          [0, 2, 3, 1][(y >= n ? 2 : 0) + (x >= n ? 1 : 0)]
      )
    );
  }

  return matrix.flat().map((value) => (value + 0.5) / 64);
}

/** Tone at a point: three soft shapes on slow orbits, faded toward the edges. */
function ditherTone(x: number, y: number, aspect: number, t: number): number {
  let tone = 0;

  for (let k = 0; k < 3; k++) {
    const cx = 0.5 + 0.38 * Math.sin(t * 0.000_06 + k * 2.1);
    const cy = 0.5 + 0.34 * Math.cos(t * 0.000_04 + k * 1.7);
    const dx = (x - cx) * aspect;
    const dy = y - cy;
    tone += Math.exp(-(dx * dx + dy * dy) / 0.06);
  }

  const edge = Math.hypot((x - 0.5) * aspect, y - 0.5);

  return Math.min(tone, 1) * 0.55 * Math.max(0, 1 - edge * 1.1);
}

/** Signed wave height at a point: rings that spread out and fade from each click. */
function rippleWave(
  x: number,
  y: number,
  aspect: number,
  t: number,
  ripples: Ripple[]
): number {
  let wave = 0;

  for (const ripple of ripples) {
    const age = (t - ripple.start) / RIPPLE_MS;

    if (age < 0 || age >= 1) {
      continue;
    }

    const distance = Math.hypot((x - ripple.x) * aspect, y - ripple.y);
    // Ease out, so the rings slow down as they spread, like real water.
    const phase = distance - (1 - (1 - age) ** 2) * 0.55;
    const envelope = Math.exp(-(phase * phase) / 0.006);
    wave += Math.cos(phase * 60) * envelope * (1 - age) ** 2;
  }

  return wave;
}

function ChatDitherBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");

    if (!(canvas && ctx)) {
      return;
    }

    const thresholds = bayerThresholds();
    let image = ctx.createImageData(1, 1);
    let rippleImage = ctx.createImageData(1, 1);
    let ripples: Ripple[] = [];
    // The ripple is painted in a second colour, so it needs its own layer.
    const rippleLayer = document.createElement("canvas");
    const rippleCtx = rippleLayer.getContext("2d");

    const draw = (time: number) => {
      const { width, height, data } = image;
      const rippleData = rippleImage.data;
      const aspect = width / height;
      ripples = ripples.filter((ripple) => time - ripple.start < RIPPLE_MS);

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const u = x / width;
          const v = y / height;
          const i = (y * width + x) * 4 + 3;
          const threshold = thresholds[(y % 8) * 8 + (x % 8)];

          const wave =
            ripples.length > 0 ? rippleWave(u, v, aspect, time, ripples) : 0;

          // The wave also bends the pattern under it, like light through water.
          const tone = ditherTone(
            u + wave * 0.025,
            v + wave * 0.025,
            aspect,
            time
          );

          // The ripple only moves water that is already there: where the
          // background has no shape, the rings fade out, so they follow its
          // outline instead of drawing a full circle.
          const surface = Math.min(1, tone * 3);
          const ripple = wave * surface;
          // One pattern, not two: crests raise the tone and troughs cut holes
          // in it, and lit pixels near a crest take the primary colour.
          const on = tone + ripple * 0.5 > threshold;
          const glow = Math.min(1, Math.max(0, ripple));
          const lit = on && glow > 0.15;

          data[i] = on && !lit ? DITHER_BASE_ALPHA : 0;
          rippleData[i] = lit ? RIPPLE_ALPHA * glow : 0;
        }
      }

      const style = getComputedStyle(canvas);

      ctx.globalCompositeOperation = "copy";
      ctx.putImageData(image, 0, 0);
      // Recolour the mask with the theme text colour, whatever format it is in.
      ctx.globalCompositeOperation = "source-in";
      ctx.fillStyle = style.color;
      ctx.fillRect(0, 0, width, height);

      if (!(rippleCtx && ripples.length > 0)) {
        return;
      }

      rippleCtx.globalCompositeOperation = "copy";
      rippleCtx.putImageData(rippleImage, 0, 0);
      rippleCtx.globalCompositeOperation = "source-in";
      rippleCtx.fillStyle = style.getPropertyValue("--primary").trim();
      rippleCtx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = "source-over";
      ctx.drawImage(rippleLayer, 0, 0);
    };

    const resize = () => {
      canvas.width = Math.max(
        1,
        Math.ceil(canvas.clientWidth / DITHER_CELL_PX)
      );
      canvas.height = Math.max(
        1,
        Math.ceil(canvas.clientHeight / DITHER_CELL_PX)
      );
      rippleLayer.width = canvas.width;
      rippleLayer.height = canvas.height;
      image = ctx.createImageData(canvas.width, canvas.height);
      rippleImage = ctx.createImageData(canvas.width, canvas.height);
      draw(performance.now());
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return () => observer.disconnect();
    }

    let frame = 0;
    let last = 0;

    const tick = (time: number) => {
      // Full frame rate while a ripple moves, so the rings do not stutter.
      if (ripples.length > 0 || time - last >= DITHER_FRAME_MS) {
        last = time;
        draw(time);
      }

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);

    const surface = canvas.parentElement;

    const onPointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Element &&
        event.target.closest(RIPPLE_IGNORE)
      ) {
        return;
      }

      const rect = canvas.getBoundingClientRect();
      ripples = [
        ...ripples.slice(-(RIPPLE_MAX - 1)),
        {
          start: performance.now(),
          x: (event.clientX - rect.left) / rect.width,
          y: (event.clientY - rect.top) / rect.height,
        },
      ];
    };

    surface?.addEventListener("pointerdown", onPointerDown);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      surface?.removeEventListener("pointerdown", onPointerDown);
    };
  }, []);

  return (
    <canvas
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 size-full text-foreground opacity-[0.24] [image-rendering:pixelated] dark:opacity-[0.32]"
      ref={canvasRef}
    />
  );
}

export function ChatPageColumn({
  children,
  centered = false,
  cognito = false,
}: {
  children: React.ReactNode;
  centered?: boolean;
  cognito?: boolean;
}) {
  const attachmentPanel = useChatAttachmentPanel();

  return (
    <div
      className={cn(
        cognito && COGNITO_SURFACE,
        // `relative` so a page-level control can pin itself to this column's
        // top-right corner, which is the top-right of the screen area.
        "relative isolate flex min-h-0 min-w-0 flex-col transition-[width,opacity,padding] duration-200 ease-out motion-reduce:transition-none",
        attachmentPanel.isFullscreen
          ? "pointer-events-none w-0 flex-none overflow-hidden px-0 opacity-0"
          : "flex-1 px-3 sm:px-6",
        // No room for two columns on a phone, so an open panel takes over.
        attachmentPanel.isOpen &&
          "max-sm:pointer-events-none max-sm:w-0 max-sm:flex-none max-sm:overflow-hidden max-sm:px-0 max-sm:opacity-0",
        centered && "justify-center"
      )}
    >
      {centered && !cognito && <ChatDitherBackground />}
      {children}
    </div>
  );
}

/**
 * In cognito the pleasantry is the least useful thing on screen, so the slot
 * says what the mode actually does instead.
 */
function CognitoWelcome() {
  return (
    <>
      <h2 className="type-section-title text-xl tracking-tight">
        Cognito chat
      </h2>
      <p className="type-body text-muted-foreground text-sm">
        Not saved, never in History, never written to memory. Reloading the page
        ends it. It still uses memory, plugins, skills and this agent's
        instructions.
      </p>
    </>
  );
}

export function AgentMascot({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none relative transform select-none transition-transform duration-300 hover:scale-105",
        className
      )}
    >
      <img
        alt="Agent Mascot"
        className="h-auto w-24 drop-shadow-[0_14px_28px_rgba(0,0,0,0.35)] sm:w-32"
        draggable={false}
        src="/duck-mascot.png"
      />
    </div>
  );
}

export interface SuggestionCategory {
  icon: React.ComponentType<{ className?: string }>;
  id: string;
  items: {
    icon: React.ComponentType<{ className?: string }>;
    prompt: string;
    text: string;
  }[];
  label: string;
}

export const SUGGESTION_CATEGORIES: SuggestionCategory[] = [
  {
    icon: Target01Icon,
    id: "sales",
    items: [
      {
        icon: PresentationBarChart01Icon,
        prompt:
          "Buatkan draft proposal penawaran media plan OOH/DOOH untuk brand FMCG, mencakup rekomendasi titik videotron strategis, estimasi traffic impression, dan simulasi paket harga bundling.",
        text: "Penyusunan proposal penawaran media plan billboard & videotron untuk klien korporat.",
      },
      {
        icon: Location01Icon,
        prompt:
          "Cek occupancy rate dan ketersediaan slot tayang videotron LED di area Sudirman-Thamrin dan Gatot Subroto untuk periode Q3-Q4.",
        text: "Pengecekan ketersediaan (occupancy) dan jadwal slot tayang spot DOOH prime area.",
      },
      {
        icon: Coins01Icon,
        prompt:
          "Hitung simulasi pricing dan margin profit jika klien agency meminta diskon kontrak sewa 12 bulan untuk 3 titik billboard statis dengan pembayaran bertahap.",
        text: "Simulasi rate card diskon progresif berdasarkan durasi sewa spot OOH tahunan.",
      },
    ],
    label: "Sales & Revenue",
  },
  {
    icon: Megaphone01Icon,
    id: "marketing",
    items: [
      {
        icon: Analytics01Icon,
        prompt:
          "Analisis profil demografi audiens, estimasi traffic harian, dan peak hours untuk titik DOOH dekat pusat perbelanjaan dan stasiun MRT guna mendukung pitch deck klien.",
        text: "Analisis estimasi VAC (Visual Attention Catchers) dan demografi audiens titik DOOH.",
      },
      {
        icon: SparklesIcon,
        prompt:
          "Berikan 5 konsep ide kampanye pDOOH kreatif (programmatic DOOH) berbasis trigger cuaca real-time dan interaksi mobile untuk brand otomotif.",
        text: "Ide kampanye interaktif DOOH terintegrasi QR code, pDOOH, dan dynamic content trigger.",
      },
      {
        icon: ChartHistogramIcon,
        prompt:
          "Susun kerangka laporan akhir kampanye tayang DOOH (Post-Buy Report), mencakup total play count, share of voice (SOV), foto dokumentasi waktu tayang, dan ringkasan jangkauan audiens.",
        text: "Pembuatan laporan campaign post-buy report dan bukti tayang (Proof of Play) ke advertiser.",
      },
    ],
    label: "Marketing",
  },
  {
    icon: MoneyBag01Icon,
    id: "finance",
    items: [
      {
        icon: Invoice01Icon,
        prompt:
          "Bantu buatkan template dan strategi follow-up reminder piutang invoice sewa billboard agency yang jatuh tempo di atas 60 hari beserta perhitungan denda keterlambatan.",
        text: "Rekonsiliasi invoice penagihan sewa media OOH & monitoring aging piutang agency.",
      },
      {
        icon: Coins01Icon,
        prompt:
          "Hitung proyeksi CAPEX, biaya sewa lahan pemerintah, konsumsi listrik bulanan, serta perkiraan break-even point (BEP) untuk investasi unit videotron LED 8x16 meter di lokasi arteri.",
        text: "Kalkulasi proyeksi ROI dan payback period investasi pemasangan konstruksi LED billboard baru.",
      },
      {
        icon: Book01Icon,
        prompt:
          "Susun checklist audit kepatuhan pembayaran Pajak Reklame Daerah, retribusi perpanjangan IMB/PBG konstruksi reklame, dan biaya sewa lahan swasta tahun berjalan.",
        text: "Audit kepatuhan pembayaran Pajak Reklame (BPRD) dan biaya sewa lahan izin titik reklame.",
      },
    ],
    label: "Finance",
  },
  {
    icon: SourceCodeIcon,
    id: "it",
    items: [
      {
        icon: SourceCodeIcon,
        prompt:
          "Rancang arsitektur monitoring IoT dan CMS videotron untuk mendeteksi screen blackout, kegagalan controller receiver card (Novastar/Colorlight), dan alerting otomatis via Webhook/Telegram.",
        text: "Integrasi CMS videotron, software media player, dan sistem monitoring uptime layar LED.",
      },
      {
        icon: GitBranchIcon,
        prompt:
          "Buatkan alur kerja otomatis untuk validasi file video iklan (resolusi, aspect ratio, bitrate, durasi 15s/30s) sebelum di-push ke server media player DOOH.",
        text: "Workflow otomatisasi penjadwalan konten playlist dan verifikasi log Proof of Play (PoP).",
      },
      {
        icon: Shield01Icon,
        prompt:
          "Buatkan panduan hardening keamanan jaringan dan media player mini PC DOOH (isolasi VPN, firewall port, disabled remote USB, proteksi OS) untuk mencegah peretasan tayangan layar publik.",
        text: "Protokol keamanan jaringan player videotron publik terhadap ancaman deface konten.",
      },
    ],
    label: "IT & Operations",
  },
  {
    icon: UserGroupIcon,
    id: "hr",
    items: [
      {
        icon: UserGroupIcon,
        prompt:
          "Rancang struktur KPI dan skema tiering komisi penjualan yang kompetitif untuk tim Sales/Account Executive media OOH berdasarkan pencapaian target gross billing tahunan.",
        text: "Kompensasi skema komisi & insentif Account Executive (Sales OOH) berbasis revenue kuartalan.",
      },
      {
        icon: Shield01Icon,
        prompt:
          "Susun Standard Operating Procedure (SOP) K3 untuk pekerjaan teknisi di ketinggian (working at heights), mencakup izin kerja (SIKA), pemakaian full body harness, dan penanganan kondisi cuaca ekstrem.",
        text: "SOP Keselamatan Kerja (K3) untuk tim maintenance teknisi instalasi reklame ketinggian.",
      },
      {
        icon: Book01Icon,
        prompt:
          "Buat silabus modul onboarding 2 minggu untuk karyawan baru di perusahaan media OOH, mencakup pemahaman istilah industri (SOV, VAC, traffic count, pDOOH, izin titik reklame).",
        text: "Program onboarding karyawan baru industri periklanan Out-of-Home & terminologi DOOH.",
      },
    ],
    label: "HR & General Affairs",
  },
];

export function ChatQuickStarters({
  onSelectStarter,
}: {
  onSelectStarter?: (prompt: string) => void;
}) {
  const [activeTab, setActiveTab] = useState("sales");
  const promptCtrl = useOptionalPromptInputController();

  const currentCategory =
    SUGGESTION_CATEGORIES.find((cat) => cat.id === activeTab) ||
    SUGGESTION_CATEGORIES[0];

  const handleClick = (prompt: string) => {
    if (onSelectStarter) {
      onSelectStarter(prompt);
    } else if (promptCtrl) {
      promptCtrl.textInput.setInput(prompt);

      const composer = document.querySelector<HTMLTextAreaElement>(
        'textarea[name="message"]:not(:disabled):not([readonly])'
      );

      composer?.focus();
    }
  };

  return (
    <div className="w-full rounded-2xl border border-border/80 bg-card/70 p-3 shadow-xs backdrop-blur-md transition-all duration-200">
      {/* Category Tab Pills */}
      <div className="scrollbar-none flex items-center gap-1.5 overflow-x-auto pb-2">
        {SUGGESTION_CATEGORIES.map((category) => {
          const Icon = category.icon;
          const isActive = activeTab === category.id;

          return (
            <button
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 font-medium text-xs transition-all duration-150",
                isActive
                  ? "border border-border bg-background text-foreground shadow-2xs"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
              key={category.id}
              onClick={() => setActiveTab(category.id)}
              type="button"
            >
              <Icon className="size-3.5" />
              <span>{category.label}</span>
            </button>
          );
        })}
      </div>

      {/* Suggestion Rows List */}
      <div className="mt-1 flex flex-col gap-1">
        {currentCategory.items.map((item, idx) => {
          const ItemIcon = item.icon;

          return (
            <button
              className="group flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-150 hover:bg-muted/60 dark:hover:bg-muted/40"
              key={idx}
              onClick={() => handleClick(item.prompt)}
              type="button"
            >
              <div className="flex min-w-0 items-center gap-3">
                <ItemIcon className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
                <span className="truncate font-normal text-foreground/90 text-xs group-hover:text-foreground">
                  {item.text}
                </span>
              </div>
              <ArrowRight01Icon className="size-4 shrink-0 -translate-x-1 text-muted-foreground opacity-0 transition-all duration-150 group-hover:translate-x-0 group-hover:text-foreground group-hover:opacity-100" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ChatWelcome({
  profile,
  profileId,
  profiles,
  onProfileSwitch,
  profileSwitchDisabled = false,
  cognito = false,
}: {
  profile: ProfileSummary | undefined;
  profileId: string;
  profiles: ProfileSummary[];
  onProfileSwitch: (profileId: string) => void;
  profileSwitchDisabled?: boolean;
  cognito?: boolean;
}) {
  const { language } = useLanguage();

  return (
    <div className="flex flex-col gap-2 px-2 pb-0">
      <div
        className="fade-in-0 slide-in-from-top-1 flex animate-in flex-col gap-2 duration-300 motion-reduce:animate-none"
        key={welcomeAnimationKey(cognito)}
      >
        {cognito ? (
          <CognitoWelcome />
        ) : (
          <div className="relative flex items-end justify-between">
            {/* Left Headline & Persona Tag */}
            <div className="flex flex-col gap-1.5 pb-2">
              <div className="flex items-center gap-2">
                <div className="flex size-5 items-center justify-center rounded-md border border-border bg-card/80 text-primary shadow-2xs">
                  <SparklesIcon className="size-3" />
                </div>
                <span className="font-medium text-[11px] text-muted-foreground uppercase tracking-wider">
                  MingZhan (明战) Workspace
                </span>
              </div>

              <h2 className="font-normal text-2xl text-foreground tracking-tight sm:text-3xl">
                Turn your ideas into{" "}
                <span className="font-semibold text-foreground">
                  agents & workflows
                </span>
              </h2>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <div className="flex items-center gap-2 rounded-xl border border-border/80 bg-card/60 px-3 py-1 backdrop-blur-xs">
                  <span className="font-medium text-2xs text-muted-foreground">
                    {TRANSLATIONS[language]?.zhanyouLabel ?? "Agent:"}
                  </span>
                  <ChatProfileSwitcher
                    activeProfile={profile}
                    disabled={profileSwitchDisabled}
                    onProfileSwitch={onProfileSwitch}
                    profileId={profileId}
                    profiles={profiles}
                    variant="prominent"
                  />
                </div>
                {profile?.isSuper && (
                  <span className="inline-flex items-center rounded-lg border border-primary/30 bg-primary/10 px-2 py-0.5 font-medium text-2xs text-primary">
                    Super Agent
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
