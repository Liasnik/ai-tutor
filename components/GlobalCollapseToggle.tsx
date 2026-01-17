"use client";

import { Maximize2, Minimize2 } from "lucide-react";

interface Message {
  id: string;
  isUser: boolean;
  isCollapsed?: boolean;
}

interface GlobalCollapseToggleProps {
  messages: Message[];
  onToggleAll: (isCollapsed: boolean) => void;
}

export function GlobalCollapseToggle({
  messages,
  onToggleAll,
}: GlobalCollapseToggleProps) {
  const aiMessages = messages.filter((m) => !m.isUser);
  if (aiMessages.length === 0) return null;

  const hasExpanded = aiMessages.some((m) => !m.isCollapsed);

  return (
    <div className="fixed right-5 bottom-43 z-20">
      <button
        onClick={() => onToggleAll(hasExpanded)}
        className="p-3 bg-color-sidebar border border-color-sidebar backdrop-blur-md rounded-full text-zinc-400 hover:text-white transition-all shadow-lg group"
        title={hasExpanded ? "Collapse All" : "Expand All"}
      >
        {hasExpanded ? (
          <Minimize2 className="w-5 h-5 group-hover:scale-110" />
        ) : (
          <Maximize2 className="w-5 h-5 group-hover:scale-110" />
        )}
      </button>
    </div>
  );
}
