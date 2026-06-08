import React from 'react';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import type { ButtonState } from './WorkflowTypes';

interface Props {
  children: React.ReactNode;
  state?: ButtonState;
  variant?: 'primary' | 'secondary' | 'danger';
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export function WorkflowButton({
  children,
  state = 'default',
  variant = 'primary',
  onClick,
  disabled,
  className = '',
  icon: Icon,
}: Props) {
  const isDisabled = disabled || state === 'disabled' || state === 'loading';
  const isLoading = state === 'loading';
  const isSuccess = state === 'success';
  const isError = state === 'error';

  const baseClasses = 'px-5 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 min-w-[140px]';

  let variantClasses = '';
  if (variant === 'primary') {
    variantClasses = isDisabled
      ? 'bg-[#D8DCE3] text-[#9CA3AF] cursor-not-allowed'
      : isSuccess
      ? 'bg-emerald-600 text-white'
      : isError
      ? 'bg-red-600 text-white'
      : 'bg-[#002B5C] text-white hover:bg-[#001F45]';
  } else if (variant === 'secondary') {
    variantClasses = isDisabled
      ? 'border border-[#D8DCE3] text-[#9CA3AF] cursor-not-allowed'
      : 'border border-[#D8DCE3] text-[#6B7280] hover:text-[#2F2F2F] hover:border-[#9CA3AF] bg-white';
  } else if (variant === 'danger') {
    variantClasses = isDisabled
      ? 'bg-[#D8DCE3] text-[#9CA3AF] cursor-not-allowed'
      : 'bg-red-600 text-white hover:bg-red-700';
  }

  return (
    <button
      onClick={isDisabled ? undefined : onClick}
      disabled={isDisabled}
      className={`${baseClasses} ${variantClasses} ${className}`}
    >
      {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
      {isSuccess && <CheckCircle2 className="w-4 h-4" />}
      {isError && <AlertCircle className="w-4 h-4" />}
      {!isLoading && !isSuccess && !isError && Icon && <Icon className="w-4 h-4" />}
      {children}
    </button>
  );
}
