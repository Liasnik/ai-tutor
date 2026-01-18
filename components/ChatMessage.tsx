"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ReactNode, HTMLAttributes } from "react";
import { ChevronDown, ChevronUp, Volume2, Trash2, Pause } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useSettingsStore } from "@/store/settings";

interface CodeProps extends HTMLAttributes<HTMLElement> {
  node?: unknown;
  inline?: boolean;
  children?: ReactNode;
}
export function ChatMessage({
  id,
  text,
  isUser = false,
  isCollapsed = false,
  audio,
  onToggleCollapse,
  onDeleteAudio,
}: {
  id: string;
  text: string;
  isUser?: boolean;
  isCollapsed?: boolean;
  audio?: Blob;
  onToggleCollapse?: (state: boolean) => void;
  onDeleteAudio?: () => void;
}) {
  const { audioDeletionEnabled } = useSettingsStore();
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handlePlay = () => {
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
      return;
    }

    if (!audio) return;

    if (!audioRef.current) {
      audioRef.current = new Audio(URL.createObjectURL(audio));
      audioRef.current.onended = () => setIsPlaying(false);
    }

    audioRef.current.play();
    setIsPlaying(true);
  };
  return (
    <div
      className={`flex w-full mb-4 px-2 ${
        isUser ? "justify-end" : "justify-start"
      }`}
    >
      <div
        className={`relative max-w-[90%] rounded-2xl px-5 py-3 shadow-sm prose prose-invert prose-sm wrap-break-word transition-all duration-300 ease-in-out ${
          isUser
            ? "rounded-br-none user-message"
            : "rounded-bl-none backdrop-blur-sm pb-7.5 bg-card text-card-foreground border border-color-border"
        } ${
          !isUser && isCollapsed
            ? "h-[30px] py-0 pt-1 overflow-hidden"
            : "h-auto"
        }`}
      >
        <div
          className={`transition-opacity duration-300 ${
            !isUser && isCollapsed ? "opacity-0 invisible" : "opacity-100"
          }`}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ node, ...props }) => (
                <p className="mb-2 last:mb-0 leading-relaxed" {...props} />
              ),
              ul: ({ node, ...props }) => (
                <ul className="list-disc ml-4 mb-2 space-y-1" {...props} />
              ),
              ol: ({ node, ...props }) => (
                <ol className="list-decimal ml-4 mb-2 space-y-1" {...props} />
              ),
              strong: ({ node, ...props }) => (
                <strong className="font-bold text-white" {...props} />
              ),
              code: ({
                node,
                inline,
                className,
                children,
                ...props
              }: CodeProps) => {
                return inline ? (
                  <code
                    className="bg-black/30 px-1 py-0.5 rounded text-sm font-mono"
                    {...props}
                  >
                    {children}
                  </code>
                ) : (
                  <pre className="bg-black/50 p-2 rounded-lg overflow-x-auto text-sm my-2">
                    <code className="font-mono text-zinc-300" {...props}>
                      {children}
                    </code>
                  </pre>
                );
              },
            }}
          >
            {text}
          </ReactMarkdown>
        </div>

        {!isUser && (
          <div className="absolute bottom-1 right-2 flex space-x-2">
            {audio && (
              <button
                onClick={handlePlay}
                className={`p-1 rounded-md transition-colors cursor-pointer ${
                  isPlaying
                    ? "text-white bg-black/20 black:bg-white/20"
                    : "text-zinc-400 hover:text-zinc-500 dark:hover:text-white hover:bg-black/6 dark:hover:bg-white/10"
                }`}
                title={isPlaying ? "Stop" : "Play Voice"}
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 sm:w-4 sm:h-4" />
                ) : (
                  <Volume2 className="w-5 h-5 sm:w-4 sm:h-4" />
                )}
              </button>
            )}
            {audio && audioDeletionEnabled && (
              <button
                onClick={onDeleteAudio}
                className="p-1 rounded-md transition-colors text-zinc-400 hover:text-red-400 hover:bg-black/6 dark:hover:bg-white/10 cursor-pointer"
                title="Delete Audio"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => onToggleCollapse?.(!isCollapsed)}
              className="p-1 rounded-md transition-colors text-zinc-400 hover:text-zinc-500 dark:hover:text-white hover:bg-black/6 dark:hover:bg-white/10 cursor-pointer"
              title={isCollapsed ? "Expand" : "Collapse"}
            >
              {isCollapsed ? (
                <ChevronDown className="w-5 h-5 sm:w-4 sm:h-4" />
              ) : (
                <ChevronUp className="w-5 h-5 sm:w-4 sm:h-4" />
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
