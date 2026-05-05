'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  UserPlus,
  FileText,
  Settings,
  LogOut,
  ChevronLeft,
  Users,
  ClipboardList,
  FolderOpen,
  UserCheck,
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, disabled: false },
  { label: 'Candidates', href: '/candidates', icon: Users, disabled: false },
  { label: 'Requested', href: '/requested', icon: ClipboardList, disabled: false },
  { label: 'Not Requested', href: '/not-requested', icon: ClipboardList, disabled: false },
  { label: 'Fit Candidates', href: '/fit-candidates', icon: UserCheck, disabled: false },
  { label: 'Brokers', href: '/brokers', icon: Users, disabled: false },
  { label: 'Registration', href: '/registration', icon: UserPlus, disabled: false },
  { label: 'CV Generator', href: '/cv-generator', icon: FileText, disabled: false },
  { label: 'Generated CVs', href: '/generated-cvs', icon: FolderOpen, disabled: false },
  { label: 'Settings', href: '/settings', icon: Settings, disabled: false },
];


interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (v: boolean | ((prev: boolean) => boolean)) => void;
}

export default function Sidebar({ isCollapsed, setIsCollapsed }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside 
      className={cn(
        "relative shrink-0 h-screen bg-gradient-to-b from-sidebar-from to-sidebar-to flex flex-col z-40 transition-all duration-300",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      {/* Logo */}
      <div className={cn("flex items-center pt-7 pb-2 transition-all duration-300", isCollapsed ? "justify-center px-0" : "gap-3 px-6")}>
        <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm flex shrink-0 items-center justify-center border border-white/10">
          <span className="text-white font-bold text-lg">D</span>
        </div>
        {!isCollapsed && (
          <div className="overflow-hidden whitespace-nowrap transition-all duration-300">
            <h1 className="text-white font-bold text-xl tracking-wide">DAERA</h1>
            <p className="text-white/40 text-[10px] tracking-[0.2em] uppercase">Employment Agency</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 mt-8 space-y-1 overflow-y-auto overflow-x-hidden">
        {navItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/' && pathname.startsWith(item.href));
          const Icon = item.icon;

          if (item.disabled) {
            return (
              <div
                key={item.href}
                className={cn("flex items-center rounded-lg text-white/25 cursor-not-allowed", isCollapsed ? "justify-center py-3" : "gap-3 px-4 py-2.5")}
                title={item.label}
              >
                <Icon size={18} className="shrink-0" />
                {!isCollapsed && <span className="text-sm whitespace-nowrap">{item.label}</span>}
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center rounded-lg transition-all duration-200 group relative',
                isCollapsed ? 'justify-center py-3' : 'gap-3 px-4 py-2.5',
                isActive
                  ? 'bg-white/15 text-white shadow-none'
                  : 'text-white/60 hover:bg-white/10 hover:text-white/90'
              )}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon size={18} className={cn(
                'shrink-0 transition-transform duration-200',
                !isActive && 'group-hover:scale-110'
              )} />
              {!isCollapsed && (
                <span className="text-sm font-medium whitespace-nowrap">{item.label}</span>
              )}
              {isActive && !isCollapsed && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="px-3 pb-6 space-y-1">
        <button 
          className={cn(
            "flex items-center rounded-lg text-white/40 hover:text-red-400 hover:bg-red-400/10 transition-all duration-200 w-full cursor-pointer",
            isCollapsed ? "justify-center py-3" : "gap-3 px-4 py-2.5"
          )}
          title={isCollapsed ? "Logout" : undefined}
        >
          <LogOut size={18} className="shrink-0" />
          {!isCollapsed && <span className="text-sm whitespace-nowrap">Logout</span>}
        </button>
      </div>

      {/* Collapse button */}
      <button 
        onClick={() => setIsCollapsed(prev => !prev)}
        className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-surface border border-border rounded-full flex items-center justify-center shadow-sm cursor-pointer hover:bg-primary hover:text-white hover:border-primary transition-all duration-200 z-50"
      >
        <ChevronLeft size={12} className={cn("transition-transform duration-300", isCollapsed && "rotate-180")} />
      </button>
    </aside>
  );
}
