import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EventSetupForm } from '../components/setup/EventSetupForm';

describe('Setup Wizard (Step 3)', () => {
  it('enforces step validation: Next is disabled or alerts if required fields are missing', () => {
    const handleSave = vi.fn();
    render(<EventSetupForm onSave={handleSave} />);

    // Step 1: Celebration selection -> Next should be enabled (defaults to wedding)
    const nextBtn = screen.getByRole('button', { name: /Next/i });
    expect(nextBtn).toBeEnabled();
    fireEvent.click(nextBtn);

    // Now on Step 2: Clear title
    const titleInput = screen.getByLabelText(/Event Name \/ Celebration Title \*/i);
    fireEvent.change(titleInput, { target: { value: '' } });
    fireEvent.blur(titleInput);

    // Title error should be displayed with role alert
    const titleError = screen.getByRole('alert');
    expect(titleError).toHaveTextContent(/Event title cannot be empty/i);

    // Next button should be disabled with explanation title
    expect(nextBtn).toBeDisabled();
    expect(nextBtn).toHaveAttribute('title', 'Please enter an event name or celebration title');
  });

  it('preserves user input data during back and forward step navigation', () => {
    const handleSave = vi.fn();
    render(<EventSetupForm onSave={handleSave} />);

    // Advance to Step 2
    fireEvent.click(screen.getByRole('button', { name: /Next/i }));

    // Fill in Step 2 data
    const titleInput = screen.getByLabelText(/Event Name \/ Celebration Title \*/i);
    fireEvent.change(titleInput, { target: { value: 'Grand Sangeet & Reception 2026' } });

    const cityInput = screen.getByLabelText(/City \/ Location \*/i);
    fireEvent.change(cityInput, { target: { value: 'Udaipur, Rajasthan' } });

    // Advance to Step 3: Budget & Guests
    const nextBtn = screen.getByRole('button', { name: /Next/i });
    expect(nextBtn).toBeEnabled();
    fireEvent.click(nextBtn);

    expect(screen.getByText(/Step 3: Budget, Scale & Contingency/i)).toBeInTheDocument();

    // Change budget
    const budgetInput = screen.getByLabelText(/Total Budget \(₹\) \*/i);
    fireEvent.change(budgetInput, { target: { value: '2500000' } });

    // Go back to Step 2
    const backBtn = screen.getByRole('button', { name: /Back/i });
    fireEvent.click(backBtn);

    // Verify Step 2 values were strictly retained
    expect(screen.getByLabelText(/Event Name \/ Celebration Title \*/i)).toHaveValue(
      'Grand Sangeet & Reception 2026'
    );
    expect(screen.getByLabelText(/City \/ Location \*/i)).toHaveValue('Udaipur, Rajasthan');

    // Go back to Step 1
    fireEvent.click(screen.getByRole('button', { name: /Back/i }));
    expect(screen.getByText(/Step 1: Choose Your Celebration/i)).toBeInTheDocument();

    // Advance forward again to Step 3
    fireEvent.click(screen.getByRole('button', { name: /Next/i }));
    fireEvent.click(screen.getByRole('button', { name: /Next/i }));

    // Verify budget is still 2500000
    expect(screen.getByLabelText(/Total Budget \(₹\) \*/i)).toHaveValue(2500000);
  });

  it('renders dietary chips and contingency slider with live ₹ readout', () => {
    const handleSave = vi.fn();
    render(<EventSetupForm onSave={handleSave} />);

    // Navigate to Step 3
    fireEvent.click(screen.getByRole('button', { name: /Next/i }));
    fireEvent.click(screen.getByRole('button', { name: /Next/i }));

    // Contingency slider should show live amount
    expect(screen.getByText(/Contingency Reserve Buffer \(10%\)/i)).toBeInTheDocument();

    // Navigate to Step 4: Preferences
    fireEvent.click(screen.getByRole('button', { name: /Next/i }));
    expect(screen.getByText(/Step 4: Cultural, Dietary & Accessibility Guardrails/i)).toBeInTheDocument();

    // Check dietary chips exist
    expect(screen.getByRole('button', { name: /Pure Veg/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Jain/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Halal/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Gluten-free/i })).toBeInTheDocument();
  });
});
