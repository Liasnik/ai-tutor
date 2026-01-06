# AI Tutor

A personalized AI tutor with real-time voice interaction powered by Google Gemini Live API.

## 📋 Description

AI Tutor is a web application for interactive learning using artificial intelligence. The app supports real-time voice communication, various learning modes, and conversation history storage.

### Key Features

- 🎤 **Voice Interaction** — communicate with AI through microphone in real-time
- 🔊 **Audio Responses** — AI responds with voice and natural intonation
- 📚 **Multiple Learning Profiles**:
  - Interview preparation (Interview Tutor)
  - English language tutor
  - German language tutor
  - Free conversation (various styles)
- 💾 **Chat History** — local storage of all conversations
- ⚙️ **Settings** — language selection, profile choice, custom instructions
- 🔍 **Google Search Integration** — ability to search for up-to-date information
- 📱 **PWA Support** — works as a native application
- 📝 **Markdown Rendering** — beautiful display of AI responses

## 🚀 Quick Start

### Requirements

- Node.js 18+
- npm, yarn, pnpm, or bun
- API key from Google AI Studio (Gemini API)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd ai-tutor
```

2. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Run the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

5. On first launch, enter your Google AI Studio API key in the settings

## 🛠 Technologies

### Frontend Framework
- **[Next.js 16.1.1](https://nextjs.org/)** — React framework with App Router
- **[React 19.2.3](https://react.dev/)** — library for building UI
- **[TypeScript 5](https://www.typescriptlang.org/)** — typed JavaScript

### AI & API
- **[@google/genai 1.34.0](https://www.npmjs.com/package/@google/genai)** — official SDK for Google Gemini API
- **Gemini Live API** — for real-time voice interaction
- **Gemini 2.5 Flash** — model for audio and text processing

### State Management
- **[Zustand 5.0.9](https://zustand-demo.pmnd.rs/)** — lightweight state management library
- **LocalStorage persistence** — user settings storage

### Styling
- **[Tailwind CSS 4](https://tailwindcss.com/)** — utility-first CSS framework
- **[tailwind-merge](https://github.com/dcastil/tailwind-merge)** — utility for merging classes
- **[clsx](https://github.com/lukeed/clsx)** — conditional class merging
- **[lucide-react](https://lucide.dev/)** — icon set

### Data Management
- **[idb 8.0.3](https://github.com/jakearchibald/idb)** — IndexedDB wrapper for chat history storage
- **IndexedDB** — local browser database

### Content
- **[react-markdown 10.1.0](https://github.com/remarkjs/react-markdown)** — Markdown rendering
- **[remark-gfm 4.0.1](https://github.com/remarkjs/remark-gfm)** — GitHub Flavored Markdown support

### PWA
- **[@ducanh2912/next-pwa 10.2.9](https://github.com/DuCanhGH/next-pwa)** — PWA support for Next.js

### Development
- **[ESLint 9](https://eslint.org/)** — linter for JavaScript/TypeScript
- **[eslint-config-next](https://nextjs.org/docs/app/building-your-application/configuring/eslint)** — ESLint configuration for Next.js

## 📁 Project Structure

```
ai-tutor/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Main page
│   └── globals.css        # Global styles
├── components/             # React components
│   ├── ChatMessage.tsx    # Chat message component
│   ├── ControlBar.tsx     # Control panel
│   ├── SettingsDialog.tsx # Settings dialog
│   ├── CustomInstructionsDialog.tsx # Custom instructions
│   └── Sidebar.tsx        # Sidebar with history
├── hooks/                  # Custom React hooks
│   ├── useGemini.ts       # Hook for Gemini API
│   └── useMicrophone.ts   # Hook for microphone
├── lib/                    # Utilities and libraries
│   ├── audioPlayer.ts     # Audio playback
│   ├── db.ts              # IndexedDB operations
│   ├── prompts.ts         # Prompts for various profiles
│   └── utils.ts           # Helper functions
├── store/                  # State management
│   └── settings.ts         # Zustand store for settings
├── types/                  # TypeScript types
│   └── audio.d.ts         # Audio API types
└── public/                 # Static files
    └── manifest.json       # PWA manifest
```

## 🎯 Key Features

### Voice Interaction
- Real-time audio recording from microphone
- Sending audio in PCM format (16kHz) to Gemini API
- Playing audio responses from AI
- Support for multiple languages (en-US, de-DE, es-ES, fr-FR, ru-RU)

### Learning Profiles
- **Interview Tutor** — technical interview preparation
- **English Tutor** — English language learning
- **German Tutor** — German language learning
- **Conversation** — various free conversation styles

### Chat History
- Automatic saving of all conversations
- Loading previous sessions
- Deleting old chats
- History search

### Settings
- Gemini API key
- Learning profile selection
- Interface and voice language selection
- Google Search enable/disable
- Custom instructions for AI

## 🔧 Scripts

```bash
# Run in development mode
npm run dev

# Build for production
npm run build

# Run production version
npm start

# Run linter
npm run lint
```

## 📝 License

Private project

## 🤝 Contributing

The project is under active development. Suggestions and bug reports are welcome!

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Google Gemini API](https://ai.google.dev/)
- [React Documentation](https://react.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
