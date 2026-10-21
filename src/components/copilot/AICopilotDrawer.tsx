import React, { useState } from 'react';
import {
  Sparkles,
  X,
  Send,
  Bot,
  User,
  Lightbulb,
} from 'lucide-react';
import type { EventPlan } from '../../types/event';
import {
  COPILOT_STARTER_PROMPTS,
  generateCopilotAnswer,
  generateCopilotAnswerAsync,
  type CopilotMessage,
} from '../../services/copilotService';

interface AICopilotDrawerProps {
  plan: EventPlan;
  isOpen: boolean;
  onClose: () => void;
}

export const AICopilotDrawer: React.FC<AICopilotDrawerProps> = ({
  plan,
  isOpen,
  onClose,
}) => {
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: 'msg-welcome',
      sender: 'assistant',
      text: `Hello! I'm your EventWise Copilot. I'm actively analyzing **${plan.title}** (${plan.guestCount} guests in ${plan.city}). What can I help you optimize or plan today?`,
      timestamp: 'Just now',
      suggestions: COPILOT_STARTER_PROMPTS,
    },
  ]);

  const [inputVal, setInputVal] = useState('');
  const [isThinking, setIsThinking] = useState(false);

  if (!isOpen) return null;

  const handleSendPrompt = async (promptText: string) => {
    if (!promptText.trim() || isThinking) return;

    const userMsg: CopilotMessage = {
      id: 'usr-' + Date.now(),
      sender: 'user',
      text: promptText.trim(),
      timestamp: 'Just now',
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputVal('');
    setIsThinking(true);

    try {
      const answerText = await generateCopilotAnswerAsync(promptText, plan);
      const assistantMsg: CopilotMessage = {
        id: 'ast-' + Date.now(),
        sender: 'assistant',
        text: answerText,
        timestamp: 'Just now',
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      const fallbackText = generateCopilotAnswer(promptText, plan);
      const assistantMsg: CopilotMessage = {
        id: 'ast-' + Date.now(),
        sender: 'assistant',
        text: fallbackText,
        timestamp: 'Just now',
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendPrompt(inputVal);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(3px)',
      }}
      role="dialog"
      aria-modal="true"
      aria-label="EventWise AI Copilot Drawer"
    >
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          height: '100%',
          backgroundColor: 'var(--bg-card)',
          boxShadow: 'var(--shadow-xl)',
          display: 'flex',
          flexDirection: 'column',
          borderLeft: '1px solid var(--border-light)',
          animation: 'slideInRight 0.25s ease-out',
        }}
      >
        {/* Drawer Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border-light)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: 'var(--bg-card-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--accent-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
              }}
            >
              <Sparkles size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                EventWise Copilot
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Active: {plan.title.slice(0, 32)}...
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary btn-sm"
            style={{ borderRadius: '50%', width: '32px', height: '32px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            aria-label="Close Copilot"
          >
            <X size={16} />
          </button>
        </div>

        {/* Message Thread */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          {messages.map((m) => (
            <div
              key={m.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: m.sender === 'user' ? 'flex-end' : 'flex-start',
                gap: '0.25rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                }}
              >
                {m.sender === 'assistant' ? <Bot size={13} color="var(--accent-primary)" /> : <User size={13} />}
                <span>{m.sender === 'assistant' ? 'Copilot' : 'You'}</span>
              </div>

              <div
                style={{
                  maxWidth: '92%',
                  padding: '0.85rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: m.sender === 'user' ? 'var(--accent-primary)' : 'var(--bg-card-subtle)',
                  color: m.sender === 'user' ? 'white' : 'var(--text-main)',
                  fontSize: '0.875rem',
                  lineHeight: '1.5',
                  whiteSpace: 'pre-line',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                {m.text}
              </div>

              {m.suggestions && m.suggestions.length > 0 && (
                <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', width: '100%' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Lightbulb size={12} color="var(--color-warning)" /> Suggested Queries:
                  </span>
                  {m.suggestions.map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendPrompt(s)}
                      style={{
                        textAlign: 'left',
                        padding: '6px 10px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-light)',
                        backgroundColor: 'var(--bg-card)',
                        color: 'var(--text-main)',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {isThinking && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.6rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--bg-card-subtle)',
                color: 'var(--text-muted)',
                fontSize: '0.8125rem',
                width: 'fit-content',
              }}
            >
              <Sparkles size={14} color="var(--brand-primary)" />
              <span>Copilot is analyzing your plan with Gemini...</span>
            </div>
          )}
        </div>

        {/* Input Form Bar */}
        <form
          onSubmit={handleFormSubmit}
          style={{
            padding: '1rem',
            borderTop: '1px solid var(--border-light)',
            backgroundColor: 'var(--bg-card)',
            display: 'flex',
            gap: '0.5rem',
          }}
        >
          <input
            type="text"
            className="form-control"
            placeholder="Ask Copilot about budget, timelines, caterers..."
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            style={{ fontSize: '0.875rem' }}
          />
          <button
            type="submit"
            className="btn btn-primary"
            style={{ padding: '0 1rem', flexShrink: 0 }}
            aria-label="Send message"
          >
            <Send size={15} />
          </button>
        </form>
      </div>
    </div>
  );
};
