import { useState, useRef, useCallback } from "react";

export function useMicrophone() {
  const [isRecording, setIsRecording] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = useCallback(
    async (deviceId: string, onAudioData: (base64: string) => void) => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            deviceId: deviceId ? { exact: deviceId } : undefined,
            sampleRate: 16000,
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        streamRef.current = stream;

        const AudioContextClass =
          window.AudioContext ||
          (window as WindowWithWebkit).webkitAudioContext;
        if (!AudioContextClass) {
          throw new Error("AudioContext is not supported in this browser");
        }
        const audioContext = new AudioContextClass({
          sampleRate: 16000,
        });
        audioContextRef.current = audioContext;

        await audioContext.resume();

        const source = audioContext.createMediaStreamSource(stream);
        // Buffer size 4096 is substantial (~250ms at 16k), good for networking
        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        source.connect(processor);
        processor.connect(audioContext.destination);

        processor.onaudioprocess = (e) => {
          if (!audioContextRef.current) return;

          const inputData = e.inputBuffer.getChannelData(0);

          // Convert Float32 to Int16 PCM
          const pcmData = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            const s = Math.max(-1, Math.min(1, inputData[i]));
            pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
          }

          // Convert to Base64
          const bytes = new Uint8Array(pcmData.buffer);
          let binary = "";
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const base64 = btoa(binary);

          onAudioData(base64);
        };

        setIsRecording(true);
      } catch (err) {
        console.error("Error starting microphone:", err);
        setIsRecording(false);
      }
    },
    []
  );

  const stopRecording = useCallback(() => {
    setIsRecording(false);

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  return { isRecording, startRecording, stopRecording };
}
