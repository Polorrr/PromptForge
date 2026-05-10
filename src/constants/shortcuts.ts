export const SHORTCUTS = {
  SEARCH: { key: 'k', ctrl: true, label: 'Search / Command Palette' },
  OPTIMIZE: { key: 'Enter', ctrl: true, label: 'Optimize prompt' },
  SAVE: { key: 's', ctrl: true, label: 'Save to library' },
  COPY: { key: 'c', ctrl: true, label: 'Copy optimized prompt' },
  TOGGLE_FAVORITE: { key: 'd', ctrl: true, label: 'Toggle favorite' },
  EXPORT: { key: 'e', ctrl: true, label: 'Export prompt' },
  ESCAPE: { key: 'Escape', label: 'Close modal / Cancel' },
  HELP: { key: '?', label: 'Show keyboard shortcuts' },
} as const;
