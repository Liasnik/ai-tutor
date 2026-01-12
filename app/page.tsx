"use client";

import { useState, useRef, useEffect } from "react";
import { useGemini } from "@/hooks/useGemini";
import { useMicrophone } from "@/hooks/useMicrophone";
import { ControlBar } from "@/components/ControlBar";
import { SettingsDialog } from "@/components/SettingsDialog";
import { CustomInstructionsDialog } from "@/components/CustomInstructionsDialog";
import { ChatMessage } from "@/components/ChatMessage";
import { Sidebar } from "@/components/Sidebar";
import { useSettingsStore } from "@/store/settings";
import { Menu } from "lucide-react";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  isComplete?: boolean;
}

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

  const { apiKey } = useSettingsStore();
  const [isSettingsOpen, setIsSettingsOpen] = useState(() => !apiKey);
  const [isCustomInstructionsOpen, setIsCustomInstructionsOpen] =
    useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasAutoOpenedRef = useRef(false);
  const pendingSendRef = useRef<string | null>(null);
  const [inputText, setInputText] = useState("");

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // If we queued a text to send while disconnected, send it once connected
  useEffect(() => {
    if (isConnected && pendingSendRef.current) {
      sendText(pendingSendRef.current);
      pendingSendRef.current = null;
      setTimeout(() => setInputText(""), 0);
    }
  }, [isConnected, sendText]);

  // Update settings dialog state when API key changes
  useEffect(() => {
    if (!apiKey && !hasAutoOpenedRef.current) {
      hasAutoOpenedRef.current = true;
      setTimeout(() => {
        setIsSettingsOpen(true);
      }, 0);
    } else if (apiKey) {
      hasAutoOpenedRef.current = false;
    }
  }, [apiKey]);

  const handleToggleMic = () => {
    if (isRecording) {
      stopRecording();
    } else {
      // Note: In real production, we'd handle deviceId selection
      //  startRecording("default", (base64) => {
      //   if (isConnected) {
      //     sendAudio(base64);
      //   }
      // If not connected, connect first so audio will be sent
      (async () => {
        if (!isConnected) {
          await connect();
        }
        startRecording("default", (base64) => {
          if (isConnected) {
            sendAudio(base64);
          }
        });
      })();
    }
  };

  const handleConnect = () => {
    connect();
  };

  const handleDisconnect = () => {
    stopRecording();
    disconnect();
  };

  const handleSendText = () => {
    const text = inputText.trim();
    if (!text) return;

    if (isConnected) {
      sendText(text);
      setInputText("");
    } else {
      // Queue the text to be sent once connection is established
      pendingSendRef.current = text;
      connect();
    }
  };

  return (
    <main className="flex h-screen bg-black text-white font-sans overflow-hidden">
      {/* Desktop Sidebar (hidden on mobile, visible on lg) */}
      <div className="hidden lg:block h-full">
        <Sidebar
          currentSessionId={currentSessionId}
          onSelectSession={loadSession}
          onNewChat={startNewSession}
          onCustomInstructionsClick={() => setIsCustomInstructionsOpen(true)}
          isOpen={true}
        />
      </div>

      {/* Mobile Sidebar (Drawer) */}
      <Sidebar
        currentSessionId={currentSessionId}
        onSelectSession={loadSession}
        onNewChat={startNewSession}
        onCustomInstructionsClick={() => setIsCustomInstructionsOpen(true)}
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
        <div className="flex-1 overflow-y-auto p-4 pb-48 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
          <div className="max-w-3xl mx-auto space-y-4 pt-16 lg:pt-10">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-64 text-zinc-500 space-y-4">
                <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                  <span className="text-2xl">👋</span>
                </div>
                <p>Ready to start. Connect to begin.</p>
              </div>
            )}

            {messages.map((msg: Message) => (
              <ChatMessage key={msg.id} text={msg.text} isUser={msg.isUser} />
            ))}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Control Bar */}
        {/* Text input placed above ControlBar */}
        <div className="absolute bottom-35 left-1/2 -translate-x-1/2 w-full max-w-lg px-4">
          <div className="bg-zinc-900/90 backdrop-blur-md border border-zinc-800 rounded-full p-2 flex items-center shadow-2xl">
            <input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSendText(); }}
              placeholder={isConnected ? "Type a message..." : "Connect to send text"}
              className="flex-1 bg-transparent outline-none text-white px-4 py-2 rounded-full"
            />
            <button
              onClick={handleSendText}
              className="ml-2 px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-medium"
            >
              Send
            </button>
          </div>
        </div>
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

        {/* Custom Instructions Modal */}
        <CustomInstructionsDialog
          isOpen={isCustomInstructionsOpen}
          onClose={() => setIsCustomInstructionsOpen(false)}
        />
      </div>
    </main>
  );
}
