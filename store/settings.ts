import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface SettingsState {
  apiKey: string;
  selectedProfile: string;
  selectedLanguage: string;
  selectedVoice: string;
  selectedMicrophoneId: string;
  selectedSpeakerId: string;
  isOnboardingCompleted: boolean;
  googleSearchEnabled: boolean;
  customInstructions: string;
  theme: "dark" | "light";
  vadThreshold: number;
  audioDeletionEnabled: boolean;

  // Actions
  setApiKey: (key: string) => void;
  setProfile: (profile: string) => void;
  setLanguage: (language: string) => void;
  setVoice: (voice: string) => void;
  setMicrophoneId: (id: string) => void;
  setSpeakerId: (id: string) => void;
  setGoogleSearchEnabled: (enabled: boolean) => void;
  setCustomInstructions: (instructions: string) => void;
  setTheme: (theme: "dark" | "light") => void;
  setVadThreshold: (threshold: number) => void;
  setAudioDeletionEnabled: (enabled: boolean) => void;
  toggleTheme: () => void;
  completeOnboarding: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      apiKey: "",
      selectedProfile: "conversation",
      selectedLanguage: "en-US",
      selectedVoice: "Charon", // Default voice
      selectedMicrophoneId: "default",
      selectedSpeakerId: "default",
      isOnboardingCompleted: false,
      googleSearchEnabled: true,
      customInstructions: "",
      theme: "dark",
      vadThreshold: 0.05,
      audioDeletionEnabled: false,

      setApiKey: (apiKey) => set({ apiKey }),
      setProfile: (selectedProfile) => set({ selectedProfile }),
      setLanguage: (selectedLanguage) => set({ selectedLanguage }),
      setVoice: (selectedVoice) => set({ selectedVoice }),
      setMicrophoneId: (selectedMicrophoneId) => set({ selectedMicrophoneId }),
      setSpeakerId: (selectedSpeakerId) => set({ selectedSpeakerId }),
      setGoogleSearchEnabled: (googleSearchEnabled) =>
        set({ googleSearchEnabled }),
      setCustomInstructions: (customInstructions) =>
        set({ customInstructions }),
      setTheme: (theme) => set({ theme }),
      setVadThreshold: (vadThreshold) => set({ vadThreshold }),
      setAudioDeletionEnabled: (audioDeletionEnabled) =>
        set({ audioDeletionEnabled }),
      toggleTheme: () =>
        set((state) => ({ theme: state.theme === "dark" ? "light" : "dark" })),
      completeOnboarding: () => set({ isOnboardingCompleted: true }),
    }),
    {
      name: "ai-tutor-settings",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
