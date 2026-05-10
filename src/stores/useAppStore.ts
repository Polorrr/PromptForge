import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppState {
  sidebarOpen: boolean;
  language: 'en' | 'zh';
  theme: 'light' | 'dark' | 'system';
  toggleSidebar: () => void;
  setLanguage: (lang: 'en' | 'zh') => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      language: 'en',
      theme: 'system',
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setLanguage: (language) => set({ language }),
      setTheme: (theme) => {
        set({ theme });
        applyTheme(theme);
      },
    }),
    { name: 'promptforge-app' }
  )
);

function applyTheme(theme: 'light' | 'dark' | 'system') {
  const root = document.documentElement;
  root.classList.remove('light', 'dark');

  if (theme === 'system') {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.add(isDark ? 'dark' : 'light');
  } else {
    root.classList.add(theme);
  }
}

// Apply theme on load
const stored = localStorage.getItem('promptforge-app');
if (stored) {
  try {
    const { state } = JSON.parse(stored);
    applyTheme(state?.theme || 'system');
  } catch {
    applyTheme('system');
  }
}
