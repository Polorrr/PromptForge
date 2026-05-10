function getLocale(): string {
  if (typeof window !== 'undefined') {
    const lang = document.documentElement.lang;
    if (lang === 'zh') return 'zh-CN';
  }
  return 'en-US';
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(getLocale(), {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(getLocale(), {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function timeAgo(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diff = now - then;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const isZh = getLocale().startsWith('zh');

  if (days > 0) return isZh ? `${days}天前` : `${days}d ago`;
  if (hours > 0) return isZh ? `${hours}小时前` : `${hours}h ago`;
  if (minutes > 0) return isZh ? `${minutes}分钟前` : `${minutes}m ago`;
  return isZh ? '刚刚' : 'just now';
}
