"use client";

import { useState, useRef, useEffect } from "react";
import { useGemini } from "@/hooks/use-gemini";
import { useMicrophone } from "@/hooks/use-microphone";
import { ControlBar } from "@/components/control-bar";
import { SettingsDialog } from "@/components/settings-dialog";
import { ChatMessage } from "@/components/chat-message";
import { HistorySidebar } from "@/components/history-sidebar";
import { useSettingsStore } from "@/store/settings";
import { Menu } from "lucide-react";

export default function Home() {
  const {
    status,
    isConnected,
    messages,
    connect,
    disconnect,
    sendAudio,
    sendText,
    currentSessionId,
    loadSession,
    startNewSession,
  } = useGemini();

  // We pass sendAudio to useMicrophone directly, but need to handle valid session
  const { isRecording, startRecording, stopRecording } = useMicrophone();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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
    <main className="flex h-screen bg-black text-white font-sans overflow-hidden">
      {/* Desktop Sidebar (hidden on mobile, visible on lg) */}
      <div className="hidden lg:block h-full">
        <HistorySidebar
          currentSessionId={currentSessionId}
          onSelectSession={loadSession}
          onNewChat={startNewSession}
          isOpen={true}
        />
      </div>

      {/* Mobile Sidebar (Drawer) */}
      <HistorySidebar
        currentSessionId={currentSessionId}
        onSelectSession={loadSession}
        onNewChat={startNewSession}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        isMobile={true}
      />

      <div className="flex-1 flex flex-col relative h-full">
        {/* Header / Top Bar */}
        <div className="absolute top-4 left-4 z-10 lg:hidden">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 bg-zinc-900/80 backdrop-blur rounded-full border border-zinc-800 text-zinc-400 hover:text-white"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 pb-32 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
          <div className="max-w-3xl mx-auto space-y-4 pt-16 lg:pt-10">
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
      </div>
    </main>
  );
}
