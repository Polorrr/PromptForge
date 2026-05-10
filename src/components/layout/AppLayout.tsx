import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAppStore } from '@/stores/useAppStore';

export default function AppLayout() {
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);

  return (
    <div className="flex h-screen overflow-hidden bg-surface-0 dark:bg-dark-0">
      <Sidebar />
      <div
        className={`flex flex-col flex-1 min-w-0 transition-all duration-200 ${
          sidebarOpen ? 'ml-60' : 'ml-16'
        }`}
      >
        <Header />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
