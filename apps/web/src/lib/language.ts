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

export function isLanguage(value: string | null | undefined): value is Language {
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
    theme: "Theme",
    zhanyouLabel: "Agent:",
    navGroups: {
      chat: "Chat",
      agent: "Agent",
      organization: "Organization",
      system: "System",
    },
    navItems: {
      chat: {
        label: "New chat",
        description: "Start a new conversation",
      },
      profiles: {
        label: "Agent",
        description: "Manage bot configs and tool allowlists",
      },
      groups: {
        label: "Groups",
        description: "Group chats where agents talk to each other",
      },
      "google-meet": {
        label: "Google Meet",
        description: "Capture and read meeting transcripts",
      },
      "plugin-management": {
        label: "Plugins",
        description: "Manage plugins",
      },
      composio: {
        label: "Connections",
        description: "Connect apps and manage plugins",
      },
      automations: {
        label: "Automations",
        description: "Manage scheduled automations",
      },
      customize: {
        label: "Control center",
        description: "Manage MingZhan settings, tools, and integrations",
      },
      organization: {
        label: "Organization",
        description: "Members, memory, and org settings",
      },
      usage: {
        label: "Usage",
        description: "View token usage and costs",
      },
      files: {
        label: "Browse Files",
        description: "Manage profile artifacts",
      },
      workers: {
        label: "Workers",
        description: "Automation and channel workers",
      },
      tools: {
        label: "Tools",
        description: "Manage agent tools",
      },
      skills: {
        label: "Skills",
        description: "Browse organization skills",
      },
      mcp: {
        label: "MCP",
        description: "Manage MCP servers",
      },
      providers: {
        label: "AI Providers",
        description: "Manage provider API keys and models",
      },
      settings: {
        label: "Settings",
        description: "Appearance and preferences",
      },
      notifications: {
        label: "Notifications",
        description: "Automation runs and org memory proposals",
      },
    },
  },
  id: {
    chooseLanguage: "Pilih bahasa",
    theme: "Tema",
    zhanyouLabel: "Agen:",
    navGroups: {
      chat: "Sesi",
      agent: "Agen",
      organization: "Organisasi",
      system: "Sistem",
    },
    navItems: {
      chat: {
        label: "Sesi Baru",
        description: "Mulai percakapan atau sesi kerja baru",
      },
      profiles: {
        label: "Agen",
        description: "Kelola konfigurasi bot dan perkakas",
      },
      groups: {
        label: "Grup",
        description: "Grup chat kolaborasi antar-agen",
      },
      "google-meet": {
        label: "Google Meet",
        description: "Transkripsi dan risalah rapat Meet",
      },
      "plugin-management": {
        label: "Plugin",
        description: "Kelola modul plugin",
      },
      composio: {
        label: "Koneksi",
        description: "Hubungkan aplikasi dan integrasi eksternal",
      },
      automations: {
        label: "Otomatisasi",
        description: "Alur kerja otomatisasi terjadwal",
      },
      customize: {
        label: "Pusat Kontrol",
        description: "Pengaturan sistem, tools, dan integrasi",
      },
      organization: {
        label: "Organisasi",
        description: "Anggota tim, memori, dan izin akses",
      },
      usage: {
        label: "Penggunaan",
        description: "Pantau penggunaan token dan biaya",
      },
      files: {
        label: "Berkas",
        description: "Kelola artefak dan berkas profil",
      },
      workers: {
        label: "Worker",
        description: "Worker latar belakang dan otomasi",
      },
      tools: {
        label: "Tools",
        description: "Kelola perkakas dan tools agen",
      },
      skills: {
        label: "Skills",
        description: "Jelajahi keterampilan dan SOP organisasi",
      },
      mcp: {
        label: "MCP",
        description: "Kelola server Model Context Protocol",
      },
      providers: {
        label: "Penyedia AI",
        description: "Kelola API keys dan model LLM",
      },
      settings: {
        label: "Pengaturan",
        description: "Preferensi tampilan dan tema",
      },
      notifications: {
        label: "Notifikasi",
        description: "Eksekusi otomasi dan memori organisasi",
      },
    },
  },
  zh: {
    chooseLanguage: "选择语言",
    theme: "主题",
    zhanyouLabel: "智能体:",
    navGroups: {
      chat: "对话",
      agent: "智能体",
      organization: "团队组织",
      system: "系统设置",
    },
    navItems: {
      chat: {
        label: "新对话",
        description: "开始新的工作或对话会话",
      },
      profiles: {
        label: "智能体",
        description: "管理机器人配置与工具白名单",
      },
      groups: {
        label: "多群组",
        description: "多智能体协作与互相交流",
      },
      "google-meet": {
        label: "Google Meet",
        description: "会议语音转录与纪要记录",
      },
      "plugin-management": {
        label: "插件管理",
        description: "管理系统插件模块",
      },
      composio: {
        label: "外部连接",
        description: "连接外部应用与生态插件",
      },
      automations: {
        label: "自动化流程",
        description: "管理定时与触发型自动化工作流",
      },
      customize: {
        label: "控制中心",
        description: "管理明战配置、工具与系统集成",
      },
      organization: {
        label: "团队组织",
        description: "团队成员、共享记忆与组织权限",
      },
      usage: {
        label: "Token 消耗",
        description: "查看 Token 用量统计与成本核算",
      },
      files: {
        label: "文件产物",
        description: "管理智能体生成的文档与文件",
      },
      workers: {
        label: "后台任务",
        description: "自动化管道与通信渠道 Worker",
      },
      tools: {
        label: "工具箱",
        description: "管理智能体使用的执行工具",
      },
      skills: {
        label: "技能库",
        description: "浏览团队组织内的专业技能库",
      },
      mcp: {
        label: "MCP 服务",
        description: "管理 Model Context Protocol 服务",
      },
      providers: {
        label: "AI 模型供应商",
        description: "配置模型供应商 API Key 与模型映射",
      },
      settings: {
        label: "偏好设置",
        description: "系统外观与个性化使用偏好",
      },
      notifications: {
        label: "通知中心",
        description: "自动化任务执行通知与记忆提案",
      },
    },
  },
};
