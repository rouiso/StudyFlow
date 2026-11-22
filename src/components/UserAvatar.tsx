import React from 'react';

interface UserAvatarProps {
  name: string;
  className?: string;
}

export function UserAvatar({ name, className = '' }: UserAvatarProps) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toLocaleUpperCase() || '?';

  return (
    <span
      role="img"
      aria-label={name}
      title={name}
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-indigo-500/20 font-semibold leading-none text-indigo-200 ${className}`}
    >
      {initials}
    </span>
  );
}
