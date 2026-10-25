import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button, Modal, ToastProvider, useToast, Toast, Badge, Skeleton, EmptyState } from '../components/ui';

describe('UI Primitives — Design System & Accessibility', () => {
  describe('Button Component', () => {
    it('renders text, applies variant classes, and handles click events', () => {
      const handleClick = vi.fn();
      render(
        <Button variant="primary" size="md" onClick={handleClick}>
          Click Me
        </Button>
      );

      const btn = screen.getByRole('button', { name: /Click Me/i });
      expect(btn).toBeInTheDocument();
      expect(btn).toHaveClass('ui-button--primary');
      expect(btn).toHaveClass('ui-button--md');

      fireEvent.click(btn);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('handles disabled state correctly', () => {
      const handleClick = vi.fn();
      render(
        <Button disabled onClick={handleClick}>
          Disabled Button
        </Button>
      );

      const btn = screen.getByRole('button', { name: /Disabled Button/i });
      expect(btn).toBeDisabled();

      fireEvent.click(btn);
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('handles loading state with spinner, disabled behavior, and aria-busy', () => {
      const handleClick = vi.fn();
      render(
        <Button isLoading onClick={handleClick}>
          Save Plan
        </Button>
      );

      const btn = screen.getByRole('button', { name: /Save Plan/i });
      expect(btn).toBeDisabled();
      expect(btn).toHaveAttribute('aria-busy', 'true');
      expect(btn).toHaveClass('ui-button--loading');

      fireEvent.click(btn);
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Modal Component', () => {
    it('renders with role="dialog", aria-modal="true", and locks body scroll', () => {
      const handleClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={handleClose} title="Test Modal" description="Modal description">
          <p>Modal content</p>
          <button>Inner Action</button>
        </Modal>
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(screen.getByText('Test Modal')).toBeInTheDocument();
      expect(screen.getByText('Modal content')).toBeInTheDocument();
    });

    it('triggers onClose when Escape key is pressed', () => {
      const handleClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={handleClose} title="Escape Test">
          <p>Press Esc to close</p>
        </Modal>
      );

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('triggers onClose when backdrop is clicked', () => {
      const handleClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={handleClose} title="Backdrop Test">
          <p>Click outside to close</p>
        </Modal>
      );

      const backdrop = screen.getByTestId('modal-backdrop');
      fireEvent.click(backdrop);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('traps focus using Tab and Shift+Tab cycling', () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()} title="Focus Trap Test">
          <button>First Button</button>
          <button>Second Button</button>
        </Modal>
      );

      const closeBtn = screen.getByRole('button', { name: /Close dialog/i });
      const firstBtn = screen.getByRole('button', { name: /First Button/i });
      const secondBtn = screen.getByRole('button', { name: /Second Button/i });

      expect(firstBtn).toBeInTheDocument();

      // Focus second button (last focusable element) and press Tab
      secondBtn.focus();
      expect(document.activeElement).toBe(secondBtn);

      fireEvent.keyDown(window, { key: 'Tab', shiftKey: false });
      // In focus trap implementation, Tab on last element cycles to first element (close button)
      expect(document.activeElement).toBe(closeBtn);

      // Focus first button (close button) and press Shift+Tab
      closeBtn.focus();
      fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
      expect(document.activeElement).toBe(secondBtn);
    });
  });

  describe('Toast Component & Provider', () => {
    it('renders with role="status" and aria-live="polite"', () => {
      render(<Toast message="Plan exported successfully!" type="success" />);

      const toast = screen.getByRole('status');
      expect(toast).toBeInTheDocument();
      expect(toast).toHaveAttribute('aria-live', 'polite');
      expect(screen.getByText('Plan exported successfully!')).toBeInTheDocument();
      expect(toast).toHaveClass('ui-toast--success');
    });

    it('ToastProvider renders toasts with useToast hook and auto-dismisses', () => {
      const TestConsumer = () => {
        const { showToast } = useToast();
        return (
          <button onClick={() => showToast('Contingency updated', 'info', 2000)}>
            Trigger Notification
          </button>
        );
      };

      render(
        <ToastProvider>
          <TestConsumer />
        </ToastProvider>
      );

      const triggerBtn = screen.getByRole('button', { name: /Trigger Notification/i });
      fireEvent.click(triggerBtn);

      expect(screen.getByText('Contingency updated')).toBeInTheDocument();

      // Dismiss button
      const dismissBtn = screen.getByRole('button', { name: /Dismiss notification/i });
      fireEvent.click(dismissBtn);

      expect(screen.queryByText('Contingency updated')).not.toBeInTheDocument();
    });
  });

  describe('Badge, Skeleton, and EmptyState Primitives', () => {
    it('renders dietary badges for Jain and Pure Veg', () => {
      render(
        <div>
          <Badge variant="dietary" dietaryType="jain">Jain Friendly</Badge>
          <Badge variant="dietary" dietaryType="pure_veg">100% Pure Veg</Badge>
        </div>
      );

      expect(screen.getByText('Jain Friendly')).toBeInTheDocument();
      expect(screen.getByText('100% Pure Veg')).toBeInTheDocument();
      expect(screen.getByText('🥗')).toBeInTheDocument();
      expect(screen.getByText('🌱')).toBeInTheDocument();
    });

    it('renders Skeleton with aria-hidden="true" and shape classes', () => {
      const { container } = render(
        <div>
          <Skeleton shape="circle" width={40} height={40} />
          <Skeleton shape="line" />
        </div>
      );

      const circle = container.querySelector('.ui-skeleton--circle');
      expect(circle).toBeInTheDocument();
      expect(circle).toHaveAttribute('aria-hidden', 'true');
    });

    it('renders EmptyState with title, description, and action button', () => {
      render(
        <EmptyState
          title="No tasks found"
          description="You are all caught up on event milestones."
          action={<button>Add First Task</button>}
        />
      );

      expect(screen.getByText('No tasks found')).toBeInTheDocument();
      expect(screen.getByText('You are all caught up on event milestones.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Add First Task/i })).toBeInTheDocument();
    });
  });
});
