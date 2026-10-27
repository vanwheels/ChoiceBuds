import { useRef, useState, type ReactNode } from 'react';

interface CalcDropdownProps {
  label: string;
  children: (close: () => void) => ReactNode;
}

/**
 * Button + absolutely-positioned panel, replacing the Calc popup's native
 * <select>s so options can carry colored text and usage %. Panels own their
 * dismiss handling (useDismissable), so the trigger records whether the panel
 * was open at mousedown: otherwise that same mousedown closes the panel and
 * the following click would immediately reopen it.
 */
export default function CalcDropdown({ label, children }: CalcDropdownProps) {
  const [open, setOpen] = useState(false);
  const wasOpenOnPress = useRef(false);

  return (
    <div className="relative">
      <button
        type="button"
        onMouseDown={() => {
          wasOpenOnPress.current = open;
        }}
        onClick={() => setOpen(!wasOpenOnPress.current)}
        className="w-full flex items-center justify-between gap-1 px-2 py-0.5 text-sm text-left bg-zinc-800 border border-zinc-600 rounded text-white outline-none hover:border-accent-gold focus:border-accent-gold"
      >
        <span className="truncate">{label}</span>
        <span className="text-zinc-400 text-[10px]">▾</span>
      </button>
      {open && (
        <div className="absolute z-30 left-0 top-full mt-1 min-w-full w-72">
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}
