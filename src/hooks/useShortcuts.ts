import { useEffect } from 'react';

export function useShortcuts() {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isInput = (e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA';
      const mod = e.ctrlKey || e.metaKey;

      if (mod && e.key === 'k') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('shortcut:search'));
      } else if (mod && e.key === 'Enter') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('shortcut:optimize'));
      } else if (e.key === 'Escape') {
        window.dispatchEvent(new CustomEvent('shortcut:escape'));
      } else if (!mod && !isInput && e.key === '?') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('shortcut:help'));
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}
