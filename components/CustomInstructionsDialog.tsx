"use client";

import { useState, useEffect } from "react";
import { useSettingsStore } from "@/store/settings";
import { X } from "lucide-react";

export function CustomInstructionsDialog({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { customInstructions, setCustomInstructions } = useSettingsStore();
  const [localValue, setLocalValue] = useState(customInstructions);

  // Sync local state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        setLocalValue(customInstructions);
      }, 0);
    }
  }, [isOpen, customInstructions]);

  if (!isOpen) return null;

  const handleSave = () => {
    setCustomInstructions(localValue);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-lg shadow-2xl p-6 animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">
            Custom AI Instructions
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-zinc-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        <p className="text-sm text-zinc-400 mb-4">
          Add custom instructions that will be included with every conversation.
          These instructions help personalize the AI&apos;s responses to your
          needs.
        </p>

        <textarea
          className="w-full h-48 bg-zinc-900 border border-zinc-800 focus:border-blue-500 rounded-md p-3 text-white placeholder-zinc-600 outline-none transition-all resize-none"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          placeholder="Example: I'm a software developer preparing for a senior position interview at a fintech company. I have 5 years of experience with React, Node.js, and PostgreSQL..."
        />

        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md font-medium transition-colors shadow-lg shadow-blue-900/20"
          >
            Save Instructions
          </button>
        </div>
      </div>
    </div>
  );
}
