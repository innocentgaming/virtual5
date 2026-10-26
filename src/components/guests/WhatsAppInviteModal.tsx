import React, { useState } from 'react';
import {
  Copy,
  Check,
  Sparkles,
  MessageCircle,
} from 'lucide-react';
import type { EventPlan } from '../../types/event';
import { Modal, Button, Badge } from '../ui';
import { generateWhatsAppInvite, type InviteStyle } from '../../services/shareExportService';

interface WhatsAppInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: EventPlan;
}

export const WhatsAppInviteModal: React.FC<WhatsAppInviteModalProps> = ({
  isOpen,
  onClose,
  plan,
}) => {
  const [style, setStyle] = useState<InviteStyle>('royal');
  const [copied, setCopied] = useState(false);

  const inviteText = generateWhatsAppInvite(plan, style);

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(inviteText);
      } else {
        // Fallback for non-secure contexts
        const textarea = document.createElement('textarea');
        textarea.value = inviteText;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.error('Failed to copy', e);
    }
  };

  const handleOpenWhatsApp = () => {
    const encoded = encodeURIComponent(inviteText);
    const url = `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="WhatsApp & Digital Invitation Broadcast"
      subtitle="Generate beautifully formatted invitation messages with Muhurat ceremony timings, venue location, and dietary RSVP options."
      size="lg"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {/* Style Selection Pills */}
        <div>
          <label className="form-label" style={{ marginBottom: 'var(--space-2)' }}>
            <span>Select Invitation Tone & Format:</span>
          </label>
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            <button
              type="button"
              className={`chip ${style === 'royal' ? 'chip-active' : ''}`}
              onClick={() => setStyle('royal')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
            >
              <span>🕉️</span>
              <span>Royal Traditional (Vedic)</span>
            </button>
            <button
              type="button"
              className={`chip ${style === 'modern' ? 'chip-active' : ''}`}
              onClick={() => setStyle('modern')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
            >
              <span>🎉</span>
              <span>Modern Celebration (Party)</span>
            </button>
            <button
              type="button"
              className={`chip ${style === 'reminder' ? 'chip-active' : ''}`}
              onClick={() => setStyle('reminder')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
            >
              <span>🔔</span>
              <span>Gentle RSVP Reminder</span>
            </button>
          </div>
        </div>

        {/* WhatsApp Preview Bubble */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              WhatsApp Message Preview
            </span>
            <Badge variant="success" dot>
              Ready to Send
            </Badge>
          </div>

          <div
            style={{
              background: 'var(--surface-subtle)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-4)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* WhatsApp Chat Simulated Bubble */}
            <div
              style={{
                background: 'var(--surface-raised)',
                border: '1px solid var(--border)',
                borderLeft: '4px solid #25d366',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-4)',
                boxShadow: 'var(--shadow-sm)',
                whiteSpace: 'pre-wrap',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                fontSize: '0.875rem',
                lineHeight: 1.6,
                color: 'var(--text)',
                maxHeight: '320px',
                overflowY: 'auto',
              }}
            >
              {inviteText}
            </div>
          </div>
        </div>

        {/* Cultural Safeguard Note */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            padding: 'var(--space-2) var(--space-3)',
            background: 'rgba(37, 211, 102, 0.08)',
            border: '1px solid rgba(37, 211, 102, 0.25)',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--text-xs)',
            color: 'var(--text)',
          }}
        >
          <Sparkles size={16} color="#25d366" style={{ flexShrink: 0 }} />
          <span>
            Includes tailored Indian dietary reassurance (Jain/Pure Veg segregation) and ceremony Muhurats from your active plan.
          </span>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
          <Button variant="ghost" size="md" onClick={onClose}>
            Close
          </Button>

          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <Button
              variant="outline"
              size="md"
              onClick={handleCopy}
              leadingIcon={copied ? <Check size={16} color="var(--color-success)" /> : <Copy size={16} />}
            >
              {copied ? 'Copied to Clipboard! ✓' : 'Copy Message Text'}
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleOpenWhatsApp}
              leadingIcon={<MessageCircle size={16} />}
              style={{ background: '#25d366', borderColor: '#25d366', color: '#fff' }}
            >
              Open in WhatsApp
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
