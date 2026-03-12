import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Keep cn as it depends on clsx/tailwind-merge (renderer specific)
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const isModKey = (e: React.KeyboardEvent | KeyboardEvent | { ctrlKey: boolean, metaKey: boolean }) => {
  const isMac = navigator.userAgent.includes('Mac');
  return isMac ? e.metaKey : e.ctrlKey;
};
