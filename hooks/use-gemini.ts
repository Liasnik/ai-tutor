import { useState, useRef, useCallback, useEffect } from "react";
import { useSettingsStore } from "@/store/settings";
import { getSystemPrompt } from "@/lib/prompts";
import { AudioPlayer } from "@/lib/audio-player";
import { GoogleGenAI } from "@google/genai";

export function useGemini() {
  const { apiKey, selectedProfile, selectedLanguage, googleSearchEnabled } =
    useSettingsStore();
  const [status, setStatus] = useState("Disconnected");
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<
    { id: string; text: string; isUser: boolean; isComplete?: boolean }[]
  >([]);

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
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), text, isUser: true },
    ]);
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
  };
}
