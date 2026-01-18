import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useSettingsStore } from "@/store/settings";
import { getSystemPrompt } from "@/lib/prompts";
import { AudioPlayer } from "@/lib/audioPlayer";
import { GoogleGenAI, Modality } from "@google/genai";
import { base64ToInt16, encodePcmToMp3 } from "@/lib/audioEncoder";
import {
  createSession,
  saveMessage,
  getSessionMessages,
  updateSession,
  getSession,
} from "@/lib/db";

// Types for Gemini Live API
type GeminiSession = Awaited<ReturnType<GoogleGenAI["live"]["connect"]>>;

interface GeminiResumptionUpdate {
  resumptionToken?: string;
  newHandle?: string;
  handle?: string;
  sessionId?: string;
}

interface GeminiServerContent {
  modelTurn?: {
    parts?: Array<{
      inlineData?: {
        data: string;
        mimeType?: string;
      };
    }>;
  };
  outputTranscription?: {
    text: string;
  };
  turnComplete?: boolean;
  sessionResumptionUpdate?: GeminiResumptionUpdate;
}

interface GeminiMessage {
  serverContent?: GeminiServerContent;
  sessionResumptionUpdate?: GeminiResumptionUpdate;
}

type GeminiError = { message: string } | Error;

// Connection State Machine
export type ConnectionState =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnecting"
  | "reconnecting"
  | "error";

export function useGemini() {
  const {
    apiKey,
    selectedProfile,
    selectedLanguage,
    selectedVoice,
    googleSearchEnabled,
    customInstructions,
  } = useSettingsStore();

  const [connectionState, setConnectionState] =
    useState<ConnectionState>("idle");
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);

  // Computed status for UI compatibility
  const isConnected =
    connectionState === "connected" || connectionState === "reconnecting";
  const status = useMemo(() => {
    switch (connectionState) {
      case "idle":
        return "Disconnected";
      case "connecting":
        return "Connecting...";
      case "connected":
        return "Listening...";
      case "disconnecting":
        return "Disconnecting...";
      case "reconnecting":
        return "Reconnecting...";
      case "error":
        return errorDetails ? `Error: ${errorDetails}` : "Error";
      default:
        return "Disconnected";
    }
  }, [connectionState, errorDetails]);

  const [messages, setMessages] = useState<
    {
      id: string;
      text: string;
      isUser: boolean;
      isComplete?: boolean;
      isCollapsed?: boolean;
      audio?: Blob;
    }[]
  >([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const currentSessionIdRef = useRef<string | null>(null);

  // Sync ref with state
  useEffect(() => {
    currentSessionIdRef.current = currentSessionId;
  }, [currentSessionId]);

  const [preferCollapsed, setPreferCollapsed] = useState(false);
  const preferCollapsedRef = useRef(false);

  useEffect(() => {
    preferCollapsedRef.current = preferCollapsed;
  }, [preferCollapsed]);

  const clientRef = useRef<GoogleGenAI | null>(null);
  const sessionRef = useRef<GeminiSession | null>(null);
  const audioPlayerRef = useRef<AudioPlayer | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectionAttemptsRef = useRef(0);
  const connectRef = useRef<() => Promise<void>>(async () => {});

  // Distinguishes manual disconnects from accidental drops for auto-reconnect
  const isExplicitDisconnectRef = useRef(false);

  // Session Resumption State
  const resumptionTokenRef = useRef<string | null>(null);
  const apiSessionIdRef = useRef<string | null>(null);

  // Audio Accumulation
  const currentAudioChunksRef = useRef<Int16Array[]>([]);

  // Interrupt State Tracking
  const isInterruptedRef = useRef(false);

  // Initialize AudioPlayer
  useEffect(() => {
    audioPlayerRef.current = new AudioPlayer();
    return () => {
      audioPlayerRef.current?.stop();
    };
  }, []);

  // Ensure strict cleanup on unmount to prevent ghost connections
  useEffect(() => {
    return () => {
      // Force cleanup on unmount
      if (sessionRef.current) {
        isExplicitDisconnectRef.current = true; // Prevent auto-reconnect

        if (reconnectionTimeoutRef.current)
          clearTimeout(reconnectionTimeoutRef.current);
        if (heartbeatIntervalRef.current)
          clearInterval(heartbeatIntervalRef.current);

        try {
          sessionRef.current.close();
        } catch (e) {
          console.error("Error closing session on cleanup", e);
        }
        sessionRef.current = null;
      }
    };
  }, []);

  // Helper to ensure session exists in DB
  const ensureSession = useCallback(async () => {
    if (!currentSessionId) {
      const newId = Date.now().toString();
      await createSession(newId, selectedProfile);
      setCurrentSessionId(newId);
      return newId;
    }
    return currentSessionId;
  }, [currentSessionId, selectedProfile]);

  const loadSession = useCallback(async (sessionId: string) => {
    const msgs = await getSessionMessages(sessionId);
    // Map DB messages to UI messages
    const uiMsgs = msgs.map((m) => ({
      id: m.id,
      text: m.text,
      isUser: m.isUser,
      isComplete: true, // Old messages are always complete
      isCollapsed: m.isCollapsed,
      audio: m.audio,
    }));
    setMessages(uiMsgs);
    setCurrentSessionId(sessionId);

    // Load resumption token if exists
    const session = await getSession(sessionId);
    if (session?.resumptionToken) {
      resumptionTokenRef.current = session.resumptionToken;
      apiSessionIdRef.current = session.apiSessionId || null;
    } else {
      resumptionTokenRef.current = null;
      apiSessionIdRef.current = null;
    }
  }, []);

  const startNewSession = useCallback(() => {
    setMessages([]);
    setCurrentSessionId(null);
    resumptionTokenRef.current = null; // Reset resumption token for new chat
    apiSessionIdRef.current = null;
  }, []);

  const clearResumptionToken = useCallback(async () => {
    resumptionTokenRef.current = null;
    apiSessionIdRef.current = null;
    const targetId = currentSessionIdRef.current || currentSessionId;
    if (targetId) {
      try {
        await updateSession(targetId, {
          resumptionToken: undefined,
          apiSessionId: undefined,
        });
      } catch (err) {
        console.warn("Failed to clear resumption token in DB", err);
      }
    }
  }, [currentSessionId]);

  const disconnect = useCallback(async (clearResumption = true) => {
    isExplicitDisconnectRef.current = true;
    setConnectionState("disconnecting");
    setIsAiSpeaking(false);
    isInterruptedRef.current = false;

    if (clearResumption) {
      resumptionTokenRef.current = null;
      apiSessionIdRef.current = null;
      reconnectionAttemptsRef.current = 0;
    }

    if (reconnectionTimeoutRef.current) {
      clearTimeout(reconnectionTimeoutRef.current);
    }

    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    if (sessionRef.current) {
      try {
        sessionRef.current.close();
      } catch (e) {
        console.error("Error closing session", e);
      }
      sessionRef.current = null;
    }
    setConnectionState("idle");
  }, []);

  const scheduleReconnect = useCallback(() => {
    setIsAiSpeaking(false);
    // Only reconnect if it wasn't an explicit disconnect and we haven't exceeded attempts
    if (
      !isExplicitDisconnectRef.current &&
      reconnectionAttemptsRef.current < 5
    ) {
      const delay = Math.min(
        1000 * Math.pow(2, reconnectionAttemptsRef.current),
        30000
      );
      setConnectionState("reconnecting");
      reconnectionAttemptsRef.current++;

      reconnectionTimeoutRef.current = setTimeout(() => {
        if (connectRef.current) connectRef.current();
      }, delay);
    } else {
      setConnectionState("idle");
    }
  }, []);

  const connect = useCallback(async () => {
    if (!apiKey) {
      setConnectionState("error");
      setErrorDetails("No API Key");
      return;
    }

    // Prepare for new connection
    // Ensure any previous session is cleaned up but DON'T clear resumption if we want to resume
    const previousExplicit = isExplicitDisconnectRef.current;
    isExplicitDisconnectRef.current = true; // Block auto-reconnect during manual setup
    await disconnect(false); // false = keep resumption token if it exists
    isExplicitDisconnectRef.current = previousExplicit; // Restore intent

    // Reset explicit disconnect for the new attempt
    isExplicitDisconnectRef.current = false;

    // Restore info from DB if we are reconnecting to an existing session but lost the ref
    const sid = currentSessionIdRef.current || currentSessionId;
    if (sid && !resumptionTokenRef.current) {
      try {
        const sess = await getSession(sid);
        if (sess?.resumptionToken) {
          resumptionTokenRef.current = sess.resumptionToken;
          apiSessionIdRef.current = sess.apiSessionId || null;
        }
      } catch (err) {
        console.warn("Failed to restore session token", err);
      }
    }

    try {
      setConnectionState("connecting");
      setErrorDetails(null);
      isInterruptedRef.current = false;

      clientRef.current = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: { apiVersion: "v1alpha" },
      });

      const systemPrompt = getSystemPrompt(
        selectedProfile,
        customInstructions,
        googleSearchEnabled
      );

      const session = await clientRef.current.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-12-2025",
        callbacks: {
          onopen: () => {
            setConnectionState("connected");
            reconnectionAttemptsRef.current = 0;
            isExplicitDisconnectRef.current = false;
          },
          onmessage: ((message: unknown) => {
            const msg = message as GeminiMessage;

            // Handle Session Resumption Data
            const resumptionUpdate =
              msg.sessionResumptionUpdate ||
              msg.serverContent?.sessionResumptionUpdate;
            if (resumptionUpdate) {
              const newToken =
                resumptionUpdate.resumptionToken ||
                resumptionUpdate.newHandle ||
                resumptionUpdate.handle;
              if (newToken) {
                resumptionTokenRef.current = newToken;
                apiSessionIdRef.current = resumptionUpdate.sessionId || null;

                // Persist to DB using the ref to ensure we use current ID
                if (currentSessionIdRef.current) {
                  updateSession(currentSessionIdRef.current, {
                    resumptionToken: newToken,
                    apiSessionId: resumptionUpdate.sessionId,
                  });
                }
              }
            }

            // Handle Audio Output
            const parts = msg.serverContent?.modelTurn?.parts;
            if (parts && !isInterruptedRef.current) {
              for (const part of parts) {
                if (
                  part.inlineData &&
                  part.inlineData.mimeType?.startsWith("audio/")
                ) {
                  setIsAiSpeaking(true);
                  audioPlayerRef.current?.play(part.inlineData.data);
                  // Accumulate audio for persistence
                  try {
                    const chunk = base64ToInt16(part.inlineData.data);
                    currentAudioChunksRef.current.push(chunk);
                  } catch (err) {
                    console.error(
                      "[useGemini] Error decoding audio chunk:",
                      err
                    );
                  }
                }
              }
            }

            // Handle Output Transcription (The actual spoken text, filtering out thoughts)
            const text = msg.serverContent?.outputTranscription?.text;
            if (text && !isInterruptedRef.current) {
              setIsAiSpeaking(true);
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                // If previous message exists, is from AI, and is NOT complete -> append
                if (last && !last.isUser && !last.isComplete) {
                  return [
                    ...prev.slice(0, -1),
                    { ...last, text: last.text + text },
                  ];
                }
                // Otherwise start a new AI message
                const newAiMessageId = Date.now().toString();
                return [
                  ...prev,
                  {
                    id: newAiMessageId,
                    text: text,
                    isUser: false,
                    isCollapsed: preferCollapsedRef.current,
                  },
                ];
              });
            }

            if (msg.serverContent?.turnComplete) {
              isInterruptedRef.current = false;
              setIsAiSpeaking(false);

              // Calculate blob OUTSIDE the updater to avoid side-effect issues with React double-invoking updaters
              let audioBlob: Blob | undefined = undefined;
              if (currentAudioChunksRef.current.length > 0) {
                try {
                  audioBlob = encodePcmToMp3(currentAudioChunksRef.current);
                  currentAudioChunksRef.current = [];
                } catch (err) {
                  console.error("[useGemini] Encoding failed:", err);
                }
              }

              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last && !last.isUser && !last.isComplete) {
                  return [
                    ...prev.slice(0, -1),
                    { ...last, isComplete: true, audio: audioBlob },
                  ];
                }
                return prev;
              });
            }
          }) as (message: unknown) => void,
          onclose: (e: CloseEvent | Event) => {
            const code = "code" in e ? e.code : "unknown";
            const reason = "reason" in e ? (e as any).reason : "";

            if (heartbeatIntervalRef.current)
              clearInterval(heartbeatIntervalRef.current);

            // Only clear token for errors that definitively mean the session is gone/invalid
            // Note: Code 1000 (Normal Closure) is intentionally excluded as we WANT to resume from it.
            const isSessionFatal =
              code === 1008 ||
              code === 4004 ||
              reason.toLowerCase().includes("session not found") ||
              reason.toLowerCase().includes("invalid handle") ||
              reason.toLowerCase().includes("expired handle");

            if (isSessionFatal) {
              console.error(
                `Critical session error (${code}), clearing resumption token. Reason: ${reason}`
              );
              clearResumptionToken();
            }

            scheduleReconnect();
          },
          onerror: (e: GeminiError | Error) => {
            console.error("Session error", e);
            setIsAiSpeaking(false);
            setConnectionState("error");
            setErrorDetails(e instanceof Error ? e.message : String(e));
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          outputAudioTranscription: {},
          sessionResumption: {
            handle: resumptionTokenRef.current || undefined,
          },
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: selectedVoice,
              },
            },
            languageCode: selectedLanguage,
          },
          systemInstruction: { parts: [{ text: systemPrompt }] },
          tools: googleSearchEnabled ? [{ googleSearch: {} }] : [],
        },
      });

      sessionRef.current = session;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      setConnectionState("error");
      setErrorDetails(errorMessage);

      // Only clear the token if the throw was explicitly due to a bad session/handle
      const isSessionError =
        errorMessage.toLowerCase().includes("session not found") ||
        errorMessage.toLowerCase().includes("invalid resumption") ||
        errorMessage.toLowerCase().includes("expired handle");

      if (isSessionError) {
        clearResumptionToken();
      }

      // Retry logic handled by scheduleReconnect logic check
      if (
        !isExplicitDisconnectRef.current &&
        reconnectionAttemptsRef.current < 5
      ) {
        scheduleReconnect();
      }
    }
  }, [
    apiKey,
    selectedProfile,
    selectedLanguage,
    selectedVoice,
    googleSearchEnabled,
    customInstructions,
    disconnect,
    scheduleReconnect,
  ]);

  // Keep connectRef synced
  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  // Save messages to DB effect
  const savedMessageIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    // We only save completed AI messages or User messages
    messages.forEach(async (msg) => {
      if (
        (msg.isUser || msg.isComplete) &&
        !savedMessageIds.current.has(msg.id)
      ) {
        savedMessageIds.current.add(msg.id);

        // Ensure session exists lazily
        let sessionId = currentSessionId;
        if (!sessionId) {
          // Double check inside async
          sessionId = await ensureSession();
        }

        if (sessionId) {
          await saveMessage({
            id: msg.id,
            sessionId,
            text: msg.text,
            isUser: msg.isUser,
            timestamp: Number(msg.id),
            isCollapsed: msg.isCollapsed,
            audio: msg.audio,
          });
        }
      }
    });
  }, [messages, currentSessionId, ensureSession]);

  const interrupt = useCallback(() => {
    setIsAiSpeaking(false);
    isInterruptedRef.current = true;
    audioPlayerRef.current?.stop();

    // Finalize audio for the current (interrupted) AI message if any
    if (currentAudioChunksRef.current.length > 0) {
      try {
        const audioBlob = encodePcmToMp3(currentAudioChunksRef.current);
        currentAudioChunksRef.current = [];
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last && !last.isUser && !last.isComplete) {
            return [
              ...prev.slice(0, -1),
              { ...last, audio: audioBlob, isComplete: true },
            ];
          }
          return prev;
        });
      } catch (e) {
        console.error("Error finalizing partial audio on interrupt:", e);
      }
    }

    if (sessionRef.current) {
      try {
        const session = sessionRef.current as any;
        // 1. Send explicit interrupt signal
        session.sendRealtimeInput({ interrupt: true });

        // 2. Force terminate turn by sending a dummy input
        // This ensures the server sends a 'turnComplete' which will reset our interrupt block.
        // We use a small string of spaces as suggested by the user.
        session.sendRealtimeInput({ text: " ".repeat(512) });
      } catch (e) {
        console.error("Error sending interrupt:", e);
      }
    }
  }, []);

  const sendAudio = useCallback(async (base64Data: string) => {
    if (!sessionRef.current) return;
    // Note: We NO LONGER reset isInterruptedRef here.
    // It will be reset by turnComplete from the server or by an explicit sendText.
    try {
      await sessionRef.current.sendRealtimeInput({
        audio: {
          data: base64Data,
          mimeType: "audio/pcm;rate=16000",
        },
      });
    } catch (e) {
      console.error("Error sending audio:", e);
    }
  }, []);

  const sendText = useCallback(
    async (text: string) => {
      if (!sessionRef.current) return;

      interrupt();
      isInterruptedRef.current = false; // Explicit send, reset block
      // Create new user message
      const newMessage = {
        id: Date.now().toString(),
        text,
        isUser: true,
        isComplete: true,
      };
      setMessages((prev) => [...prev, newMessage]);

      try {
        await sessionRef.current.sendRealtimeInput({ text });
      } catch (e) {
        console.error("Error sending text:", e);
      }
    },
    [interrupt]
  );

  const toggleMessageCollapse = useCallback(
    async (id: string, isCollapsed: boolean) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, isCollapsed } : m))
      );
      // Persist to DB
      const { updateMessageState } = await import("@/lib/db");
      await updateMessageState(id, isCollapsed);
    },
    []
  );

  const toggleAllMessagesCollapse = useCallback(
    async (isCollapsed: boolean) => {
      setPreferCollapsed(isCollapsed);
      setMessages((prev) =>
        prev.map((m) => (m.isUser ? m : { ...m, isCollapsed }))
      );
      // Persist to DB
      if (currentSessionId) {
        const { bulkUpdateMessagesState } = await import("@/lib/db");
        await bulkUpdateMessagesState(currentSessionId, isCollapsed);
      }
    },
    [currentSessionId]
  );

  const deleteAudio = useCallback(async (messageId: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, audio: undefined } : m))
    );
    const { deleteMessageAudio } = await import("@/lib/db");
    await deleteMessageAudio(messageId);
  }, []);

  return {
    status,
    isConnected,
    messages,
    connect,
    disconnect,
    sendAudio,
    sendText,
    interrupt,
    isAiSpeaking,
    currentSessionId,
    loadSession,
    startNewSession,
    toggleMessageCollapse,
    toggleAllMessagesCollapse,
    deleteAudio,
  };
}
