import type { BoxSortMode } from '../types/pokemon';
import type { TagChip } from '../types/tagChip';
import TagChipInput from './TagChipInput';

interface BoxPageToolbarProps {
  displayedCount: number;
  chips: TagChip[];
  onChipsChange: (chips: TagChip[]) => void;
  typeOptions: string[];
  moveOptions: string[];
  abilityOptions: string[];
  onQueryChange: (query: string) => void;
  sortMode: BoxSortMode;
  onSetSortMode: (mode: BoxSortMode) => void;
}

// Desktop header: build count, chip search (TagChipInput, Search & Filter:
// Tag-Chip Redesign Leg 3 - see TODO.md and BoxPage.tsx's header comment),
// and the Alphabetical/Custom sort-mode toggle - split out of BoxPage.tsx
// (File Cap Splits: BoxPage.tsx, see TODO.md) with no behavior change.
// Hidden below `md`, where BoxPage.tsx's useMobileHeaderActions call
// publishes its own separate TagChipInput instance (sharing the same
// `chips` state) into Sidebar.tsx's mobile top bar instead.
export default function BoxPageToolbar({
  displayedCount,
  chips,
  onChipsChange,
  typeOptions,
  moveOptions,
  abilityOptions,
  onQueryChange,
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
          <div className="w-full md:w-64">
            <TagChipInput
              chips={chips}
              onChipsChange={onChipsChange}
              typeOptions={typeOptions}
              moveOptions={moveOptions}
              abilityOptions={abilityOptions}
              placeholder="Search builds..."
              onQueryChange={onQueryChange}
            />
          </div>

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
