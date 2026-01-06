/**
 * \file FloatingNavBar.tsx
 * \brief Floating navigation bar for project info, deep-dive content, and GitHub access.
 *
 * Provides a responsive navigation UI with desktop and mobile layouts,
 * contextual tutorial integration, and modal-based informational panels.
 */

'use client';
import { useEffect, useState } from 'react';
import { Menu, X, Github, Info, Brain } from 'lucide-react';
import { useUARTStore } from './protocol-visualizer/protocols/uart/useUARTLogic';

const GITHUB_URL = 'https://github.com/Dhanush-777x/protoviz-3d.git';

/**
 * \brief Represents a single question–answer entry.
 */
interface QnAItem {
  question: string;
  answer: string;
}

/**
 * \brief Represents a Q&A dataset loaded from external JSON.
 *
 * Used for protocol-specific deep-dive explanations.
 */
interface QnAData {
  title: string;
  items: QnAItem[];
}

/**
 * \brief Floating navigation bar component.
 *
 * Responsibilities:
 * - Provides quick access to project info and GitHub
 * - Displays protocol-specific deep-dive Q&A content
 * - Integrates with tutorial state to guide users
 * - Adapts layout for desktop and mobile devices
 *
 * \return JSX element containing navigation UI and modals.
 */
export default function FloatingNavBar() {
  const [open, setOpen] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showQnA, setShowQnA] = useState(false);
  const [qnaData, setQnaData] = useState<QnAData | null>(null);

  /**
   * \brief Current tutorial step from UART store.
   *
   * Used to visually highlight the Deep Dive action
   * when the tutorial reaches the conceptual explanation stage.
   */
  const tutorialStep = useUARTStore((state) => state.tutorialStep);

  /**
   * \brief Loads protocol-specific Q&A content.
   *
   * Fetches structured deep-dive explanations from a JSON file
   * and stores them for modal rendering.
   */
  useEffect(() => {
    fetch('/qna/uart.json')
      .then((res) => res.json())
      .then((data) => setQnaData(data))
      .catch((err) => console.error('Failed to load Q&A', err));
  }, []);

  return (
    <>
      {/* ================= Desktop ================= */}
      <div className="hidden lg:flex fixed right-4 top-1/2 -translate-y-1/2 z-[1500] flex-col gap-4">
        <button
          onClick={() => setShowAbout(true)}
          className="p-3 rounded-xl bg-bg-panel border border-primary-border hover:scale-105 transition-all backdrop-blur-md shadow-glow-glass-primary hover:shadow-glow-glass-primary-hover"
        >
          <Info className="w-5 h-5 text-text-main" />
        </button>
        <div className="relative z-[1300]">
          <button
            onClick={() => setShowQnA(true)}
            className={`p-3 rounded-xl bg-bg-panel border border-primary-border
              hover:scale-105 transition-all backdrop-blur-md shadow-glow-glass-primary hover:shadow-glow-glass-primary-hover
              ${tutorialStep === 'deep-dive' ? 'animate-tutorial-pulse' : ''}`}
          >
            <Brain className="w-5 h-5 text-text-main" />
          </button>
        </div>

        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="p-3 rounded-xl bg-bg-panel border border-primary-border hover:scale-105 transition-all backdrop-blur-md shadow-glow-glass-primary hover:shadow-glow-glass-primary-hover"
        >
          <Github className="w-5 h-5 text-text-main" />
        </a>
      </div>

      {/* ================= Mobile / Tablet ================= */}
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden fixed top-4 right-4 z-[1500] p-3 rounded-xl bg-bg-panel border border-primary-border"
      >
        <Menu className="w-5 h-5 text-text-main" />
      </button>

      {open && (
        <div className="lg:hidden fixed inset-0 z-[1600] bg-black/50 backdrop-blur-sm">
          <div className="absolute top-0 right-0 w-64 h-full bg-bg-panel border-l border-primary-border p-4">
            <div className="flex justify-between items-center mb-4">
              {/* Gradient overlay */}
              <div
                className="absolute inset-0 rounded-2xl pointer-events-none"
                style={{
                  background:
                    'linear-gradient(180deg, rgba(147, 112, 173, 0.1) 0%, transparent 50%, rgba(166, 174, 204, 0.05) 100%)',
                }}
              />

              <h3 className="font-bold text-text-main">Menu</h3>
              <button onClick={() => setOpen(false)}>
                <X className="w-5 h-5 text-text-main" />
              </button>
            </div>

            <button
              onClick={() => {
                setShowAbout(true);
                setOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded hover:bg-primary-dim backdrop-blur-md bg-white/5"
            >
              <Info className="w-4 h-4" />
              About Project
            </button>

            <button
              onClick={() => {
                setShowQnA(true);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded hover:bg-primary-dim mt-2
              ${tutorialStep === 'deep-dive' ? 'animate-tutorial-pulse' : ''}`}
            >
              <Brain className="w-4 h-4 text-text-main" />
              Deep Dive
            </button>

            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center gap-2 px-3 py-2 rounded hover:bg-primary-dim mt-2"
            >
              <Github className="w-4 h-4" />
              GitHub
            </a>
          </div>
        </div>
      )}

      {/* ================= About Modal ================= */}
      {showAbout && (
        <div className="fixed inset-0 z-[1700] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div
            className="w-[92%] max-w-lg lg:max-w-xl rounded-2xl bg-bg-panel/80 border border-primary-border p-6 animate-modal-in"
            style={{
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              border: '1px solid rgba(166, 174, 204, 0.2)',
              borderRadius: '12px',
              boxShadow: `
            0 -8px 32px rgba(0, 0, 0, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.1),
            inset 0 -1px 0 rgba(255, 255, 255, 0.05)
          `,
            }}
          >
            <div
              className="absolute inset-0 rounded-2xl pointer-events-none"
              style={{
                background:
                  'linear-gradient(180deg, rgba(147, 112, 173, 0.1) 0%, transparent 50%, rgba(166, 174, 204, 0.05) 100%)',
              }}
            />
            <h3 className="text-lg font-bold text-text-main mb-2">
              About This Project
            </h3>

            <p className="text-sm text-text-muted leading-relaxed mb-2">
              Protoviz 3D is an interactive learning tool for students, embedded
              engineers, and electronics enthusiasts. It visually explains how
              communication protocols work at the bit level, including baud
              rates, timing, framing, and real-world error behavior.
            </p>

            <p className="text-sm text-text-muted leading-relaxed mb-2">
              The goal is to make communication protocols intuitive and
              observable, helping you understand what actually happens on the
              wire beyond theory and textbooks.
            </p>

            <p className="text-sm text-text-muted leading-relaxed mb-2">
              Your feedback is highly valuable. If you have ideas, suggestions,
              or find issues, feel free to share them on the project’s GitHub
              Discussions or Issues page.
            </p>

            <p className="text-sm text-text-muted leading-relaxed mb-2">
              If you’d like to support future development such as new protocols,
              deeper simulations, or enhanced tutorials. Any contribution is
              greatly appreciated.
            </p>

            <p className="text-sm text-text-muted leading-relaxed mb-2">
              I hope this tool helps you learn and experiment with confidence.
              Enjoy exploring!
            </p>

            <p className="text-xs text-text font-bold mt-3 italic">
              ~ Dhanush S M
            </p>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowAbout(false)}
                className="px-4 py-2 rounded-lg bg-glass-gradient-primary text-text-dark font-semibold shadow-glow-glass-primary hover:shadow-glow-glass-primary-hover transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showQnA && qnaData && (
        <div className="fixed inset-0 z-[1700] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div
            className="w-[92%] max-w-lg lg:max-w-xl rounded-2xl bg-bg-panel/80 border border-primary-border p-6 animate-modal-in"
            style={{
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              border: '1px solid rgba(166, 174, 204, 0.2)',
              borderRadius: '12px',
              boxShadow: `
            0 -8px 32px rgba(0, 0, 0, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.1),
            inset 0 -1px 0 rgba(255, 255, 255, 0.05)
          `,
            }}
          >
            <div
              className="absolute inset-0 rounded-2xl pointer-events-none"
              style={{
                background:
                  'linear-gradient(180deg, rgba(147, 112, 173, 0.1) 0%, transparent 50%, rgba(166, 174, 204, 0.05) 100%)',
              }}
            />
            <h3 className="text-lg font-bold text-text-main mb-4">
              {qnaData.title}
            </h3>

            <div className="space-y-4">
              {qnaData.items.map((item, idx) => (
                <div key={idx}>
                  <p className="text-sm font-semibold text-text-main">
                    {item.question}
                  </p>
                  <p className="text-sm text-text-muted leading-relaxed mt-1">
                    {item.answer}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex justify-end mt-5">
              <button
                onClick={() => setShowQnA(false)}
                className="px-4 py-2 rounded-lg bg-glass-gradient-primary text-text-dark font-semibold shadow-glow-glass-primary hover:shadow-glow-glass-primary-hover transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
