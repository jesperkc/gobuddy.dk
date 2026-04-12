import { useCallback, useRef } from "react";
import type { ProfileTab } from "./types";

interface ProfileTabBarProps {
  tabs: ProfileTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  ariaLabel?: string;
}

export function ProfileTabBar({
  tabs,
  activeTab,
  onTabChange,
  ariaLabel = "Profil sektioner",
}: ProfileTabBarProps) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      const currentIndex = tabs.findIndex((t) => t.id === activeTab);
      let nextIndex: number | null = null;

      if (e.key === "ArrowRight") {
        nextIndex = (currentIndex + 1) % tabs.length;
      } else if (e.key === "ArrowLeft") {
        nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      }

      if (nextIndex !== null) {
        e.preventDefault();
        onTabChange(tabs[nextIndex].id);
        tabRefs.current[nextIndex]?.focus();
      }
    },
    [activeTab, tabs, onTabChange],
  );

  return (
    <div className="border-b border-gray-200">
      <div
        role="tablist"
        aria-label={ariaLabel}
        className="-mb-px flex space-x-8 overflow-x-auto"
      >
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            ref={(el) => {
              tabRefs.current[index] = el;
            }}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`tabpanel-${tab.id}`}
            id={`tab-${tab.id}`}
            tabIndex={activeTab === tab.id ? 0 : -1}
            onClick={() => onTabChange(tab.id)}
            onKeyDown={handleKeyDown}
            className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium ${
              activeTab === tab.id
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
