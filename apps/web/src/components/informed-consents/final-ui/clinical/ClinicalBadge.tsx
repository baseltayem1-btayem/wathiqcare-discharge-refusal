"use client";

import React from 'react';

type Variant = 'critical' | 'warning' | 'ready' | 'info' | 'draft' | 'sent' | 'signed' | 'pending' | 'gold';

interface Props {
  variant: Variant;
  label: string;
  dot?: boolean;
  size?: 'sm' | 'md';
}

const styles: Record<Variant, string> = {
  critical: 'bg-red-50 text-red-700 border border-red-200',
  warning: 'bg-amber-50 text-amber-700 border border-amber-200',
  ready: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  info: 'bg-blue-50 text-blue-700 border border-blue-200',
  draft: 'bg-gray-100 text-gray-600 border border-gray-200',
  sent: 'bg-blue-50 text-blue-700 border border-blue-200',
  signed: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  pending: 'bg-amber-50 text-amber-700 border border-amber-200',
  gold: 'bg-amber-50 text-amber-700 border border-amber-300',
};

const dotColors: Record<Variant, string> = {
  critical: 'bg-red-500',
  warning: 'bg-amber-500',
  ready: 'bg-emerald-500',
  info: 'bg-blue-500',
  draft: 'bg-gray-400',
  sent: 'bg-blue-500',
  signed: 'bg-emerald-500',
  pending: 'bg-amber-500',
  gold: 'bg-amber-500',
};

export function ClinicalBadge({ variant, label, dot = false, size = 'sm' }: Props) {
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded font-medium ${sizeClass} ${styles[variant]}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />}
      {label}
    </span>
  );
}
