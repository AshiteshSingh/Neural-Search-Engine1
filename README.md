# Neural Scholar Engine

**Neural Scholar Engine** is an advanced, AI-powered research and search interface designed to provide deep, accurate, and academically rigorous answers. Built with **Next.js** and powered by **Google's Gemini 3 Pro/Flash**, it goes beyond simple search to offer a specialized research assistant for students and professionals.

## 🚀 About The Project

Neural Scholar Engine bridges the gap between traditional search engines and AI assistants. It offers real-time web access, multi-step reasoning ("Chain of Thought"), and specialized modes for academic subjects.

### Key Features
*   **High Accuracy & Precision**: Delivers trustworthy, fact-based answers by cross-referencing multiple sources, ensuring information is highly accurate and reliable.
*   **Rich Media Integration**: Intelligently searches and curates the most relevant images and videos to visually enhance answers and provide verified context.
*   **Real-time Streaming**: Visualizes the AI's "thinking" process with granular status updates (e.g., "Searching Google...", "Reading sources...").
*   **Academic Modes**: Specialized agents for:
    *   **Physics (ISC Class 11/12)**: Solves numerical problems with strict 5-step CoT methodology.
    *   **Computer Science**: Generates Java code adhering to ISC syllabus standards.
    *   **Accounts/Commerce**: Specialized financial concepts assistance.
*   **Multimodal Search**: contextual understanding of images for solving problems or answering visual queries.
*   **Memory & Context**: Intelligent query rewriting to understand follow-up questions (e.g., "Show me more details about him").

---

## 🛠️ Tech Stack
*   **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
*   **AI Models**: Google Gemini 1.5 Pro & Flash (via Vertex AI / AI Studio)
*   **Styling**: Tailwind CSS, Lucide Icons
*   **Auth**: Auth.js (NextAuth)
*   **Search**: Google Custom Search JSON API, YouTube Data API

---

## 💻 Getting Started

Follow these steps to set up the project locally on your machine.

### Prerequisites
*   Node.js (v18 or higher)
*   npm or bun
*   Git

### 1. Fork and Clone the Repository

If you want to contribute or make your own version, start by forking this repository.

1.  Click the **Fork** button at the top right of this page on GitHub.
2.  Clone your forked repository to your local machine:

```bash
git clone https://github.com/YOUR_USERNAME/Neural-Search-Engine1.git
cd Neural-Search-Engine1
```

### 2. Install Dependencies

```bash
npm install
# or
bun install
```

### 3. Environment Configuration

Create a `.env.local` file in the root directory. You will need API keys from Google Cloud Platform.

```env
# Google Cloud & AI
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_SEARCH_API_KEY=your-search-api-key
Google_Search_CX_ID=your-search-engine-id
YOUTUBE_API_KEY=your-youtube-api-key

# Specialized Search Engines (Optional but recommended for Academic modes)
GOOGLE_SEARCH_CX_ID_ISC_PHYSICS=your-physics-cx-id
GOOGLE_SEARCH_CX_ID_ISC_COMPUTER=your-computer-cx-id
GOOGLE_SEARCH_CX_ID_ISC_ACCOUNTS=your-accounts-cx-id

# Authentication (NextAuth)
AUTH_SECRET=your-random-secret-key
AUTH_GOOGLE_ID=your-google-oauth-client-id
AUTH_GOOGLE_SECRET=your-google-oauth-client-secret
```

### 4. Run Locally

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🤝 How to Contribute

We welcome contributions!

1.  **Fork** the project.
2.  **Create your Feature Branch** (`git checkout -b feature/AmazingFeature`).
3.  **Commit your Changes** (`git commit -m 'Add some AmazingFeature'`).
4.  **Push to the Branch** (`git push origin feature/AmazingFeature`).
5.  **Open a Pull Request**.

## 📄 License

Distributed under the Apache 2.0 License. See `LICENSE` for more information.
