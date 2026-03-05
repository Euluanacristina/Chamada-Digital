import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  BookOpen, 
  Users, 
  History, 
  FileText, 
  ClipboardCheck,
  Settings
} from 'lucide-react';
import { cn } from '../ui/Button';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/turmas', label: 'Classes', icon: BookOpen },
  { path: '/alunos', label: 'Students', icon: Users },
  { path: '/historico', label: 'History', icon: History },
  { path: '/relatorios', label: 'Reports', icon: FileText },
];

export const Sidebar: React.FC = () => {
  return (
    <aside className="hidden lg:flex flex-col w-64 bg-slate text-white h-screen sticky top-0">
      <div className="p-6 flex items-center gap-3">
        <div className="p-2 bg-white/10 rounded-lg">
          <ClipboardCheck className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-xl font-display font-bold tracking-tight">Digital Attendance</h1>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-4 py-3 rounded-xl transition-all',
              isActive ? 'bg-white/12 text-white font-medium shadow-sm' : 'text-white/70 hover:bg-white/5 hover:text-white'
            )}
          >
            <item.icon className="w-5 h-5" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export const BottomNav: React.FC = () => {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-2 py-1 flex justify-around items-center z-40">
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) => cn(
            'flex flex-col items-center gap-1 p-2 rounded-xl transition-all min-w-[64px]',
            isActive ? 'text-slate font-semibold' : 'text-gray-400'
          )}
        >
          <item.icon className="w-6 h-6" />
          <span className="text-[10px] uppercase tracking-wider">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
};

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="flex min-h-screen bg-paper">
      <Sidebar />
      <main className="flex-1 pb-24 lg:pb-0">
        <div className="max-w-7xl mx-auto p-4 md:p-8 lg:p-10">
          {children}
        </div>
      </main>
      <BottomNav />
    </div>
  );
};
