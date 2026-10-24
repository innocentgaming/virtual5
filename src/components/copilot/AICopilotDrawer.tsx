import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  X,
  Send,
  Bot,
  User,
  Lightbulb,
  Copy,
  RotateCcw,
  Trash2,
  Check,
} from 'lucide-react';
import type { EventPlan } from '../../types/event';
import {
  generateCopilotAnswer,
  generateCopilotAnswerAsync,
} from '../../services/copilotService';
import { Button, Badge, useToast } from '../ui';

interface AICopilotDrawerProps {
  plan: EventPlan;
  isOpen: boolean;
  onClose: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  isFallback?: boolean;
}

const CONTEXT_SUGGESTIONS = [
  '10 PM curfew rules & sound permits',
  'Mehendi artist interview questions',
  'How to cut ₹50K from catering budget?',
  'Jain & Pure Veg separate kitchen tips',
];

function renderMarkdownLight(content: string): React.ReactNode {
  const lines = content.split('\n');
  return lines.map((line, idx) => {
    const trimmed = line.trim();
    const isBullet = trimmed.startsWith('- ') || trimmed.startsWith('* ');
    const textToFormat = isBullet ? trimmed.slice(2) : line;

    // Bold **text** and inline code `code`
    const parts = textToFormat.split(/(\*\*.*?\*\*|`.*?`)/g);
    const formattedParts = parts.map((part, pIdx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={pIdx}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code
            key={pIdx}
            style={{
              background: 'var(--surface-subtle)',
              padding: '2px 6px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85em',
            }}
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });

    if (isBullet) {
      return (
        <li key={idx} style={{ marginLeft: '1.25rem', marginBottom: '4px' }}>
          {formattedParts}
        </li>
      );
    }

    return (
      <p key={idx} style={{ margin: '0 0 6px 0', minHeight: line.trim() ? undefined : '0.5em' }}>
        {formattedParts}
      </p>
    );
  });
}

export const AICopilotDrawer: React.FC<AICopilotDrawerProps> = ({
  plan,
  isOpen,
  onClose,
}) => {
  const toast = useToast();
  const drawerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'msg-welcome',
      sender: 'assistant',
      text: `Namaste! I'm your EventWise Copilot. I'm actively analyzing **${plan.title}** (${plan.guestCount} guests in ${plan.city}). What can I help you optimize or plan today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [inputVal, setInputVal] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [lastUserPrompt, setLastUserPrompt] = useState<string>('');
  const [isAiOnline, setIsAiOnline] = useState<boolean>(true);

  // Focus restoration & initial focus
  useEffect(() => {
    if (isOpen) {
      previouslyFocusedElementRef.current = document.activeElement as HTMLElement;
      // Focus textarea or close button
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
    } else {
      previouslyFocusedElementRef.current?.focus();
    }
  }, [isOpen]);

  // Trap focus and Esc
  const handleKeyDownDrawer = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
      return;
    }

    if (e.key === 'Tab') {
      const focusable = drawerRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable || focusable.length === 0) return;

      const firstElement = focusable[0];
      const lastElement = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    }
  };

  // Smart auto-scroll
  useEffect(() => {
    if (isOpen && typeof messagesEndRef.current?.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isThinking, isOpen]);

  const handleSendPrompt = async (promptText: string) => {
    if (!promptText.trim() || isThinking) return;

    const trimmedPrompt = promptText.trim();
    setLastUserPrompt(trimmedPrompt);

    const userMsg: ChatMessage = {
      id: 'usr-' + Date.now(),
      sender: 'user',
      text: trimmedPrompt,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputVal('');
    setShowSuggestions(false);
    setIsThinking(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      const answerText = await generateCopilotAnswerAsync(trimmedPrompt, plan);
      setIsAiOnline(true);
      const assistantMsg: ChatMessage = {
        id: 'ast-' + Date.now(),
        sender: 'assistant',
        text: answerText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isFallback: false,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setIsAiOnline(false);
      const fallbackText = generateCopilotAnswer(trimmedPrompt, plan);
      const assistantMsg: ChatMessage = {
        id: 'ast-' + Date.now(),
        sender: 'assistant',
        text: fallbackText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isFallback: true,
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

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendPrompt(inputVal);
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputVal(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  const handleCopy = (msgId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(msgId);
    toast.showToast('Copied to clipboard!', 'info');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: 'msg-welcome',
        sender: 'assistant',
        text: `Namaste! I'm your EventWise Copilot. I'm actively analyzing **${plan.title}** (${plan.guestCount} guests in ${plan.city}). What can I help you optimize or plan today?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setShowClearConfirm(false);
    setShowSuggestions(true);
    toast.showToast('Conversation cleared.', 'info');
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 'var(--z-modal)',
        display: 'flex',
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(4px)',
        animation: 'fadeIn 0.2s ease',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="copilot-drawer-title"
      onKeyDown={handleKeyDownDrawer}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={drawerRef}
        className="copilot-drawer-container"
        style={{
          width: '100%',
          maxWidth: '520px',
          height: '100%',
          backgroundColor: 'var(--surface-raised)',
          boxShadow: 'var(--shadow-xl)',
          display: 'flex',
          flexDirection: 'column',
          borderLeft: '1px solid var(--border)',
          animation: 'modalScale 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* =====================================================================
            1. DRAWER HEADER
            ===================================================================== */}
        <div
          style={{
            padding: 'var(--space-4) var(--space-5)',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: 'var(--surface)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
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
              }}
            >
              <Bot size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <h3 id="copilot-drawer-title" style={{ fontSize: 'var(--text-base)', fontWeight: 800, color: 'var(--text)', margin: 0 }}>
                  EventWise Copilot
                </h3>
                {/* Status Pill with Tooltip */}
                <Badge
                  variant={isAiOnline ? 'success' : 'warning'}
                  title={
                    isAiOnline
                      ? 'AI Online: Fast generative answers powered by Gemini.'
                      : 'Offline Planner: Deterministic rule engine active. 100% offline-ready.'
                  }
                >
                  <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: isAiOnline ? '#10b981' : '#f59e0b', marginRight: '4px' }} />
                  {isAiOnline ? 'AI Online' : 'Offline Planner'}
                </Badge>
              </div>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                Context: {plan.title.slice(0, 32)}...
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            {/* Clear conversation trigger */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowClearConfirm(true)}
              title="Clear conversation"
              aria-label="Clear conversation"
              style={{ padding: '6px' }}
            >
              <Trash2 size={16} />
            </Button>

            {/* Close button */}
            <Button
              id="copilot-close-btn"
              variant="ghost"
              size="sm"
              onClick={onClose}
              aria-label="Close Copilot"
              style={{ padding: '6px' }}
            >
              <X size={18} />
            </Button>
          </div>
        </div>

        {/* Clear Conversation Confirmation Banner */}
        {showClearConfirm && (
          <div
            style={{
              padding: 'var(--space-3) var(--space-4)',
              backgroundColor: 'var(--color-danger-bg)',
              borderBottom: '1px solid var(--color-danger-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 'var(--space-3)',
            }}
          >
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-danger-text)', fontWeight: 600 }}>
              Reset conversation to initial greeting?
            </span>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <Button variant="secondary" size="sm" onClick={() => setShowClearConfirm(false)} style={{ padding: '2px 8px' }}>
                Cancel
              </Button>
              <Button variant="danger" size="sm" onClick={handleClearChat} style={{ padding: '2px 8px' }}>
                Clear Chat
              </Button>
            </div>
          </div>
        )}

        {/* =====================================================================
            2. MESSAGE THREAD (aria-live="polite")
            ===================================================================== */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 'var(--space-4)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-4)',
          }}
          aria-live="polite"
          aria-label="Chat messages thread"
        >
          {messages.map((m) => (
            <div
              key={m.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: m.sender === 'user' ? 'flex-end' : 'flex-start',
                gap: '4px',
              }}
            >
              {/* Header Label & Timestamp */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--text-muted)',
                  fontWeight: 600,
                  padding: '0 4px',
                }}
              >
                {m.sender === 'assistant' ? <Bot size={13} color="var(--accent-primary)" /> : <User size={13} />}
                <span>{m.sender === 'assistant' ? 'EventWise Copilot' : 'You'}</span>
                <span>·</span>
                <time dateTime={m.timestamp}>{m.timestamp}</time>
              </div>

              {/* Message Bubble */}
              <div
                style={{
                  maxWidth: '88%',
                  padding: 'var(--space-3) var(--space-4)',
                  borderRadius: 'var(--radius-lg)',
                  borderBottomRightRadius: m.sender === 'user' ? '2px' : 'var(--radius-lg)',
                  borderBottomLeftRadius: m.sender === 'assistant' ? '2px' : 'var(--radius-lg)',
                  backgroundColor: m.sender === 'user' ? 'var(--accent-primary)' : 'var(--surface-subtle)',
                  color: m.sender === 'user' ? '#ffffff' : 'var(--text)',
                  fontSize: 'var(--text-sm)',
                  lineHeight: '1.55',
                  boxShadow: 'var(--shadow-xs)',
                  border: m.sender === 'assistant' ? '1px solid var(--border)' : 'none',
                  position: 'relative',
                  wordBreak: 'break-word',
                }}
              >
                {renderMarkdownLight(m.text)}

                {/* Copy button & Fallback banner on assistant messages */}
                {m.sender === 'assistant' && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-2)', marginTop: 'var(--space-2)', paddingTop: 'var(--space-2)', borderTop: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      {m.isFallback && (
                        <span style={{ fontSize: '11px', color: 'var(--color-warning-text)' }}>
                          Offline rule engine used
                        </span>
                      )}
                      {m.isFallback && lastUserPrompt && (
                        <button
                          type="button"
                          onClick={() => handleSendPrompt(lastUserPrompt)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: 'none',
                            border: 'none',
                            color: 'var(--accent-primary)',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            padding: 0,
                          }}
                          aria-label="Retry prompt with AI"
                        >
                          <RotateCcw size={11} /> Retry
                        </button>
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(m.id, m.text)}
                      style={{ padding: '2px 6px', fontSize: '11px' }}
                      title="Copy response"
                      aria-label="Copy assistant response"
                      leadingIcon={copiedId === m.id ? <Check size={12} color="var(--color-success)" /> : <Copy size={12} />}
                    >
                      {copiedId === m.id ? 'Copied' : 'Copy'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {isThinking && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                padding: 'var(--space-3) var(--space-4)',
                borderRadius: 'var(--radius-lg)',
                backgroundColor: 'var(--surface-subtle)',
                color: 'var(--text-muted)',
                fontSize: 'var(--text-xs)',
                width: 'fit-content',
                border: '1px solid var(--border)',
              }}
              role="status"
              aria-label="Copilot is generating an answer"
            >
              <Sparkles size={14} color="var(--accent-primary)" className="spin" />
              <span>Analyzing celebration details with Gemini...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* =====================================================================
            3. CONTEXT-AWARE SUGGESTION CHIPS (Can toggle on/off)
            ===================================================================== */}
        <div
          style={{
            padding: 'var(--space-2) var(--space-4)',
            backgroundColor: 'var(--surface-subtle)',
            borderTop: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showSuggestions ? '6px' : 0 }}>
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Lightbulb size={13} color="var(--color-warning)" /> Context Queries
            </span>
            <button
              type="button"
              onClick={() => setShowSuggestions((prev) => !prev)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--accent-primary)',
                fontSize: 'var(--text-xs)',
                cursor: 'pointer',
                fontWeight: 600,
                padding: '2px 4px',
              }}
              aria-label={showSuggestions ? 'Hide suggestions' : 'Show suggestions'}
            >
              {showSuggestions ? 'Hide' : 'Show suggestions'}
            </button>
          </div>

          {showSuggestions && (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {CONTEXT_SUGGESTIONS.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendPrompt(chip)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-pill)',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--surface-raised)',
                    color: 'var(--text)',
                    fontSize: 'var(--text-xs)',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent-primary)';
                    e.currentTarget.style.backgroundColor = 'var(--surface)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.backgroundColor = 'var(--surface-raised)';
                  }}
                >
                  {chip}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* =====================================================================
            4. AUTO-GROWING TEXTAREA & SEND FORM
            ===================================================================== */}
        <form
          onSubmit={handleFormSubmit}
          style={{
            padding: 'var(--space-3) var(--space-4)',
            borderTop: '1px solid var(--border)',
            backgroundColor: 'var(--surface)',
            display: 'flex',
            gap: 'var(--space-2)',
            alignItems: 'flex-end',
            flexShrink: 0,
          }}
        >
          <textarea
            ref={textareaRef}
            rows={1}
            className="form-control"
            placeholder="Ask Copilot (Enter to send, Shift+Enter for newline)..."
            value={inputVal}
            onChange={handleTextareaChange}
            onKeyDown={handleTextareaKeyDown}
            style={{
              fontSize: 'var(--text-sm)',
              resize: 'none',
              minHeight: '44px',
              maxHeight: '120px',
              padding: '10px 14px',
              lineHeight: 1.4,
              flex: 1,
            }}
            aria-label="Type your message to Copilot"
          />
          <Button
            type="submit"
            variant="primary"
            style={{ height: '44px', padding: '0 16px', flexShrink: 0 }}
            aria-label="Send prompt"
            disabled={!inputVal.trim() || isThinking}
            leadingIcon={<Send size={15} />}
          >
            Send
          </Button>
        </form>
      </div>
    </div>
  );
};
