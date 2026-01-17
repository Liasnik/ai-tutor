"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ReactNode, HTMLAttributes } from "react";
import { ChevronDown, ChevronUp, Volume2, Square } from "lucide-react";
import { useState, useRef, useEffect } from "react";

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
}: {
  id: string;
  text: string;
  isUser?: boolean;
  isCollapsed?: boolean;
  audio?: Blob;
  onToggleCollapse?: (id: string, state: boolean) => void;
}) {
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
        } ${!isUser && isCollapsed ? "h-[40px] overflow-hidden" : "h-auto"}`}
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
          <div className="absolute bottom-2 right-2 flex space-x-1">
            {audio && (
              <button
                onClick={handlePlay}
                className={`p-1 rounded-md transition-colors ${
                  isPlaying
                    ? "text-white bg-white/20"
                    : "text-zinc-400 hover:text-white hover:bg-white/10"
                }`}
                title={isPlaying ? "Stop" : "Play Voice"}
              >
                {isPlaying ? (
                  <Square className="w-4 h-4 fill-current" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
            )}
            <button
              onClick={() => onToggleCollapse?.(id, !isCollapsed)}
              className="p-1 rounded-md hover:bg-white/10 transition-colors text-zinc-400 hover:text-white"
              title={isCollapsed ? "Expand" : "Collapse"}
            >
              {isCollapsed ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronUp className="w-4 h-4" />
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
