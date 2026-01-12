"use client";

import { useEffect, useState } from "react";
import { getSessions, deleteSession } from "@/lib/db";
import { MessageSquare, Trash2, Plus, X, Settings, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Session {
  id: string;
  title: string;
  profile: string;
  timestamp: number;
}

interface HistorySidebarProps {
  currentSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onNewChat: () => void;
  onOpenSettings: () => void;
  onCustomInstructionsClick: () => void;
  isOpen?: boolean;
  onClose?: () => void; // For mobile
  isMobile?: boolean;
}

export function Sidebar({
  currentSessionId,
  onSelectSession,
  onNewChat,
  onOpenSettings,
  onCustomInstructionsClick,
  isOpen = true,
  onClose,
  isMobile = false,
}: HistorySidebarProps) {
  const [sessions, setSessions] = useState<Session[]>([]);

  
  const loadSessions = async () => {
    const list = await getSessions();
    // Sort by newest first
    setSessions(list.reverse());
  };
  
  useEffect(() => {
    (async () => {
      await loadSessions();
    })();
  }, [isOpen, currentSessionId]); // Reload when opened or session changes

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this chat?")) {
      await deleteSession(id);
      loadSessions();
      if (currentSessionId === id) {
        onNewChat();
      }
    }
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-zinc-900 border-r border-zinc-800 w-64">
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
        <h2 className="font-semibold text-zinc-100">Chat History</h2>
        {isMobile && onClose && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-md text-zinc-400"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="p-4">
        <button
          onClick={() => {
            onNewChat();
            if (isMobile && onClose) onClose();
          }}
          className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Chat</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {sessions.length === 0 && (
          <div className="text-center text-zinc-500 text-sm mt-10">
            No history yet.
          </div>
        )}
        {sessions.map((session) => (
          <div
            key={session.id}
            onClick={() => {
              onSelectSession(session.id);
              if (isMobile && onClose) onClose();
            }}
            className={cn(
              "group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all",
              currentSessionId === session.id
                ? "bg-zinc-800 text-white"
                : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
            )}
          >
            <div className="flex items-center space-x-3 overflow-hidden">
              <MessageSquare className="w-4 h-4 shrink-0" />
              <div className="flex flex-col truncate">
                <span className="truncate text-sm font-medium">
                  {session.title}
                </span>
                <span className="text-xs text-zinc-500">
                  {new Date(session.timestamp).toLocaleDateString()}
                </span>
              </div>
            </div>
            <button
              onClick={(e) => handleDelete(e, session.id)}
              className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-900/30 text-zinc-500 hover:text-red-400 rounded transition-all"
              title="Delete chat"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Custom AI Instructions button at bottom */}
      <div className="p-4 border-t border-zinc-800">
        <button
          onClick={() => {
            onOpenSettings();
            if (isMobile && onClose) onClose();
          }}
          className="w-full flex items-center justify-start space-x-2 text-zinc-400 hover:text-white hover:bg-zinc-800 py-2 px-4 rounded-lg transition-colors"
        >
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </button>
        <button
          onClick={() => {
            onCustomInstructionsClick();
            if (isMobile && onClose) onClose();
          }}
          className="w-full flex items-center justify-center space-x-2 text-zinc-400 hover:text-white hover:bg-zinc-800 py-2 px-4 rounded-lg transition-colors"
        >
          <Settings2 className="w-4 h-4" />
          <span>Custom AI Instructions</span>
        </button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm"
              onClick={onClose}
            />
            {/* Drawer */}
            <div className="relative z-50 animate-in slide-in-from-left duration-300">
              {sidebarContent}
            </div>
          </div>
        )}
      </>
    );
  }

  return isOpen ? sidebarContent : null;
}
