import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  X,
  Send,
  Bot,
  User,
  Lightbulb,
  ShieldCheck,
} from 'lucide-react';
import type { EventPlan } from '../../types/event';
import {
  COPILOT_STARTER_PROMPTS,
  generateCopilotAnswer,
  generateCopilotAnswerAsync,
  type CopilotMessage,
} from '../../services/copilotService';
import { Button } from '../common';

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
      text: `Namaste! I'm your EventWise Copilot. I'm actively analyzing **${plan.title}** (${plan.guestCount} guests in ${plan.city}). What can I help you optimize or plan today?`,
      timestamp: 'Just now',
      suggestions: COPILOT_STARTER_PROMPTS,
    },
  ]);

  const [inputVal, setInputVal] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Esc key listener and focus management
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

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
        text: `${fallbackText}\n\n*(Answered via deterministic rule engine)*`,
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
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(4px)',
        animation: 'fadeIn 0.2s ease',
      }}
      role="dialog"
      aria-modal="true"
      aria-label="EventWise AI Copilot Drawer"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
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
          animation: 'modalScale 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--accent-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                boxShadow: '0 2px 8px var(--accent-glow)',
              }}
            >
              <Bot size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
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
            gap: '1.25rem',
          }}
        >
          {messages.map((m) => (
            <div
              key={m.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: m.sender === 'user' ? 'flex-end' : 'flex-start',
                gap: '0.35rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                  fontWeight: 600,
                }}
              >
                {m.sender === 'assistant' ? <Bot size={13} color="var(--accent-primary)" /> : <User size={13} />}
                <span>{m.sender === 'assistant' ? 'EventWise Copilot' : 'You'}</span>
              </div>

              <div
                style={{
                  maxWidth: '92%',
                  padding: '0.85rem 1.125rem',
                  borderRadius: 'var(--radius-lg)',
                  borderBottomRightRadius: m.sender === 'user' ? '4px' : 'var(--radius-lg)',
                  borderBottomLeftRadius: m.sender === 'assistant' ? '4px' : 'var(--radius-lg)',
                  backgroundColor: m.sender === 'user' ? 'var(--accent-primary)' : 'var(--bg-card-subtle)',
                  color: m.sender === 'user' ? 'white' : 'var(--text-main)',
                  fontSize: '0.875rem',
                  lineHeight: '1.55',
                  whiteSpace: 'pre-line',
                  boxShadow: 'var(--shadow-sm)',
                  border: m.sender === 'assistant' ? '1px solid var(--border-light)' : 'none',
                }}
              >
                {m.text}
              </div>

              {m.suggestions && m.suggestions.length > 0 && (
                <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', width: '100%' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Lightbulb size={13} color="var(--color-warning)" /> Suggested Queries:
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    {m.suggestions.map((s, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSendPrompt(s)}
                        style={{
                          textAlign: 'left',
                          padding: '8px 12px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-light)',
                          backgroundColor: 'var(--bg-card)',
                          color: 'var(--text-main)',
                          fontSize: '0.8125rem',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = 'var(--accent-primary)';
                          e.currentTarget.style.backgroundColor = 'var(--accent-subtle)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'var(--border-light)';
                          e.currentTarget.style.backgroundColor = 'var(--bg-card)';
                        }}
                      >
                        <span style={{ color: 'var(--accent-primary)' }}>›</span>
                        <span>{s}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          {isThinking && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-card-subtle)',
                color: 'var(--text-muted)',
                fontSize: '0.8125rem',
                width: 'fit-content',
                border: '1px solid var(--border-light)',
              }}
            >
              <Sparkles size={15} color="var(--accent-primary)" className="spin" />
              <span>Copilot is analyzing your plan with Gemini...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Bottom Offline Note */}
        <div style={{ padding: '0.4rem 1rem', backgroundColor: 'var(--bg-card-subtle)', borderTop: '1px solid var(--border-light)', fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <ShieldCheck size={12} color="#059669" />
          <span>Offline Safe: Fallback rule engine activates automatically if Gemini is offline.</span>
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
          <Button
            type="submit"
            variant="primary"
            style={{ padding: '0 1.125rem', flexShrink: 0 }}
            aria-label="Send message"
            disabled={!inputVal.trim() || isThinking}
          >
            <Send size={15} />
          </Button>
        </form>
      </div>
    </div>
  );
};
