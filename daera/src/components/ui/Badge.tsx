'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md';
}

export default function Badge({ children, variant = 'default', size = 'sm' }: BadgeProps) {
  const variants = {
    default: 'bg-primary-50 text-primary',
    success: 'bg-success-light text-green-700',
    warning: 'bg-warning-light text-amber-700',
    danger: 'bg-danger-light text-red-700',
    info: 'bg-primary-100 text-indigo-700',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
  };

  return (
    <span className={cn(
      'inline-flex items-center font-medium rounded-full',
      variants[variant],
      sizes[size]
    )}>
      {children}
    </span>
  );
}
