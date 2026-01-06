export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private nextStartTime: number = 0;
  private sampleRate: number = 24000; // Gemini default

  constructor(sampleRate = 24000) {
    this.sampleRate = sampleRate;
  }

  /**
   * Initializes or resumes the AudioContext.
   * Must be called after a user interaction (click/tap) to unlock audio.
   */
  public async initialize() {
    if (!this.audioContext) {
      const AudioContextClass =
        window.AudioContext ||
        (window as WindowWithWebkit).webkitAudioContext;
      if (!AudioContextClass) {
        throw new Error("AudioContext is not supported in this browser");
      }
      this.audioContext = new AudioContextClass({
        sampleRate: this.sampleRate,
      });
    }
    if (this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }
  }

  /**
   * Queues a chunk of Base64 PCM audio data for playback.
   */
  public play(base64Data: string) {
    if (!this.audioContext) {
      this.initialize();
    }

    const float32Data = this.base64ToFloat32(base64Data);
    this.scheduleBuffer(float32Data);
  }

  /**
   * Converts Base64 -> Int16 PCM -> Float32 PCM
   */
  private base64ToFloat32(base64: string): Float32Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const int16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(int16.length);

    for (let i = 0; i < int16.length; i++) {
      // Normalize Int16 to Float32 range [-1.0, 1.0]
      float32[i] = int16[i] / 32768.0;
    }
    return float32;
  }

  private scheduleBuffer(audioData: Float32Array) {
    if (!this.audioContext) return;

    const buffer = this.audioContext.createBuffer(
      1,
      audioData.length,
      this.sampleRate
    );
    buffer.getChannelData(0).set(audioData);

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.audioContext.destination);

    const now = this.audioContext.currentTime;

    // Basic scheduler: play sequentially without gaps
    // If nextStartTime is in the past (underrun), reset to now
    if (this.nextStartTime < now) {
      this.nextStartTime = now;
    }

    source.start(this.nextStartTime);
    this.nextStartTime += buffer.duration;
  }

  /**
   * Stops playback and resets the context.
   */
  public stop() {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
      this.nextStartTime = 0;
    }
  }
}
