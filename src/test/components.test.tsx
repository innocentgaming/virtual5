import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../App';

describe('EventWise AI UI & Workflow Integration Tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders application header, title, and initial dashboard', () => {
    render(<App />);

    // Brand and header
    expect(screen.getByText('EventWise AI')).toBeInTheDocument();
    expect(screen.getByText(/Personalized Event Planning & Decision Engine/i)).toBeInTheDocument();

    // Event select dropdown
    const select = screen.getByLabelText(/Select active event plan/i);
    expect(select).toBeInTheDocument();

    // Dashboard metrics
    expect(screen.getByText(/Total Budget/i)).toBeInTheDocument();
    expect(screen.getByText(/Estimated Spend/i)).toBeInTheDocument();
    expect(screen.getByText(/Task Completion/i)).toBeInTheDocument();
  });

  it('switches between navigation tabs smoothly', () => {
    render(<App />);

    // Click Budget Manager tab
    const budgetTab = screen.getByRole('button', { name: /Budget Manager/i });
    fireEvent.click(budgetTab);

    expect(screen.getByText(/Expense Distribution by Category/i)).toBeInTheDocument();
    expect(screen.getByText(/Configurable Contingency Buffer/i)).toBeInTheDocument();

    // Click Timeline tab
    const timelineTab = screen.getByRole('button', { name: /Timeline & Tasks/i });
    fireEvent.click(timelineTab);

    expect(screen.getByText(/Date-Aware Preparation Timeline/i)).toBeInTheDocument();

    // Click Vendor Checklist tab
    const vendorTab = screen.getByRole('button', { name: /Vendor Checklist/i });
    fireEvent.click(vendorTab);

    expect(screen.getByText(/Vendor Checklist & Interview Guide/i)).toBeInTheDocument();

    // Click Personalized Ideas tab
    const ideasTab = screen.getByRole('button', { name: /Personalized Ideas/i });
    fireEvent.click(ideasTab);

    expect(screen.getByText(/Personalized Event Concepts & Alternatives/i)).toBeInTheDocument();
  });

  it('allows adding and editing an expense in the Budget Manager', () => {
    render(<App />);

    // Navigate to budget tab
    fireEvent.click(screen.getByRole('button', { name: /Budget Manager/i }));

    // Click Add Custom Expense
    const addBtn = screen.getByRole('button', { name: /Add Custom Expense/i });
    fireEvent.click(addBtn);

    expect(screen.getByText(/Add New Expense Item/i)).toBeInTheDocument();

    const nameInput = screen.getByLabelText(/Expense Description \*/i);
    const costInput = screen.getByLabelText(/Estimated Amount \(\$\) \*/i);

    fireEvent.change(nameInput, { target: { value: 'Live Jazz Trio' } });
    fireEvent.change(costInput, { target: { value: '1800' } });

    // Submit new expense
    const submitBtn = screen.getByRole('button', { name: /Save Expense/i });
    fireEvent.click(submitBtn);

    // Verify added to list
    expect(screen.getByText('Live Jazz Trio')).toBeInTheDocument();
  });

  it('allows toggling task completion in the Timeline', () => {
    render(<App />);

    // Navigate to timeline
    fireEvent.click(screen.getByRole('button', { name: /Timeline & Tasks/i }));

    // Find the first task checkbox
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThan(0);

    const firstCheckbox = checkboxes[0];
    const initialChecked = (firstCheckbox as HTMLInputElement).checked;

    fireEvent.click(firstCheckbox);
    expect((firstCheckbox as HTMLInputElement).checked).toBe(!initialChecked);
  });

  it('switches to New Event creation mode and validates inputs', () => {
    render(<App />);

    const newEventBtn = screen.getByRole('button', { name: /New Event/i });
    fireEvent.click(newEventBtn);

    expect(screen.getByText(/Create & Personalize New Event/i)).toBeInTheDocument();

    // Click submit with empty city to test validation
    const cityInput = screen.getByLabelText(/City \/ Location \*/i);
    fireEvent.change(cityInput, { target: { value: '' } });

    const saveBtn = screen.getByRole('button', { name: /Generate Event Plan/i });
    fireEvent.click(saveBtn);

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('meets accessibility basics with semantic landmarks and ARIA labels', () => {
    render(<App />);

    // Header landmark
    expect(screen.getByRole('banner')).toBeInTheDocument();

    // Main navigation landmark
    expect(screen.getByRole('navigation', { name: /Main Navigation/i })).toBeInTheDocument();

    // Main content area
    expect(screen.getByRole('main')).toBeInTheDocument();
  });
});
