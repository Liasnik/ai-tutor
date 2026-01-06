import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface SettingsState {
  apiKey: string;
  selectedProfile: string;
  selectedLanguage: string;
  selectedMicrophoneId: string;
  selectedSpeakerId: string;
  isOnboardingCompleted: boolean;
  googleSearchEnabled: boolean;
  customInstructions: string;

  // Actions
  setApiKey: (key: string) => void;
  setProfile: (profile: string) => void;
  setLanguage: (language: string) => void;
  setMicrophoneId: (id: string) => void;
  setSpeakerId: (id: string) => void;
  setGoogleSearchEnabled: (enabled: boolean) => void;
  setCustomInstructions: (instructions: string) => void;
  completeOnboarding: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      apiKey: "",
      selectedProfile: "conversation",
      selectedLanguage: "en-US",
      selectedMicrophoneId: "default",
      selectedSpeakerId: "default",
      isOnboardingCompleted: false,
      googleSearchEnabled: true,
      customInstructions: "",

      setApiKey: (apiKey) => set({ apiKey }),
      setProfile: (selectedProfile) => set({ selectedProfile }),
      setLanguage: (selectedLanguage) => set({ selectedLanguage }),
      setMicrophoneId: (selectedMicrophoneId) => set({ selectedMicrophoneId }),
      setSpeakerId: (selectedSpeakerId) => set({ selectedSpeakerId }),
      setGoogleSearchEnabled: (googleSearchEnabled) =>
        set({ googleSearchEnabled }),
      setCustomInstructions: (customInstructions) =>
        set({ customInstructions }),
      completeOnboarding: () => set({ isOnboardingCompleted: true }),
    }),
    {
      name: "ai-tutor-settings",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
