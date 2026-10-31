import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EventWebsiteModal } from '../components/website/EventWebsiteModal';
import { SAMPLE_WEDDING } from '../data/sampleEvents';
import { AuthProvider } from '../context/AuthContext';

describe('EventWebsiteModal Component', () => {
  it('renders modal when open with preview tabs and event details', () => {
    const onClose = vi.fn();
    const onToast = vi.fn();

    render(
      <AuthProvider>
        <EventWebsiteModal
          isOpen={true}
          onClose={onClose}
          plan={SAMPLE_WEDDING}
          onToast={onToast}
        />
      </AuthProvider>
    );

    // Header and navigation
    expect(screen.getByText(/Event Website & Invitation Builder/i)).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Live Preview/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Design & Themes/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Publish & Share/i })).toBeInTheDocument();

    // Event title in preview
    expect(screen.getByText(SAMPLE_WEDDING.title)).toBeInTheDocument();

    // Switch device mode
    const mobileBtn = screen.getByRole('button', { name: /Mobile View/i });
    fireEvent.click(mobileBtn);
    expect(mobileBtn).toHaveClass('btn-primary');

    // Switch to Design & Themes tab
    const themeTab = screen.getByRole('tab', { name: /Design & Themes/i });
    fireEvent.click(themeTab);
    expect(screen.getByText(/Choose Website Visual Palette/i)).toBeInTheDocument();

    // Switch to Publish & Share tab
    const shareTab = screen.getByRole('tab', { name: /Publish & Share/i });
    fireEvent.click(shareTab);
    expect(screen.getByRole('heading', { name: /1\. Live RSVP Link/i })).toBeInTheDocument();

    // Close button
    const closeBtn = screen.getByRole('button', { name: /Close dialog/i });
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });

  it('handles null plan gracefully', () => {
    const { container } = render(
      <AuthProvider>
        <EventWebsiteModal
          isOpen={true}
          onClose={vi.fn()}
          plan={null}
        />
      </AuthProvider>
    );
    expect(container).toBeInTheDocument();
  });

  it('renders LiveRsvpPanel within Share tab with RSVP actions', () => {
    const onToast = vi.fn();
    render(
      <AuthProvider>
        <EventWebsiteModal
          isOpen={true}
          onClose={vi.fn()}
          plan={SAMPLE_WEDDING}
          onToast={onToast}
        />
      </AuthProvider>
    );

    const shareTab = screen.getByRole('tab', { name: /Publish & Share/i });
    fireEvent.click(shareTab);

    expect(screen.getByText(/Create a free account/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Download Standalone \.html Website/i })).toBeInTheDocument();
  });
});
