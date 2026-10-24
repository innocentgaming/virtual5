import React, { useState } from 'react';
import {
  LayoutDashboard,
  Settings2,
  DollarSign,
  CalendarDays,
  Users2,
  Lightbulb,
  Bot,
  Users,
  Clock,
  Menu,
  X,
} from 'lucide-react';
import type { NavigationTab } from '../../hooks/useEventPlan';

interface NavigationProps {
  activeTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  overdueTasksCount: number;
  isOverBudget: boolean;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onTabChange,
  overdueTasksCount,
  isOverBudget,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const tabs: {
    id: NavigationTab;
    label: string;
    icon: React.ReactNode;
    badge?: React.ReactNode;
  }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard size={18} />,
    },
    {
      id: 'setup',
      label: 'Event Setup',
      icon: <Settings2 size={18} />,
    },
    {
      id: 'budget',
      label: 'Budget Manager',
      icon: <DollarSign size={18} />,
      badge: isOverBudget ? (
        <span
          style={{
            background: 'var(--color-danger)',
            color: 'white',
            borderRadius: '9999px',
            padding: '2px 6px',
            fontSize: '10px',
            fontWeight: 700,
          }}
          title="Over Budget"
        >
          !
        </span>
      ) : undefined,
    },
    {
      id: 'timeline',
      label: 'Timeline & Tasks',
      icon: <CalendarDays size={18} />,
      badge:
        overdueTasksCount > 0 ? (
          <span
            style={{
              background: 'var(--color-warning)',
              color: 'var(--color-warning-text)',
              borderRadius: '9999px',
              padding: '2px 6px',
              fontSize: '10px',
              fontWeight: 700,
            }}
            title={`${overdueTasksCount} overdue tasks`}
          >
            {overdueTasksCount}
          </span>
        ) : undefined,
    },
    {
      id: 'schedule',
      label: 'Run of Show',
      icon: <Clock size={18} />,
    },
    {
      id: 'guests',
      label: 'Guest List & RSVPs',
      icon: <Users size={18} />,
    },
    {
      id: 'vendors',
      label: 'Vendor Checklist',
      icon: <Users2 size={18} />,
    },
    {
      id: 'ideas',
      label: 'Personalized Ideas',
      icon: <Lightbulb size={18} />,
    },
    {
      id: 'ai',
      label: 'AI & Decision Engine',
      icon: <Bot size={18} />,
    },
  ];

  const handleMobileNavClick = (tabId: NavigationTab) => {
    onTabChange(tabId);
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {/* Desktop / Tablet Horizontal Tab Navigation */}
      <nav className="nav-tabs" aria-label="Main Navigation">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            id={`nav-tab-${tab.id}`}
            className={`nav-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
            aria-current={activeTab === tab.id ? 'page' : undefined}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.badge}
          </button>
        ))}
      </nav>

      {/* Mobile Bottom Tab Bar (Visible on <= 768px screens) */}
      <nav className="mobile-bottom-nav" aria-label="Mobile Bottom Navigation">
        <button
          type="button"
          className={`mobile-nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => handleMobileNavClick('dashboard')}
          aria-label="Dashboard Overview"
        >
          <LayoutDashboard size={20} />
          <span>Overview</span>
        </button>

        <button
          type="button"
          className={`mobile-nav-btn ${activeTab === 'budget' ? 'active' : ''}`}
          onClick={() => handleMobileNavClick('budget')}
          aria-label="Budget"
        >
          <DollarSign size={20} />
          <span>Budget</span>
        </button>

        <button
          type="button"
          className={`mobile-nav-btn ${activeTab === 'timeline' ? 'active' : ''}`}
          onClick={() => handleMobileNavClick('timeline')}
          aria-label="Tasks"
        >
          <CalendarDays size={20} />
          <span>Tasks</span>
        </button>

        <button
          type="button"
          className={`mobile-nav-btn ${activeTab === 'guests' ? 'active' : ''}`}
          onClick={() => handleMobileNavClick('guests')}
          aria-label="Guests"
        >
          <Users size={20} />
          <span>Guests</span>
        </button>

        <button
          type="button"
          className={`mobile-nav-btn ${activeTab === 'schedule' ? 'active' : ''}`}
          onClick={() => handleMobileNavClick('schedule')}
          aria-label="Itinerary"
        >
          <Clock size={20} />
          <span>Schedule</span>
        </button>

        <button
          type="button"
          className={`mobile-nav-btn ${isMobileMenuOpen ? 'active' : ''}`}
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="More navigation options"
        >
          {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          <span>More</span>
        </button>
      </nav>

      {/* Mobile Drawer Popup for Secondary Tabs */}
      {isMobileMenuOpen && (
        <div
          className="modal-overlay"
          onClick={() => setIsMobileMenuOpen(false)}
          style={{ zIndex: 85, alignItems: 'flex-end', paddingBottom: '70px' }}
        >
          <div
            className="card"
            style={{ width: '100%', maxWidth: '420px', margin: '0 auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <strong style={{ fontSize: '1rem' }}>More Features</strong>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="btn btn-ghost btn-sm"
              >
                ✕
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
              <button
                type="button"
                className={`btn ${activeTab === 'setup' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                onClick={() => handleMobileNavClick('setup')}
              >
                <Settings2 size={16} /> Event Setup
              </button>
              <button
                type="button"
                className={`btn ${activeTab === 'vendors' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                onClick={() => handleMobileNavClick('vendors')}
              >
                <Users2 size={16} /> Vendors
              </button>
              <button
                type="button"
                className={`btn ${activeTab === 'ideas' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                onClick={() => handleMobileNavClick('ideas')}
              >
                <Lightbulb size={16} /> Ideas
              </button>
              <button
                type="button"
                className={`btn ${activeTab === 'ai' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                onClick={() => handleMobileNavClick('ai')}
              >
                <Bot size={16} /> AI Engine
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
