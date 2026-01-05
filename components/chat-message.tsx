"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function ChatMessage({
  text,
  isUser = false,
}: {
  text: string;
  isUser?: boolean;
}) {
  return (
    <div
      className={`flex w-full mb-4 ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[85%] rounded-2xl px-5 py-3 shadow-sm prose prose-invert prose-sm max-w-none break-words ${
          isUser
            ? "bg-blue-600 text-white rounded-br-none"
            : "bg-zinc-800/80 text-zinc-100 rounded-bl-none border border-zinc-700/50 backdrop-blur-sm"
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
            code: ({ node, inline, className, children, ...props }: any) => {
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
    </div>
  );
}
