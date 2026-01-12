"use client";

import { useEffect, useState } from "react";
import { getSessions, deleteSession } from "@/lib/db";
import { MessageSquare, Trash2, Plus, X, Settings, Settings2 } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
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
    <div className="flex flex-col lg:pt-4 h-full w-64 bg-color-sidebar border-r-color-sidebar sidebar-solid">
      <div className="lg:hidden p-4 py-2 border-b border-zinc-800 flex items-center justify-end">
        {isMobile && onClose && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-900 rounded-full text-zinc-400 cursor-pointer"
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
          className="w-full flex items-center justify-center space-x-2 user-message hover:scale-105 transition-transform text-white py-2 px-4 rounded-lg cursor-pointer"
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
                ? "bg-slate-200 dark:bg-slate-800 dark:text-white"
                : "text-zinc-500 dark:text-zinc-500 hover:bg-[rgba(0,0,0,0.06)] dark:hover:bg-slate-900 dark:hover:text-zinc-200"
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
              className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-300/80 text-zinc-500 hover:text-red-500 rounded-full transition-all"
              title="Delete chat"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Custom AI Instructions button at bottom */}
      <div className="flex flex-col p-4 border-t gap-2 border-t-color-sidebar">
      
        
        <button
          onClick={() => {
            onCustomInstructionsClick();
            if (isMobile && onClose) onClose();
          }}
          className="w-full flex items-center justify-start space-x-2 py-2 px-3 rounded-lg transition-colors text-color-sidebar-foreground hover:text-white hover:bg-[rgba(0,0,0,0.06)] dark:hover:bg-slate-900 cursor-pointer"
        >
          <Settings2 className="w-4 h-4" />
          <span>Custom AI Instructions</span>
        </button>
        <button
          onClick={() => {
            onOpenSettings();
            if (isMobile && onClose) onClose();
          }}
          className="w-full flex items-center justify-start space-x-2 py-2 px-3 rounded-lg transition-colors text-color-sidebar-foreground hover:bg-[rgba(0,0,0,0.06)] dark:hover:bg-slate-900 cursor-pointer"
          // className="w-full flex items-center justify-center space-x-2 py-2 px-4 rounded-lg transition-colors always-primary-bg always-primary-text always-primary-hover"
        >
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </button>
          {/* Theme toggle */}
          <ThemeToggle />
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
