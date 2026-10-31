function getFormattedTime(): string {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
let messageIdCounter = 0;
function generateMessageId(prefix: string): string {
  messageIdCounter += 1;
  return prefix + '-' + Date.now() + '-' + messageIdCounter;
}
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
  BookmarkPlus,
  BookmarkCheck,
} from 'lucide-react';
import type { EventPlan, TradeOffOption, TaskCategory } from '../../types/event';
import type { NavigationTab } from '../../hooks/useEventPlan';
import { INITIAL_EVENTS } from '../../data/sampleEvents';
import {
  generateCopilotAnswer,
  generateCopilotAnswerAsync,
  extractCopilotActions,
} from '../../services/copilotService';
import { Button, Badge, useToast } from '../ui';

interface AICopilotDrawerProps {
  plan?: EventPlan | null;
  isOpen: boolean;
  onClose: () => void;
  onApplyTradeOff?: (tradeOff: TradeOffOption, note?: string) => void;
  activeTab?: NavigationTab;
  onPinTask?: (task: { title: string; category?: TaskCategory; notes?: string }) => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  isFallback?: boolean;
  proposedActions?: TradeOffOption[];
}

function getContextSuggestions(tab?: NavigationTab, eventType?: string): string[] {
  if (tab === 'budget') {
    return [
      'How to cut ₹50K from catering budget?',
      'Suggest 3 budget tradeoffs for flowers & decor',
      'How to negotiate with Indian banquet venues?',
      'Check contingency reserve allocation',
    ];
  }
  if (tab === 'schedule') {
    return [
      '10 PM curfew rules & sound permits',
      'Ideal buffer between Baraat and Pheras',
      'Day-of coordinator call sheet checklist',
      'What to do if Baraat arrives 45 mins late?',
    ];
  }
  if (tab === 'guests') {
    return [
      'Jain & Pure Veg separate kitchen tips',
      'How to handle unexpected +1 guests?',
      'Seating etiquette for extended families',
      'RSVP WhatsApp reminder templates',
    ];
  }
  if (tab === 'vendors') {
    return [
      'Mehendi artist interview questions',
      'Pandit ji puja samagri checklist',
      'Essential contract clauses for dhol & brass bands',
      'Photography shot-list for Vedic rituals',
    ];
  }

  // Default / dashboard by celebration type
  if (eventType === 'wedding') {
    return [
      '10 PM curfew rules & sound permits',
      'Mehendi artist interview questions',
      'How to cut ₹50K from catering budget?',
      'Jain & Pure Veg separate kitchen tips',
    ];
  }
  if (eventType === 'birthday') {
    return [
      'Bollywood rooftop DJ playlist & noise limits',
      'Mumbai street chaat live counter ideas',
      'How to keep 30th birthday under ₹3.5 Lakhs',
      'Custom cutout photobooth vendor questions',
    ];
  }
  return [
    'Eco-friendly zero-plastic mela logistics',
    'Garba & Dandiya crowd management guidelines',
    'Municipal permissions for community celebrations',
    'Mahaprasad volume estimation for 600 attendees',
  ];
}

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
  plan: propPlan,
  isOpen,
  onClose,
  onApplyTradeOff,
  activeTab,
  onPinTask,
}) => {
  const plan = propPlan || INITIAL_EVENTS[0];
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
      timestamp: getFormattedTime(),
    },
  ]);

  const [inputVal, setInputVal] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
  const [lastUserPrompt, setLastUserPrompt] = useState<string>('');
  const [isAiOnline, setIsAiOnline] = useState<boolean>(true);
  const [appliedActionIds, setAppliedActionIds] = useState<Set<string>>(new Set());

  const contextSuggestions = useMemo(
    () => getContextSuggestions(activeTab, plan.eventType),
    [activeTab, plan.eventType]
  );

  // Focus restoration & initial focus with scroll lock
  useEffect(() => {
    if (!isOpen) return;

    previouslyFocusedElementRef.current = document.activeElement as HTMLElement | null;

    // Lock body scroll without layout shift
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    document.body.style.overflow = 'hidden';

    // Focus textarea
    const timeoutId = setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
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

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
      if (previouslyFocusedElementRef.current && typeof previouslyFocusedElementRef.current.focus === 'function') {
        previouslyFocusedElementRef.current.focus();
      }
    };
  }, [isOpen, onClose]);

  // Smart auto-scroll
  useEffect(() => {
    if (isOpen && typeof messagesEndRef.current?.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isThinking, isOpen]);

  const streamAssistantText = (msgId: string, fullText: string, actions?: TradeOffOption[], isFallback?: boolean) => {
    const prefersReduced = typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
    const isTest =
      (globalThis as unknown as { process?: { env?: { NODE_ENV?: string } } }).process?.env?.NODE_ENV === 'test' ||
      typeof (window as unknown as { __vitest__?: unknown }).__vitest__ !== 'undefined';

    if (prefersReduced || isTest || fullText.length < 50) {
      setMessages((prev) => [
        ...prev,
        {
          id: msgId,
          sender: 'assistant',
          text: fullText,
          timestamp: getFormattedTime(),
          isFallback,
          proposedActions: actions,
        },
      ]);
      return;
    }

    let cursor = 0;
    const stepSize = Math.max(4, Math.floor(fullText.length / 28));
    const initMsg: ChatMessage = {
      id: msgId,
      sender: 'assistant',
      text: '',
      timestamp: getFormattedTime(),
      isFallback,
      proposedActions: undefined,
    };

    setMessages((prev) => [...prev, initMsg]);

    const timer = setInterval(() => {
      cursor += stepSize;
      if (cursor >= fullText.length) {
        clearInterval(timer);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId ? { ...m, text: fullText, proposedActions: actions } : m
          )
        );
      } else {
        const slice = fullText.slice(0, cursor);
        setMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, text: slice } : m))
        );
      }
    }, 18);
  };

  const handleSendPrompt = useCallback(async (promptText: string) => {
    if (!promptText.trim() || isThinking) return;

    const trimmedPrompt = promptText.trim();
    setLastUserPrompt(trimmedPrompt);

    const userMsg: ChatMessage = {
      id: generateMessageId('usr'),
      sender: 'user',
      text: trimmedPrompt,
      timestamp: getFormattedTime(),
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
      const { cleanText, actions } = extractCopilotActions(answerText, plan);
      setIsAiOnline(true);
      streamAssistantText(generateMessageId('ast'), cleanText, actions, false);
    } catch {
      setIsAiOnline(false);
      const fallbackText = generateCopilotAnswer(trimmedPrompt, plan);
      const { cleanText, actions } = extractCopilotActions(fallbackText, plan);
      streamAssistantText(generateMessageId('ast'), cleanText, actions, true);
    } finally {
      setIsThinking(false);
    }
  }, [isThinking, plan]);

  const lastSuggestionClickRef = useRef(0);
  const handleSuggestionClick = useCallback((chip: string) => {
    const now = Date.now();
    if (now - lastSuggestionClickRef.current < 400 || isThinking) return;
    lastSuggestionClickRef.current = now;
    handleSendPrompt(chip);
  }, [isThinking, handleSendPrompt]);

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
        timestamp: getFormattedTime(),
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
      }}
    >
      <button
        type="button"
        aria-label="Close assistant overlay"
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          border: 'none',
          backgroundColor: 'rgba(15, 23, 42, 0.55)',
          backdropFilter: 'blur(4px)',
          animation: 'fadeIn 0.2s ease',
          cursor: 'default',
        }}
      />
      <div
        ref={drawerRef}
        id="tour-copilot-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="copilot-drawer-title"
        className="copilot-drawer-container"
        style={{
          position: 'relative',
          zIndex: 1,
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

                {/* Grounded Action Proposals */}
                {m.proposedActions && m.proposedActions.length > 0 && (
                  <div
                    style={{
                      marginTop: 'var(--space-3)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 'var(--space-2)',
                      padding: 'var(--space-2)',
                      background: 'var(--bg-card, #ffffff)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      ⚡ Grounded Action Proposal
                    </div>
                    {m.proposedActions.map((action) => {
                      const isApplied = appliedActionIds.has(action.id);
                      return (
                        <div
                          key={action.id}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                            padding: 'var(--space-2)',
                            background: 'var(--surface-subtle)',
                            borderRadius: 'var(--radius-sm)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                            <span style={{ fontWeight: 700, fontSize: 'var(--text-xs)', color: 'var(--text)' }}>
                              {action.label}
                            </span>
                            <Badge variant="info" size="sm">
                              {action.impactFormatted}
                            </Badge>
                          </div>
                          <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)' }}>
                            {action.description}
                          </p>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                            <Button
                              variant={isApplied ? 'secondary' : 'primary'}
                              size="sm"
                              disabled={isApplied}
                              onClick={() => {
                                if (onApplyTradeOff) {
                                  onApplyTradeOff(action, `Copilot Action: ${action.label}`);
                                  setAppliedActionIds((prev) => new Set(prev).add(action.id));
                                  toast.showToast(`Applied change: ${action.label}`, 'success');
                                }
                              }}
                              leadingIcon={isApplied ? <Check size={12} /> : <Sparkles size={12} />}
                            >
                              {isApplied ? 'Applied' : 'Apply this change'}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Copy button, Pin to Plan, and Engine badge on assistant messages */}
                {m.sender === 'assistant' && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-2)', marginTop: 'var(--space-2)', paddingTop: 'var(--space-2)', borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Badge variant={m.isFallback ? 'warning' : 'success'} size="sm">
                        {m.isFallback ? 'Offline Rule Engine' : 'Gemini 2.5 AI'}
                      </Badge>
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
                          <RotateCcw size={11} /> Retry AI
                        </button>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {onPinTask && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const firstLine = m.text.split('\n')[0].replace(/\*\*/g, '').replace(/[#\n-]/g, ' ').trim();
                            const summary = firstLine.slice(0, 60);
                            onPinTask({
                              title: `Action: ${summary}${firstLine.length > 60 ? '...' : ''}`,
                              category: 'final',
                              notes: m.text,
                            });
                            setPinnedIds((prev) => new Set(prev).add(m.id));
                            toast.showToast('Pinned to plan tasks!', 'success');
                          }}
                          style={{ padding: '2px 6px', fontSize: '11px' }}
                          title="Pin recommendation to event plan tasks"
                          aria-label="Pin recommendation as task"
                          leadingIcon={pinnedIds.has(m.id) ? <BookmarkCheck size={12} color="var(--color-success)" /> : <BookmarkPlus size={12} />}
                        >
                          {pinnedIds.has(m.id) ? 'Pinned' : 'Pin to plan'}
                        </Button>
                      )}
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
              {contextSuggestions.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSuggestionClick(chip)}
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
