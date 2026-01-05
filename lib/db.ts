import { openDB, DBSchema } from "idb";

interface ChatSession {
  id: string;
  title: string;
  profile: string;
  timestamp: number;
}

interface ChatMessage {
  id: string;
  sessionId: string;
  text: string;
  isUser: boolean;
  timestamp: number;
}

interface AiTutorDB extends DBSchema {
  sessions: {
    key: string;
    value: ChatSession;
    indexes: { "by-timestamp": number };
  };
  messages: {
    key: string;
    value: ChatMessage;
    indexes: { "by-session": string };
  };
}

const DB_NAME = "ai-tutor-db";
const DB_VERSION = 1;

export async function initDB() {
  return openDB<AiTutorDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("sessions")) {
        const sessionStore = db.createObjectStore("sessions", {
          keyPath: "id",
        });
        sessionStore.createIndex("by-timestamp", "timestamp");
      }
      if (!db.objectStoreNames.contains("messages")) {
        const messageStore = db.createObjectStore("messages", {
          keyPath: "id",
        });
        messageStore.createIndex("by-session", "sessionId");
      }
    },
  });
}

export async function createSession(
  id: string,
  profile: string,
  title?: string
) {
  const db = await initDB();
  const session: ChatSession = {
    id,
    profile,
    title: title || `${profile} - ${new Date().toLocaleString()}`,
    timestamp: Date.now(),
  };
  await db.put("sessions", session);
  return session;
}

export async function getSessions() {
  const db = await initDB();
  return db.getAllFromIndex("sessions", "by-timestamp");
}

export async function saveMessage(message: ChatMessage) {
  const db = await initDB();
  await db.put("messages", message);
}

export async function getSessionMessages(sessionId: string) {
  const db = await initDB();
  const messages = await db.getAllFromIndex(
    "messages",
    "by-session",
    sessionId
  );
  return messages.sort((a, b) => a.timestamp - b.timestamp);
}

export async function deleteSession(sessionId: string) {
  const db = await initDB();
  const tx = db.transaction(["sessions", "messages"], "readwrite");
  await tx.objectStore("sessions").delete(sessionId);

  // Delete all messages for this session
  // Note: Ideally range delete, but for now iterate (efficiency TODO)
  const index = tx.objectStore("messages").index("by-session");
  let cursor = await index.openCursor(sessionId);
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  await tx.done;
}
