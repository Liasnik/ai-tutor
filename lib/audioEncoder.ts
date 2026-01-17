import * as lamejs from "@breezystack/lamejs";

/**
 * Encodes Int16 PCM data to MP3 Blob.
 * @param pcmChunks Array of Int16Array chunks
 * @param sampleRate Default is 24000 for Gemini
 * @returns MP3 Blob
 */
export function encodePcmToMp3(
  pcmChunks: Int16Array[],
  sampleRate: number = 24000
): Blob {
  const mp3encoder = new lamejs.Mp3Encoder(1, sampleRate, 128);
  const mp3Data: Int8Array[] = [];

  for (const chunk of pcmChunks) {
    const mp3Tmp = mp3encoder.encodeBuffer(chunk);
    if (mp3Tmp.length > 0) {
      mp3Data.push(new Int8Array(mp3Tmp));
    }
  }

  const mp3Final = mp3encoder.flush();
  if (mp3Final.length > 0) {
    mp3Data.push(new Int8Array(mp3Final));
  }

  return new Blob(mp3Data as unknown as BlobPart[], {
    type: "audio/mp3",
  });
}

/**
 * Converts Base64 PCM data to Int16Array.
 */
export function base64ToInt16(base64: string): Int16Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  // Ensure the length is even for 16-bit PCM
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  // Create a new ArrayBuffer to ensure proper 2-byte alignment if needed
  const arrayBuffer = new ArrayBuffer(len);
  const dataView = new DataView(arrayBuffer);
  for (let i = 0; i < len; i++) {
    dataView.setUint8(i, bytes[i]);
  }
  return new Int16Array(arrayBuffer);
}
