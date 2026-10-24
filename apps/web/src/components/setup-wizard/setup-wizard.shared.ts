export interface SetupAccountDraft {
  email: string;
  name: string;
  password: string;
  phone: string;
}

export const SETUP_STEPS = [
  { id: 1, label: "Akun Komandan", required: true },
  { id: 2, label: "Barisan / Organisasi", required: true },
  { id: 3, label: "Penyedia AI", required: true },
  { id: 4, label: "Profil & Preferensi", required: false },
] as const;

export type SetupStepId = (typeof SETUP_STEPS)[number]["id"];

export interface SetupWizardProps {
  onComplete?: () => void;
}
