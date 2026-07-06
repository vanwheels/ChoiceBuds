/**
 * useDismissable Hook - Escape Key + Click-Outside Cancel
 * Attaches to a picker/panel's root element: pressing Escape, or clicking
 * anywhere outside the returned ref's DOM node, calls onDismiss. Callers
 * should wire onDismiss to a pure "close/cancel" action (never a commit),
 * so dismissing always leaves the underlying data untouched.
 */

import { useEffect, useRef } from 'react';

export function useDismissable<T extends HTMLElement>(onDismiss: () => void): React.RefObject<T | null> {
  const ref = useRef<T>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onDismiss();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onDismiss]);

  return ref;
}
