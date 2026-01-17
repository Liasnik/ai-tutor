"use client";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  isConnected: boolean;
}

export function ChatInput({
  value,
  onChange,
  onSend,
  isConnected,
}: ChatInputProps) {
  return (
    <div className="absolute bottom-26 left-1/2 -translate-x-1/2 w-full max-w-lg px-4">
      <div className="backdrop-blur-md bg-color-sidebar border border-color-sidebar rounded-full p-2 flex items-center shadow-2xl">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSend();
          }}
          placeholder={
            isConnected ? "Type a message..." : "Connect to send text"
          }
          className="flex-1 w-10 bg-transparent outline-none px-4 py-2 rounded-full"
        />
        <button
          onClick={onSend}
          className="ml-0 px-4 py-2 rounded-full user-message hover:scale-105 transition-all text-white font-medium"
        >
          Send
        </button>
      </div>
    </div>
  );
}
