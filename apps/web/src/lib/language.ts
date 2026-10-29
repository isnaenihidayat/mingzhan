export type Language = "en" | "id" | "zh";

export const LANGUAGE_STORAGE_KEY = "mingzhan-language";

export interface LanguageOption {
  code: string;
  id: Language;
  label: string;
  nativeLabel: string;
}

export const LANGUAGE_OPTIONS: readonly LanguageOption[] = [
  { code: "EN", id: "en", label: "English", nativeLabel: "English" },
  { code: "ID", id: "id", label: "Bahasa Indonesia", nativeLabel: "Indonesia" },
  { code: "ZH", id: "zh", label: "中文", nativeLabel: "Chinese" },
] as const;

function isLanguage(
  value: string | null | undefined
): value is Language {
  return value === "en" || value === "id" || value === "zh";
}

export function getInitialLanguage(): Language {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);

    if (isLanguage(stored)) {
      return stored;
    }
  } catch {
    // Ignore storage errors
  }

  return "en";
}

export interface NavTranslation {
  description: string;
  label: string;
}

export const TRANSLATIONS: Record<
  Language,
  {
    chooseLanguage: string;
    navGroups: {
      agent: string;
      chat: string;
      organization: string;
      system: string;
    };
    navItems: Record<string, NavTranslation>;
    theme: string;
    zhanyouLabel: string;
  }
> = {
  en: {
    chooseLanguage: "Choose a language",
    navGroups: {
      agent: "Agent",
      chat: "Chat",
      organization: "Organization",
      system: "System",
    },
    navItems: {
      automations: {
        description: "Manage scheduled automations",
        label: "Automations",
      },
      chat: {
        description: "Start a new conversation",
        label: "New chat",
      },
      composio: {
        description: "Connect apps and manage plugins",
        label: "Connections",
      },
      customize: {
        description: "Manage MingZhan settings, tools, and integrations",
        label: "Control center",
      },
      files: {
        description: "Manage profile artifacts",
        label: "Browse Files",
      },
      "google-meet": {
        description: "Capture and read meeting transcripts",
        label: "Google Meet",
      },
      groups: {
        description: "Group chats where agents talk to each other",
        label: "Groups",
      },
      mcp: {
        description: "Manage MCP servers",
        label: "MCP",
      },
      notifications: {
        description: "Automation runs and org memory proposals",
        label: "Notifications",
      },
      organization: {
        description: "Members, memory, and org settings",
        label: "Organization",
      },
      "plugin-management": {
        description: "Manage plugins",
        label: "Plugins",
      },
      profiles: {
        description: "Manage bot configs and tool allowlists",
        label: "Agent",
      },
      providers: {
        description: "Manage provider API keys and models",
        label: "AI Providers",
      },
      settings: {
        description: "Appearance and preferences",
        label: "Settings",
      },
      skills: {
        description: "Browse organization skills",
        label: "Skills",
      },
      tools: {
        description: "Manage agent tools",
        label: "Tools",
      },
      usage: {
        description: "View token usage and costs",
        label: "Usage",
      },
      workers: {
        description: "Automation and channel workers",
        label: "Workers",
      },
    },
    theme: "Theme",
    zhanyouLabel: "Agent:",
  },
  id: {
    chooseLanguage: "Pilih bahasa",
    navGroups: {
      agent: "Agen",
      chat: "Sesi",
      organization: "Organisasi",
      system: "Sistem",
    },
    navItems: {
      automations: {
        description: "Alur kerja otomatisasi terjadwal",
        label: "Otomatisasi",
      },
      chat: {
        description: "Mulai percakapan atau sesi kerja baru",
        label: "Sesi Baru",
      },
      composio: {
        description: "Hubungkan aplikasi dan integrasi eksternal",
        label: "Koneksi",
      },
      customize: {
        description: "Pengaturan sistem, tools, dan integrasi",
        label: "Pusat Kontrol",
      },
      files: {
        description: "Kelola artefak dan berkas profil",
        label: "Berkas",
      },
      "google-meet": {
        description: "Transkripsi dan risalah rapat Meet",
        label: "Google Meet",
      },
      groups: {
        description: "Grup chat kolaborasi antar-agen",
        label: "Grup",
      },
      mcp: {
        description: "Kelola server Model Context Protocol",
        label: "MCP",
      },
      notifications: {
        description: "Eksekusi otomasi dan memori organisasi",
        label: "Notifikasi",
      },
      organization: {
        description: "Anggota tim, memori, dan izin akses",
        label: "Organisasi",
      },
      "plugin-management": {
        description: "Kelola modul plugin",
        label: "Plugin",
      },
      profiles: {
        description: "Kelola konfigurasi bot dan perkakas",
        label: "Agen",
      },
      providers: {
        description: "Kelola API keys dan model LLM",
        label: "Penyedia AI",
      },
      settings: {
        description: "Preferensi tampilan dan tema",
        label: "Pengaturan",
      },
      skills: {
        description: "Jelajahi keterampilan dan SOP organisasi",
        label: "Skills",
      },
      tools: {
        description: "Kelola perkakas dan tools agen",
        label: "Tools",
      },
      usage: {
        description: "Pantau penggunaan token dan biaya",
        label: "Penggunaan",
      },
      workers: {
        description: "Worker latar belakang dan otomasi",
        label: "Worker",
      },
    },
    theme: "Tema",
    zhanyouLabel: "Agen:",
  },
  zh: {
    chooseLanguage: "选择语言",
    navGroups: {
      agent: "智能体",
      chat: "对话",
      organization: "团队组织",
      system: "系统设置",
    },
    navItems: {
      automations: {
        description: "管理定时与触发型自动化工作流",
        label: "自动化流程",
      },
      chat: {
        description: "开始新的工作或对话会话",
        label: "新对话",
      },
      composio: {
        description: "连接外部应用与生态插件",
        label: "外部连接",
      },
      customize: {
        description: "管理明战配置、工具与系统集成",
        label: "控制中心",
      },
      files: {
        description: "管理智能体生成的文档与文件",
        label: "文件产物",
      },
      "google-meet": {
        description: "会议语音转录与纪要记录",
        label: "Google Meet",
      },
      groups: {
        description: "多智能体协作与互相交流",
        label: "多群组",
      },
      mcp: {
        description: "管理 Model Context Protocol 服务",
        label: "MCP 服务",
      },
      notifications: {
        description: "自动化任务执行通知与记忆提案",
        label: "通知中心",
      },
      organization: {
        description: "团队成员、共享记忆与组织权限",
        label: "团队组织",
      },
      "plugin-management": {
        description: "管理系统插件模块",
        label: "插件管理",
      },
      profiles: {
        description: "管理机器人配置与工具白名单",
        label: "智能体",
      },
      providers: {
        description: "配置模型供应商 API Key 与模型映射",
        label: "AI 模型供应商",
      },
      settings: {
        description: "系统外观与个性化使用偏好",
        label: "偏好设置",
      },
      skills: {
        description: "浏览团队组织内的专业技能库",
        label: "技能库",
      },
      tools: {
        description: "管理智能体使用的执行工具",
        label: "工具箱",
      },
      usage: {
        description: "查看 Token 用量统计与成本核算",
        label: "Token 消耗",
      },
      workers: {
        description: "自动化管道与通信渠道 Worker",
        label: "后台任务",
      },
    },
    theme: "主题",
    zhanyouLabel: "智能体:",
  },
};
