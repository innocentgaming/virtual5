import React from 'react';
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
  const tabs: { id: NavigationTab; label: string; icon: React.ReactNode; badge?: React.ReactNode }[] = [
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

  return (
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
  );
};
