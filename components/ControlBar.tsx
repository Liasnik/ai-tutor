"use client";

import { Mic, MicOff, Settings, Power, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function ControlBar({
  isConnected,
  isRecording,
  onToggleMic,
  onConnect,
  onDisconnect,
  status,
}: {
  isConnected: boolean;
  isRecording: boolean;
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
      <div className="bg-zinc-900/90 backdrop-blur-md border border-zinc-800 rounded-full p-2 flex items-center justify-between shadow-2xl">
        <div className="flex items-center space-x-2 pl-0 pr-1 w-40">
            <div className="">
            {isConnected ? (
               <button
                onClick={onDisconnect}
                className="p-3 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-full transition-all"
                title="Disconnect"
              >
                <Power className="w-5 h-5" />
              </button>) : ( !isConnected && (
            <button
              onClick={onConnect}
              disabled={isConnecting}
              className={cn(
                "flex items-center space-x-2 px-3 xs:px-6 py-3 rounded-full font-medium transition-all",
                "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/30",
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
            ))}
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 flex-1">
           <div className="">
           <button
              onClick={onToggleMic}
              className={cn(
                "p-3 rounded-full transition-all duration-300 shadow-lg border-2",
                isRecording
                  ? "bg-red-500/10 border-red-500 text-red-500 animate-pulse shadow-red-900/20"
                  : "bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700"
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
              "text-xs font-mono py-1 px-3 rounded-full border",
                isConnected
                ? "bg-green-900/20 border-green-900/50 text-green-400"
                : "bg-zinc-900/50 border-zinc-800 text-zinc-500"
              )}
                >
              {status}
             </span>
            </div> 

        </div>
      </div>
    </div>
  );
}
