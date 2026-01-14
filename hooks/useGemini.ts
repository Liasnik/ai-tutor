import { useState, useRef, useCallback, useEffect } from "react";
import { useSettingsStore } from "@/store/settings";
import { getSystemPrompt } from "@/lib/prompts";
import { AudioPlayer } from "@/lib/audioPlayer";
import { GoogleGenAI } from "@google/genai";
import { createSession, saveMessage, getSessionMessages } from "@/lib/db";

// Types for Gemini Live API
// Infer session type from the connect method return value
type GeminiSession = Awaited<ReturnType<GoogleGenAI["live"]["connect"]>>;

// Message type - using the actual type from library's callbacks
// The library uses LiveServerMessage internally
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
}

interface GeminiMessage {
  serverContent?: GeminiServerContent;
}

type GeminiError = { message: string } | Error;

export function useGemini() {
  const {
    apiKey,
    selectedProfile,
    selectedLanguage,
    selectedVoice,
    googleSearchEnabled,
    customInstructions,
  } = useSettingsStore();
  const [status, setStatus] = useState("Disconnected");
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<
    { id: string; text: string; isUser: boolean; isComplete?: boolean }[]
  >([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const clientRef = useRef<GoogleGenAI | null>(null);
  const sessionRef = useRef<GeminiSession | null>(null);
  const audioPlayerRef = useRef<AudioPlayer | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectionAttemptsRef = useRef(0);
  const isExplicitDisconnectRef = useRef(false);

  // Session Resumption State
  const resumptionTokenRef = useRef<string | null>(null);
  const apiSessionIdRef = useRef<string | null>(null);

  // Initialize AudioPlayer
  useEffect(() => {
    audioPlayerRef.current = new AudioPlayer();
    return () => {
      audioPlayerRef.current?.stop();
    };
  }, []);

  // Helper to ensure session exists
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
    }));
    setMessages(uiMsgs);
    setCurrentSessionId(sessionId);
  }, []);

  const startNewSession = useCallback(() => {
    setMessages([]);
    setCurrentSessionId(null);
    if (isConnected) {
      // Keep connection but reset context?
      // Gemini Live is stateful. Ideally we should reconnect or send a "reset" signal if supported,
      // but simply clearing UI and IDs starts a "new" logical chat for storage.
    }
  }, [isConnected]);

  const disconnect = useCallback(async (clearResumption = true) => {
    isExplicitDisconnectRef.current = clearResumption;

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
    setIsConnected(false);
    setStatus("Disconnected");
  }, []);

  const connect = useCallback(async () => {
    if (!apiKey) {
      setStatus("Error: No API Key");
      return;
    }

    // Block any auto-reconnect triggers while we are manually connecting
    const previousExplicitState = isExplicitDisconnectRef.current;
    isExplicitDisconnectRef.current = true;
    await disconnect(false);
    isExplicitDisconnectRef.current = previousExplicitState;

    try {
      setStatus("Connecting...");
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
            console.log("Session opened");
            setStatus("Connected");
            setIsConnected(true);
            reconnectionAttemptsRef.current = 0;
            isExplicitDisconnectRef.current = false;

            // Start Heartbeat
            if (heartbeatIntervalRef.current)
              clearInterval(heartbeatIntervalRef.current);
            heartbeatIntervalRef.current = setInterval(() => {
              if (sessionRef.current) {
                // Sending an empty audio chunk as a "keep-alive" if no native ping is exposed
                // Or a small text if allowed. Better to use simple empty input for real-time.
                sessionRef.current.sendRealtimeInput({
                  audio: {
                    data: "AA==", // Tiny empty PCM chunk (1 byte of zero)
                    mimeType: "audio/pcm;rate=16000",
                  },
                });
              }
            }, 30000);
          },
          onmessage: ((message: unknown) => {
            const msg = message as any;

            // Handle Session Resumption Data (can be at root or serverContent)
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
                apiSessionIdRef.current = resumptionUpdate.sessionId;
              }
            }

            // Handle Audio Output
            if (msg.serverContent?.modelTurn?.parts) {
              for (const part of msg.serverContent.modelTurn.parts) {
                if (
                  part.inlineData &&
                  part.inlineData.mimeType?.startsWith("audio/")
                ) {
                  audioPlayerRef.current?.play(part.inlineData.data);
                }
              }
            }

            // Handle Output Transcription (The actual spoken text, filtering out thoughts)
            if (msg.serverContent?.outputTranscription?.text) {
              const text = msg.serverContent.outputTranscription.text;
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
                return [
                  ...prev,
                  { id: Date.now().toString(), text: text, isUser: false },
                ];
              });
            }

            // Handle Turn Complete
            if (msg.serverContent?.turnComplete) {
              setStatus("Listening...");
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last && !last.isUser) {
                  return [...prev.slice(0, -1), { ...last, isComplete: true }];
                }
                return prev;
              });
            }
          }) as (message: unknown) => void,
          onclose: (e: CloseEvent | Event) => {
            console.log("Session closed", e);
            setStatus("Disconnected");
            setIsConnected(false);

            if (heartbeatIntervalRef.current)
              clearInterval(heartbeatIntervalRef.current);

            // Auto-reconnect if not explicit
            if (!isExplicitDisconnectRef.current) {
              const delay = Math.min(
                1000 * Math.pow(2, reconnectionAttemptsRef.current),
                30000
              );
              console.log(`Attempting reconnect in ${delay}ms...`);
              reconnectionAttemptsRef.current++;
              reconnectionTimeoutRef.current = setTimeout(() => {
                connect();
              }, delay);
            }
          },
          onerror: (e: GeminiError | Error) => {
            console.error("Session error", e);
            setStatus("Error: " + e.message);
          },
        },
        config: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          responseModalities: ["AUDIO"] as any,
          outputAudioTranscription: {},
          // Enable resumption from the start. If we have a token, use it as 'handle'.
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
      console.error("Connection failed:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      setStatus("Error: " + errorMessage);
      setIsConnected(false);
    }
  }, [
    apiKey,
    selectedProfile,
    selectedLanguage,
    selectedVoice,
    googleSearchEnabled,
    customInstructions,
    disconnect,
  ]);

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
          });
        }
      }
    });
  }, [messages, currentSessionId, ensureSession]);

  const sendAudio = useCallback(async (base64Data: string) => {
    if (!sessionRef.current) return;
    try {
      await sessionRef.current.sendRealtimeInput({
        audio: {
          data: base64Data,
          mimeType: "audio/pcm;rate=16000", // Browser recording rate
        },
      });
    } catch (e) {
      console.error("Error sending audio:", e);
    }
  }, []);

  const sendText = useCallback(async (text: string) => {
    if (!sessionRef.current) return;

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
  }, []);

  return {
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
  };
}
