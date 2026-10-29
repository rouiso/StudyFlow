'use client';

import React from 'react';
import {
  Kanban,
  CheckSquare,
  Calendar,
  MessageSquare,
  BarChart3,
  Sparkles,
} from 'lucide-react';

export type ActiveTab = 'kanban' | 'tasks' | 'calendar' | 'chat' | 'stats' | 'ai';

interface MobileBottomNavProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  unreadMessagesCount?: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onTabChange,
  unreadMessagesCount = 0,
}) => {
  const tabs = [
    { id: 'kanban' as ActiveTab, label: 'Kanban', icon: Kanban },
    { id: 'tasks' as ActiveTab, label: 'Tâches', icon: CheckSquare },
    { id: 'calendar' as ActiveTab, label: 'Calendrier', icon: Calendar },
    { id: 'chat' as ActiveTab, label: 'Chat', icon: MessageSquare, badge: unreadMessagesCount },
    { id: 'stats' as ActiveTab, label: 'Stats', icon: BarChart3 },
    { id: 'ai' as ActiveTab, label: 'IA Copilot', icon: Sparkles, highlight: true },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 glass-panel border-t border-slate-800/90 py-1.5 px-2 backdrop-blur-xl sm:px-6">
      <div className="max-w-md sm:max-w-xl mx-auto flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-200 select-none ${
                isActive
                  ? tab.highlight
                    ? 'text-pink-400 font-bold scale-105'
                    : 'text-indigo-400 font-bold scale-105'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform ${
                    isActive ? (tab.highlight ? 'text-pink-400' : 'text-indigo-400') : ''
                  }`}
                />
                {tab.badge && tab.badge > 0 ? (
                  <span className="absolute -top-1 -right-2 w-3.5 h-3.5 bg-rose-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center">
                    {tab.badge}
                  </span>
                ) : null}
              </div>

              <span className="text-[10px] mt-1 tracking-tight truncate">
                {tab.label}
              </span>

              {isActive && (
                <span
                  className={`absolute -bottom-1 w-6 h-0.5 rounded-full ${
                    tab.highlight ? 'bg-pink-400' : 'bg-indigo-500'
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
