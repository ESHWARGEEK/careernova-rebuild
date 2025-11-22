# CareerNova - Your AI Career Co-pilot (Technical Deep Dive)

[![Powered by Gemini](https://img.shields.io/badge/Powered%20by-Gemini%20API-blueviolet.svg)](https://ai.google.dev/)
[![React](https://img.shields.io/badge/React-19-blue.svg?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3-blue.svg?logo=tailwindcss)](https://tailwindcss.com/)

CareerNova is a sophisticated, AI-powered web application designed to serve as a personalized career advisor. It analyzes user resumes to provide in-depth career analysis, suggests tailored career paths, finds live job listings, and prepares users for interviews through a real-time, voice-based coaching experience.

![CareerNova Screenshot](https://storage.googleapis.com/aistudio-public/project-assets/readme_screenshots/ai-career-advisor-screenshot.png)

## 🏛️ Architectural Overview

CareerNova is a client-side single-page application (SPA) built with React and TypeScript. Its architecture prioritizes user privacy and a seamless, interactive experience by performing as much work as possible in the browser. All interactions with the Google Gemini API are centralized in a dedicated service module (`services/geminiService.ts`), which acts as a stateless bridge between the frontend components and the AI models.

### Core Principles

-   **Client-Side First:** Resume parsing and data management for the Job Tracker are handled entirely in the browser using `localStorage`. This ensures user data remains private and reduces server-side dependencies.
-   **Component-Based UI:** The interface is built with modular, reusable React components, promoting maintainability and a consistent user experience. Key components like `Card`, `Modal`, and `RadialProgress` encapsulate specific UI logic.
-   **Centralized API Service:** All Gemini API calls are managed within `geminiService.ts`. This separation of concerns makes the application easier to debug and manage, and it isolates the AI logic from the UI components.
-   **Lean State Management:** The application employs React's native `useState` and `useRef` hooks for state management, which is sufficient for its current complexity and avoids the overhead of larger state management libraries.

## ✨ Features: A Technical Breakdown

### 1. Resume Parsing and Analysis

-   **Client-Side Text Extraction:** Upon file upload, the application uses `pdf.js` for PDF files and `mammoth.js` for DOCX files to extract raw text directly in the browser. This is asynchronous and avoids sending the user's entire file to a server.
-   **Initial AI Analysis:** The extracted text is sent to the Gemini API via the `analyzeResume` function. This function calls the `gemini-2.5-flash` model with a strict `responseSchema` to ensure the API returns a predictable JSON object containing the summary, ATS score, strengths, weaknesses, and suggested roles. This structured approach is crucial for reliably populating the UI.

### 2. Live Mock Interview (Gemini Live API)

This feature provides a real-time, voice-based conversation with an AI interviewer.

-   **Session Management:** The interview is powered by the Gemini Live API. A connection is established using `ai.live.connect`, which returns a session promise (`sessionPromiseRef`). This promise-based approach is critical to prevent race conditions where audio data might be sent before the session is fully established.
-   **Audio Input Pipeline:**
    1.  `navigator.mediaDevices.getUserMedia` captures microphone input.
    2.  The `Web Audio API` (`AudioContext`) processes the audio stream. A `ScriptProcessorNode` is used to get raw audio data in chunks.
    3.  Each chunk (`Float32Array`) is converted to a 16-bit PCM format and Base64 encoded in the `createBlob` helper function.
    4.  The encoded audio chunk is sent to the Gemini API via `session.sendRealtimeInput({ media: pcmBlob })`.
-   **Audio Output Pipeline:**
    1.  The `onmessage` callback receives `LiveServerMessage` events from the API.
    2.  If the message contains audio data (`modelTurn`), the Base64 string is decoded into a `Uint8Array`.
    3.  A custom `decodeAudioData` function converts the raw PCM data into an `AudioBuffer`. **Note:** The browser's native `AudioContext.decodeAudioData` is not used because it expects a full audio file format (like WAV or MP3), not raw PCM data.
    4.  An `AudioBufferSourceNode` is created and scheduled to play, ensuring seamless, gapless playback by tracking the end time of the previous chunk (`nextStartTimeRef`).
-   **Real-Time Transcription:** The session is configured with `inputAudioTranscription: {}` and `outputAudioTranscription: {}`. The `onmessage` callback listens for transcription events and updates the UI in real-time, providing a live transcript of the conversation.

### 3. Agentic Job Search

-   **MCP Framework:** The agent is guided by a "Mission, Capabilities, Plan" (MCP) prompt. The mission is user-defined, and the capabilities are derived from the resume summary. This structured prompt helps the `gemini-2.5-pro` model formulate a coherent plan.
-   **Streaming and Parsing:** The `runJobSearchAgentStream` function uses `generateContentStream` to receive a real-time stream of text from the model. The frontend continuously parses this stream, looking for structured XML tags (`<plan>`, `<log>`, `<jobs>`) that were requested in the prompt. As these tags are populated, the UI updates dynamically to show the agent's thought process and final results.
-   **Grounding with Google Search:** The request is configured with `tools: [{ googleSearch: {} }]`, allowing the model to perform live web searches to find current and relevant job listings, making the results highly actionable.

### 4. Interactive Resume Editor & PDF Generation

-   **Dynamic Feedback:** The editor is a simple `<textarea>`. As the user types, they can trigger `getUpdatedAtsScore`, which makes a quick API call to `gemini-2.5-flash` to recalculate the ATS score.
-   **AI Suggestions:** The `getResumeSuggestions` function sends the current text to the model to get actionable improvement ideas, which are then displayed to the user.
-   **PDF Generation Pipeline:**
    1.  The `structureResumeForPdf` function sends the final resume text to `gemini-2.5-flash` with a schema to parse it into a structured `StructuredResume` JSON object.
    2.  This structured data is passed to a hidden React component (`PrintableResume`) which renders a clean, professional resume layout using standard HTML and CSS.
    3.  `html2canvas` captures an image of the rendered component.
    4.  `jspdf` takes this image and places it into a new PDF document, handling pagination for longer resumes. The final PDF is then offered to the user for download.

## 🛠️ Tech Stack & Key Libraries

-   **Frontend:** [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/)
-   **AI Engine:** [`@google/genai`](https://www.npmjs.com/package/@google/genai)
    -   **`gemini-2.5-flash`:** Used for fast, structured tasks like initial analysis, resume suggestions, and content generation.
    -   **`gemini-2.5-pro`:** Used for complex, multi-step reasoning tasks like the agentic search and career trajectory simulation.
    -   **`gemini-2.5-flash-native-audio-preview-09-2025` (Live API):** Powers the real-time, voice-based mock interview.
-   **Styling:** [Tailwind CSS](https://tailwindcss.com/) (via CDN for simplicity).
-   **Client-Side Document Parsing:**
    -   [**`pdf.js`**](https://mozilla.github.io/pdf.js/): Extracts text content from PDF files.
    -   [**`mammoth.js`**](https://github.com/mwilliamson/mammoth.js): Extracts raw text from DOCX files.
-   **PDF Generation:**
    -   [**`html2canvas`**](https://html2canvas.hertzen.com/): Converts a DOM element into a canvas image.
    -   [**`jspdf`**](https://github.com/parallax/jsPDF): Creates PDF documents from images or text.

## 🚀 Running Locally

This project is a static web application and can be run with any simple static file server.

### Prerequisites

1.  **Node.js and npm**: Required to install a local server. Download from [nodejs.org](https://nodejs.org/).
2.  **Google Gemini API Key**:
    -   Obtain a key from [Google AI Studio](https://aistudio.google.com/app/apikey).
    -   The application is configured to read this key from `process.env.API_KEY`. The execution environment is responsible for making this key available.

### Setup & Execution

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/your-repo-name.git
    cd your-repo-name
    ```

2.  **Install a static server (if you don't have one):**
    We recommend `serve` for its simplicity.
    ```bash
    npm install -g serve
    ```

3.  **Start the server:**
    The hosting environment (like AI Studio) injects the `API_KEY` into the `process.env` object. To run locally where there's no build process, you can create a simple `setup-env.js` file to simulate this.
    
    *Create a file named `setup-env.js` in the root directory:*
    ```javascript
    // In a real build environment, this would be handled by a bundler like Webpack or Vite.
    // For local development with a static server, we can simulate it.
    window.process = {
      env: {
        API_KEY: 'YOUR_API_KEY_HERE' // IMPORTANT: Replace with your actual key
      }
    };
    ```
    *Include this script in `index.html` **before** the main `index.tsx` script:*
    ```html
    <!-- In index.html, inside the <body> tag -->
    <div id="root"></div>
    <script src="/setup-env.js"></script> <!-- Add this line -->
    <script type="module" src="/index.tsx"></script>
    ```

4.  **Run the application:**
    ```bash
    serve .
    ```

5.  **Open in your browser:**
    Navigate to the local address provided by `serve` (usually `http://localhost:3000`).

    > **Security Note:** The `setup-env.js` method is for local development convenience only. Do not commit your API key to version control. For production deployment, use a secure method like environment variables provided by your hosting platform.

## 📁 Project Structure

```
.
├── components/          # Reusable React components for each feature and UI element.
│   ├── AgenticJobSearchPage.tsx  # UI for the AI job search agent.
│   ├── InterviewModal.tsx        # UI and logic for the Gemini Live API mock interview.
│   ├── ResumeEditorPage.tsx      # UI for the text editor and PDF generation.
│   └── ...                  # Other UI components.
├── services/
│   └── geminiService.ts   # Centralized module for all Gemini API interactions.
├── App.tsx              # Main application component, handles page routing and state.
├── index.html           # Main HTML entry point.
├── index.tsx            # React root renderer.
├── metadata.json        # Application metadata (e.g., camera/mic permissions).
├── README.md            # This file.
└── types.ts             # TypeScript type definitions and interfaces.
```