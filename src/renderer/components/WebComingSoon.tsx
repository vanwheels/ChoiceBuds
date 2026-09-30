/**
 * WebComingSoon.tsx - Placeholder For Not-Yet-Ported Web Tabs
 * Web Nav Shell: Adopt Sidebar.tsx leg (see TODO.md) - once AppWeb.tsx uses
 * the real Sidebar.tsx, every desktop tab shows up in the nav even though
 * only Teams/Box are functionally wired so far. Renders in place of the
 * ones that aren't (Battle Log, Statistics, Type Matchup, Speed Tiers,
 * Settings) until their own parity legs land - not a feature itself, just
 * keeping the shell from showing a blank pane when one of those tabs is
 * clicked.
 */

interface WebComingSoonProps {
  feature: string;
}

export default function WebComingSoon({ feature }: WebComingSoonProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
      <p className="text-lg font-semibold text-zinc-200">{feature} isn't on the web yet</p>
      <p className="max-w-sm text-sm text-zinc-500">
        This is available in the desktop app and coming to the web version soon.
      </p>
    </div>
  );
}
