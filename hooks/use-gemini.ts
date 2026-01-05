import { useState, useRef, useCallback, useEffect } from "react";
import { useSettingsStore } from "@/store/settings";
import { getSystemPrompt } from "@/lib/prompts";
import { AudioPlayer } from "@/lib/audio-player";
import { GoogleGenAI } from "@google/genai";
import { createSession, saveMessage, getSessionMessages } from "@/lib/db";

export function useGemini() {
  const { apiKey, selectedProfile, selectedLanguage, googleSearchEnabled } =
    useSettingsStore();
  const [status, setStatus] = useState("Disconnected");
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<
    { id: string; text: string; isUser: boolean; isComplete?: boolean }[]
  >([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const clientRef = useRef<GoogleGenAI | null>(null);
  const sessionRef = useRef<any>(null);
  const audioPlayerRef = useRef<AudioPlayer | null>(null);

  // Initialize AudioPlayer
  useEffect(() => {
    audioPlayerRef.current = new AudioPlayer();
    return () => {
      audioPlayerRef.current?.stop();
    };
  }, []);

  // Helper to ensure session exists
  const ensureSession = async () => {
    if (!currentSessionId) {
      const newId = Date.now().toString();
      await createSession(newId, selectedProfile);
      setCurrentSessionId(newId);
      return newId;
    }
    return currentSessionId;
  };

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

  const disconnect = useCallback(async () => {
    if (sessionRef.current) {
      try {
        await sessionRef.current.close();
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

    await disconnect();

    try {
      setStatus("Connecting...");
      clientRef.current = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: { apiVersion: "v1alpha" },
      });

      const systemPrompt = getSystemPrompt(
        selectedProfile,
        "",
        googleSearchEnabled
      );

      const session = await clientRef.current.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-12-2025",
        callbacks: {
          onopen: () => {
            console.log("Session opened");
            setStatus("Connected");
            setIsConnected(true);
            setMessages([]);
          },
          onmessage: (message: any) => {
            // Handle Audio Output
            if (message.serverContent?.modelTurn?.parts) {
              for (const part of message.serverContent.modelTurn.parts) {
                if (
                  part.inlineData &&
                  part.inlineData.mimeType?.startsWith("audio/")
                ) {
                  audioPlayerRef.current?.play(part.inlineData.data);
                }
              }
            }

            // Handle Output Transcription (The actual spoken text, filtering out thoughts)
            if (message.serverContent?.outputTranscription?.text) {
              const text = message.serverContent.outputTranscription.text;
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
            if (message.serverContent?.turnComplete) {
              setStatus("Listening...");
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last && !last.isUser) {
                  return [...prev.slice(0, -1), { ...last, isComplete: true }];
                }
                return prev;
              });
            }
          },
          onclose: (e: any) => {
            console.log("Session closed", e);
            setStatus("Disconnected");
            setIsConnected(false);
          },
          onerror: (e: any) => {
            console.error("Session error", e);
            setStatus("Error: " + e.message);
          },
        },
        config: {
          responseModalities: ["AUDIO" as any], // Type assertion for Modality enum
          outputAudioTranscription: {}, // Enable text output
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } },
          },
          systemInstruction: { parts: [{ text: systemPrompt }] },
          tools: googleSearchEnabled ? [{ googleSearch: {} }] : [],
        },
      });

      sessionRef.current = session;
    } catch (error: any) {
      console.error("Connection failed:", error);
      setStatus("Error: " + error.message);
      setIsConnected(false);
    }
  }, [
    apiKey,
    selectedProfile,
    selectedLanguage,
    googleSearchEnabled,
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
  }, [messages, currentSessionId]);

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
