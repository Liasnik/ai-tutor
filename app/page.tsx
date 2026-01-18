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
import { GlobalCollapseToggle } from "@/components/GlobalCollapseToggle";
import { ChatInput } from "@/components/ChatInput";
import { DataManagementDialog } from "@/components/DataManagementDialog";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  isComplete?: boolean;
  isCollapsed?: boolean;
  audio?: Blob;
}

export default function Home() {
  const { apiKey, vadThreshold } = useSettingsStore();
  const [isSettingsOpen, setIsSettingsOpen] = useState(() => !apiKey);
  const [isCustomInstructionsOpen, setIsCustomInstructionsOpen] =
    useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDataManagementOpen, setIsDataManagementOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasAutoOpenedRef = useRef(false);
  const pendingSendRef = useRef<string | null>(null);
  const [inputText, setInputText] = useState("");
  const {
    status,
    isConnected,
    isAiSpeaking,
    messages,
    connect,
    disconnect,
    sendAudio,
    sendText,
    interrupt,
    currentSessionId,
    loadSession,
    startNewSession,
    toggleMessageCollapse,
    toggleAllMessagesCollapse,
    deleteAudio,
  } = useGemini();

  // Use refs for state that need to be accessed in callbacks to avoid stale closures
  const isConnectedRef = useRef(isConnected);
  const isAiSpeakingRef = useRef(isAiSpeaking);

  useEffect(() => {
    isConnectedRef.current = isConnected;
  }, [isConnected]);

  useEffect(() => {
    isAiSpeakingRef.current = isAiSpeaking;
  }, [isAiSpeaking]);

  const {
    isRecording,
    error: micError,
    startRecording,
    stopRecording,
  } = useMicrophone();

  // Show microphone error as an alert for visibility on mobile
  useEffect(() => {
    if (micError) {
      alert(micError);
    }
  }, [micError]);

  const handleToggleMic = () => {
    if (isRecording) {
      stopRecording();
    } else {
      (async () => {
        if (!isConnectedRef.current) {
          await connect();
        }
        interrupt();
        // Use a small delay to ensure connection state is updated if needed,
        // though isConnectedRef will be accurate after await connect()
        startRecording(
          "default",
          (base64) => {
            if (isConnectedRef.current) {
              sendAudio(base64);
            }
          },
          () => {
            if (isAiSpeakingRef.current) {
              console.log("Voice activity detected, interrupting AI...");
              interrupt();
            }
          },
          vadThreshold
        );
      })();
    }
  };

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
    <main className="flex h-[100dvh] font-sans overflow-hidden">
      {/* Desktop Sidebar (hidden on mobile, visible on lg) */}
      <div className="hidden lg:block h-full">
        <Sidebar
          currentSessionId={currentSessionId}
          onSelectSession={loadSession}
          onNewChat={startNewSession}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onCustomInstructionsClick={() => setIsCustomInstructionsOpen(true)}
          onOpenDataManagement={() => setIsDataManagementOpen(true)}
          isOpen={true}
        />
      </div>

      {/* Mobile Sidebar (Drawer) */}
      <Sidebar
        currentSessionId={currentSessionId}
        onSelectSession={loadSession}
        onNewChat={startNewSession}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onCustomInstructionsClick={() => setIsCustomInstructionsOpen(true)}
        onOpenDataManagement={() => setIsDataManagementOpen(true)}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        isMobile={true}
      />

      <div className="flex-1 flex flex-col relative h-full">
        {/* Header / Top Bar */}
        <div className="fixed top-4 left-4 z-20 lg:hidden">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 bg-zinc-100/10 dark:bg-zinc-900/80 backdrop-blur rounded-full border border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:text-zinc-500 dark:hover:text-white"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 pb-48 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
          <div className="max-w-3xl mx-auto space-y-4 pt-16 lg:pt-10">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-64 text-zinc-500 space-y-4">
                <div className="w-16 h-16 rounded-full bg-zinc-200/10 dark:bg-color-sidebar border border-color-sidebar flex items-center justify-center">
                  <span className="text-2xl">👋</span>
                </div>
                <p>Ready to start. Connect to begin.</p>
              </div>
            )}

            {messages.map((msg: Message) => (
              <ChatMessage
                key={msg.id}
                id={msg.id}
                text={msg.text}
                isUser={msg.isUser}
                isCollapsed={msg.isCollapsed}
                audio={msg.audio}
                onToggleCollapse={(isCollapsed: boolean) =>
                  toggleMessageCollapse(msg.id, isCollapsed)
                }
                onDeleteAudio={() => deleteAudio(msg.id)}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <GlobalCollapseToggle
          messages={messages}
          onToggleAll={toggleAllMessagesCollapse}
        />

        <ChatInput
          value={inputText}
          onChange={setInputText}
          onSend={handleSendText}
          isConnected={isConnected}
        />
        <ControlBar
          isConnected={isConnected}
          isRecording={isRecording}
          isAiSpeaking={isAiSpeaking}
          interrupt={interrupt}
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
          onToggleMic={handleToggleMic}
          onOpenSettings={() => setIsSettingsOpen(true)}
          status={status}
        />

        <SettingsDialog
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
        />

        <CustomInstructionsDialog
          isOpen={isCustomInstructionsOpen}
          onClose={() => setIsCustomInstructionsOpen(false)}
        />
        <DataManagementDialog
          isOpen={isDataManagementOpen}
          onClose={() => setIsDataManagementOpen(false)}
        />
      </div>
    </main>
  );
}
