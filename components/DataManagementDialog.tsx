"use client";

import { useEffect, useState } from "react";
import { getStorageStats } from "@/lib/db";
import { useSettingsStore } from "@/store/settings";
import { X, Database, Info, AlertTriangle } from "lucide-react";

const STORAGE_LIMIT = 500 * 1024 * 1024; // 500 MB in bytes

export function DataManagementDialog({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { audioDeletionEnabled, setAudioDeletionEnabled } = useSettingsStore();
  const [stats, setStats] = useState({
    audioSize: 0,
    textSize: 0,
    totalSize: 0,
  });

  useEffect(() => {
    if (isOpen) {
      loadStats();
    }
  }, [isOpen]);

  const loadStats = async () => {
    const s = await getStorageStats();
    setStats(s);
  };

  if (!isOpen) return null;

  const usagePercent = (stats.totalSize / STORAGE_LIMIT) * 100;
  const isCritical = usagePercent > 90;

  const formatSize = (bytes: number, forceUnit?: string) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];

    let i: number;
    if (forceUnit) {
      i = sizes.indexOf(forceUnit);
      if (i === -1) i = Math.floor(Math.log(bytes) / Math.log(k));
    } else {
      i = Math.floor(Math.log(bytes) / Math.log(k));
    }

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Determine the best unit for the limit to use it for both values
  const limitUnit = formatSize(STORAGE_LIMIT).split(" ")[1];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-2xl p-6 animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-2">
            <Database className="w-5 h-5 text-blue-500" />
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
              Data Management
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Memory Usage Section */}
          <div>
            <div className="flex justify-between items-end mb-2">
              <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Memory usage
              </span>
              <span
                className={
                  isCritical
                    ? "text-sm font-bold text-red-500 animate-pulse"
                    : "text-sm font-medium text-zinc-900 dark:text-white"
                }
              >
                {formatSize(stats.totalSize, limitUnit)} /{" "}
                {formatSize(STORAGE_LIMIT)}
              </span>
            </div>

            <div className="w-full h-3 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  isCritical
                    ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"
                    : usagePercent > 60
                    ? "bg-orange-500"
                    : "bg-blue-500"
                }`}
                style={{ width: `${Math.min(usagePercent, 100)}%` }}
              />
            </div>

            <div className="flex justify-between mt-2 text-[10px] uppercase tracking-wider font-semibold">
              <span className="text-blue-500">
                Audio: {formatSize(stats.audioSize)}
              </span>
              <span className="text-zinc-400">
                Text: {formatSize(stats.textSize)}
              </span>
            </div>
          </div>

          {/* Warning Message */}
          {isCritical && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-700 dark:text-red-400 leading-relaxed">
                Storage is almost full. This might slow down your browser.
                Please delete old chats or individual audio recordings to free
                up space.
              </p>
            </div>
          )}

          {/* Toggle Section */}
          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <label className="flex items-center justify-between cursor-pointer group">
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-zinc-900 dark:text-white group-hover:text-blue-500 transition-colors">
                  Allow deletion of audio recordings
                </span>
                <span className="text-xs text-zinc-500">
                  Adds a trash icon to messages with audio
                </span>
              </div>
              <div className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={audioDeletionEnabled}
                  onChange={(e) => setAudioDeletionEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div
                  className={`w-11 h-6 rounded-full transition-all relative after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${
                    audioDeletionEnabled
                      ? "bg-orange-500 after:translate-x-full after:border-white"
                      : "bg-zinc-200 dark:bg-zinc-700"
                  }`}
                ></div>
              </div>
            </label>
          </div>

          {/* Instruction */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-md flex items-start space-x-3">
            <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed italic">
              When enabled, find the{" "}
              <Database className="w-3 h-3 inline pb-0.5" /> icons in your chats
              to selectively free up space without losing your conversation
              history.
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-md font-medium hover:scale-105 active:scale-95 transition-all shadow-lg"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
