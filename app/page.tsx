"use client";

import { useState, useRef, useEffect } from "react";
import { useGemini } from "@/hooks/use-gemini";
import { useMicrophone } from "@/hooks/use-microphone";
import { ControlBar } from "@/components/control-bar";
import { SettingsDialog } from "@/components/settings-dialog";
import { ChatMessage } from "@/components/chat-message";
import { useSettingsStore } from "@/store/settings";

export default function Home() {
  const {
    status,
    isConnected,
    messages,
    connect,
    disconnect,
    sendAudio,
    sendText,
  } = useGemini();

  // We pass sendAudio to useMicrophone directly, but need to handle valid session
  const { isRecording, startRecording, stopRecording } = useMicrophone();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { apiKey } = useSettingsStore();

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    // Open settings automatically if no API key
    if (!apiKey) {
      setIsSettingsOpen(true);
    }
  }, [apiKey]);

  const handleToggleMic = () => {
    if (isRecording) {
      stopRecording();
    } else {
      // Note: In real production, we'd handle deviceId selection
      startRecording("default", (base64) => {
        if (isConnected) {
          sendAudio(base64);
        }
      });
    }
  };

  const handleConnect = () => {
    connect();
  };

  const handleDisconnect = () => {
    stopRecording();
    disconnect();
  };

  return (
    <main className="flex flex-col h-screen bg-black text-white overflow-hidden font-sans">
      {/* Header / Top Bar (Optional, simpler to just have chat area) */}

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 pb-32 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
        <div className="max-w-3xl mx-auto space-y-4 pt-10">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 text-zinc-500 space-y-4">
              <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                <span className="text-2xl">👋</span>
              </div>
              <p>Ready to start. Connect to begin.</p>
            </div>
          )}

          {messages.map((msg: any) => (
            <ChatMessage key={msg.id} text={msg.text} isUser={msg.isUser} />
          ))}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Control Bar */}
      <ControlBar
        isConnected={isConnected}
        isRecording={isRecording}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
        onToggleMic={handleToggleMic}
        onOpenSettings={() => setIsSettingsOpen(true)}
        status={status}
      />

      {/* Settings Modal */}
      <SettingsDialog
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </main>
  );
}
