import type { BoxSortMode } from '../types/pokemon';

interface BoxPageToolbarProps {
  displayedCount: number;
  search: string;
  onSearchChange: (search: string) => void;
  sortMode: BoxSortMode;
  onSetSortMode: (mode: BoxSortMode) => void;
}

// Desktop header: build count, search input, and the Alphabetical/Custom
// sort-mode toggle - split out of BoxPage.tsx (File Cap Splits: BoxPage.tsx,
// see TODO.md) with no behavior change. Hidden below `md`, where
// BoxPage.tsx's useMobileHeaderActions call publishes the same search
// input/sort toggle into Sidebar.tsx's mobile top bar instead.
export default function BoxPageToolbar({
  displayedCount,
  search,
  onSearchChange,
  sortMode,
  onSetSortMode,
}: BoxPageToolbarProps) {
  return (
    <header className="hidden md:block bg-zinc-800 border-b border-zinc-700 px-8 py-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-zinc-100">Box</h2>
          <p className="text-sm text-zinc-400 mt-1">
            {displayedCount} saved {displayedCount === 1 ? 'build' : 'builds'}
          </p>
        </div>

        <div className="flex gap-2 items-center flex-wrap">
          {/* Search (Box Tab: Search Leg 8, see TODO.md) - same '#tag'
              chain SpeciesPickerCard.tsx's own search bar supports. */}
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search builds... (#fire, #dragon dance, ...)"
            className="w-full md:w-64 px-3 py-2 text-sm text-white bg-zinc-700 border border-zinc-600 rounded-lg outline-none focus:border-accent-gold placeholder:text-zinc-500"
          />

          {/* Sort-mode toggle (Box Tab: Reorder Leg 7, see TODO.md) - same
              pill-button filter style TeamsPage.tsx uses for its format
              filters. */}
          {(['alphabetical', 'custom'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => onSetSortMode(mode)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                sortMode === mode
                  ? 'bg-accent-gold text-zinc-900'
                  : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
              }`}
            >
              {mode === 'alphabetical' ? 'Alphabetical' : 'Custom order'}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
