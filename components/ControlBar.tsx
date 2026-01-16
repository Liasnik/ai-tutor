"use client";

import { Mic, MicOff, VolumeOff, Power, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function ControlBar({
  isConnected,
  isRecording,
  isAiSpeaking,
  interrupt,
  onToggleMic,
  onConnect,
  onDisconnect,
  status,
}: {
  isConnected: boolean;
  isRecording: boolean;
  isAiSpeaking: boolean;
  interrupt: () => void;
  onToggleMic: () => void;
  onConnect: () => void;
  onDisconnect: () => void;
  onOpenSettings: () => void;
  status: string;
}) {
  const isConnecting = status === "Connecting...";

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-lg px-4">
      <div className="flex justify-center mb-4"></div>
      <div className="backdrop-blur-md rounded-full p-2 flex items-center justify-between shadow-2xl bg-color-sidebar border border-color-sidebar">
        <div className="flex items-center space-x-2 pl-0 pr-1 w-40">
          <div className="">
            {isConnected ? (
              <button
                onClick={onDisconnect}
                className="p-3 text-red-400 hover:text-red-500 hover:bg-red-300/60 dark:hover:bg-red-900/20 rounded-full transition-all"
                title="Disconnect"
              >
                <Power className="w-5 h-5" />
              </button>
            ) : (
              !isConnected && (
                <button
                  type="button"
                  onClick={onConnect}
                  disabled={isConnecting}
                  className={cn(
                    "flex items-center space-x-2 px-3 xs:px-6 py-3 rounded-full font-medium leading-tight select-none antialiased backface-hidden transform-gpu origin-center transition-transform duration-200 ease-out",
                    "user-message hover:scale-105 text-white shadow-lg shadow-blue-900/30",
                    isConnecting && "opacity-80 cursor-wait"
                  )}
                >
                  {isConnecting ? (
                    <Loader2 className="w-4 h-4 animate-spin hide-below-360" />
                  ) : (
                    <Power className="w-4 h-4 hide-below-360" />
                  )}
                  <span>{isConnecting ? "Connecting" : "Connect AI"}</span>
                </button>
              )
            )}
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 flex-1">
          <div className="">
            <button
              onClick={onToggleMic}
              className={cn(
                "p-3 rounded-full transition-all duration-300 shadow-lg hover:scale-110 border-2 cursor-pointer",
                isRecording
                  ? "bg-red-500/10 border-red-400 text-red-400 animate-pulse shadow-red-900/20"
                  : "status-disconnected bg-transparent  dark:hover:bg-slate-900! "
              )}
            >
              {isRecording ? (
                <Mic className="w-5 h-5" />
              ) : (
                <MicOff className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        <div className="flex justify-end space-x-2 pr-0 w-40">
          <div className="text-center pl-1">
            <span
              className={cn(
                "text-xs font-mono py-1 px-3 rounded-full border select-none",
                isConnected
                  ? "bg-green-400/30 dark:bg-green-900/20 border-green-900/50 text-green-700 dark:text-green-400"
                  : "text-xs font-mono py-1 px-3 rounded-full border status-disconnected"
              )}
            >
              {status}
            </span>
          </div>
        </div>
        {isAiSpeaking && (
          <button
            className="absolute bottom-3 left-15 z-0 border-1.5 border-red-400 text-red-400 px-4 py-2 rounded-full cursor-pointer hover:scale-105 transition-all animate-in fade-in zoom-in duration-300"
            onClick={interrupt}
          >
            <VolumeOff />
          </button>
        )}
      </div>
    </div>
  );
}
