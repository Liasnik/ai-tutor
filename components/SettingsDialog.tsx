"use client";

import { useSettingsStore } from "@/store/settings";
import { X } from "lucide-react";

export function SettingsDialog({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const {
    apiKey,
    setApiKey,
    selectedProfile,
    setProfile,
    selectedLanguage,
    setLanguage,
    selectedVoice,
    setVoice,
    googleSearchEnabled,
    setGoogleSearchEnabled,
    vadThreshold,
    setVadThreshold,
  } = useSettingsStore();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-2xl p-6 animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
            Settings
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">
              Gemini API Key
            </label>
            <input
              type="password"
              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:border-blue-500 rounded-md p-2.5 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 outline-none transition-all"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
            />
            <p className="text-xs text-zinc-500 mt-1">
              Get your key from Google AI Studio
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">
              Assistant Profile
            </label>
            <select
              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:border-blue-500 rounded-md p-2.5 text-zinc-900 dark:text-white outline-none transition-all"
              value={selectedProfile}
              onChange={(e) => setProfile(e.target.value)}
            >
              <option value="conversation">Conversation</option>
              <option value="interview_universal">Interview Tutor</option>
              <option value="interview_frontend">
                Frontend Interview Tutor
              </option>
              <option value="english_tutor">English Tutor</option>
              <option value="german_tutor">German Tutor</option>
              <option value="estonian_tutor">Estonian Tutor</option>
              <option value="conversation_friendly">
                Conversation Friendly
              </option>
              <option value="conversation_formal">Conversation Formal</option>
              <option value="conversation_supportive">
                Conversation Supportive
              </option>
              <option value="conversation_humor">Conversation Humor</option>
              <option value="conversation_philosophical">
                Conversation Philosophical
              </option>
              <option value="conversation_assertive_debater">
                Conversation Assertive Debater
              </option>
              <option value="conversation_strict_mentor">
                Conversation Strict Mentor
              </option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">
              AI Voice
            </label>
            <select
              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:border-blue-500 rounded-md p-2.5 text-zinc-900 dark:text-white outline-none transition-all"
              value={selectedVoice}
              onChange={(e) => setVoice(e.target.value)}
            >
              <option value="Aoede">Aoede (Female - Soft)</option>
              <option value="Kore">Kore (Female - Professional)</option>
              <option value="Puck">Puck (Male - Energetic)</option>
              <option value="Charon">Charon (Male - Deep)</option>
              <option value="Fenrir">Fenrir (Male - Strong)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">
              Language
            </label>
            <select
              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:border-blue-500 rounded-md p-2.5 text-zinc-900 dark:text-white outline-none transition-all"
              value={selectedLanguage}
              onChange={(e) => setLanguage(e.target.value)}
            >
              <option value="en-US">English (US)</option>
              <option value="de-DE">German</option>
              <option value="es-ES">Spanish</option>
              <option value="fr-FR">French</option>
              <option value="ru-RU">Russian</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">
              Microphone sensitivity
            </label>
            <select
              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:border-blue-500 rounded-md p-2.5 text-zinc-900 dark:text-white outline-none transition-all"
              value={vadThreshold}
              onChange={(e) => setVadThreshold(Number(e.target.value))}
            >
              <option value={0.01}>High (Very Sensitive)</option>
              <option value={0.03}>Above Normal</option>
              <option value={0.05}>Normal (Default)</option>
              <option value={0.1}>Low (Less Sensitive)</option>
              <option value={0.2}>Very Low</option>
            </select>
            <p className="text-xs text-zinc-500 mt-1">
              Higher value makes it harder for noise to interrupt the AI.
            </p>
          </div>

          <div className="pt-2">
            <label className="flex items-center space-x-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={googleSearchEnabled}
                onChange={(e) => setGoogleSearchEnabled(e.target.checked)}
                className="w-5 h-5 rounded bg-zinc-100 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 accent-[oklch(64.809%_0.21657_37.059_/_0.858)] text-white focus:ring-[oklch(64.809%_0.21657_37.059_/_0.858)] focus:ring-offset-white dark:focus:ring-offset-zinc-900"
              />
              <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">
                Enable Google Search Tool
              </span>
            </label>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 user-message hover:scale-105 text-white rounded-md font-medium transition-all shadow-lg active:scale-95"
          >
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
}
