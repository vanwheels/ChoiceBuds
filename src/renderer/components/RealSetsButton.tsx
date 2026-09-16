/**
 * RealSetsButton.tsx - Team Builder Trigger for VGCPastes Real-Set Extraction
 * Team Builder Real Sets Integration Leg 2 (see TODO.md and
 * docs/investigations/team-builder-real-sets-scope.md for the scoping
 * session that shaped this). A single small trigger button on PokemonCard.tsx
 * opens a FloatingCardPanel (same card-width-locked, anchor-captured-on-open
 * pattern as EditOverlays.tsx's own item/ability/move pickers) hosting
 * CalcRealSetsSection.tsx with its collapse toggle dropped
 * (`collapsible={false}`) - this panel's own open/close is the on-demand
 * affordance now, so a second one nested inside it would be redundant.
 *
 * Deliberately its own component rather than a new prop threaded into
 * EditOverlays.tsx: EditOverlays/EditablePokemonCore are shared with
 * BoxCard.tsx's Saved Builds Box, which has no per-entry
 * regulation/vgcPastesState/vgcRealSetsState to look real sets up against -
 * keeping this self-contained means Box needs zero new optional props (and
 * no Rules-of-Hooks contortions to skip a lookup hook Box never provides
 * inputs for).
 *
 * Reuses useCalcRealSetsLookup.ts as-is - despite the "Calc" name, that
 * hook's own header already documents it as generic per-panel lookup state
 * (species/regulation in, cached-or-extracted entry out), not anything
 * CalcPokemonPanel-specific.
 */

import { useState } from 'react';
import type { MouseEvent } from 'react';
import type { RegulationLabel, VgcRealSetBundle } from '../types/pokemon';
import type { UseVgcPastesCacheReturn } from '../hooks/useVgcPastesCache';
import type { UseVgcRealSetsCacheReturn } from '../hooks/useVgcRealSetsCache';
import { useCalcRealSetsLookup } from '../hooks/useCalcRealSetsLookup';
import { useDismissable } from '../hooks/useDismissable';
import CalcRealSetsSection from './calc/CalcRealSetsSection';
import FloatingCardPanel from './FloatingCardPanel';

interface RealSetsButtonProps {
  species: string;
  regulation: RegulationLabel;
  vgcPastesState: UseVgcPastesCacheReturn;
  vgcRealSetsState: UseVgcRealSetsCacheReturn;
  onPickBundle: (bundle: VgcRealSetBundle) => void;
}

export default function RealSetsButton({ species, regulation, vgcPastesState, vgcRealSetsState, onPickBundle }: RealSetsButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const [cardRect, setCardRect] = useState<DOMRect | null>(null);
  const realSets = useCalcRealSetsLookup(regulation, vgcPastesState, vgcRealSetsState);
  const dismissRef = useDismissable<HTMLDivElement>(() => setIsOpen(false));

  const handleToggle = (e: MouseEvent<HTMLButtonElement>) => {
    if (isOpen) {
      setIsOpen(false);
      return;
    }
    setAnchorRect(e.currentTarget.getBoundingClientRect());
    setCardRect(e.currentTarget.closest<HTMLElement>('[data-pokemon-card]')?.getBoundingClientRect() ?? null);
    setIsOpen(true);
    realSets.lookup(species);
  };

  const handlePickBundle = (bundle: VgcRealSetBundle) => {
    onPickBundle(bundle);
    setIsOpen(false);
  };

  return (
    <div data-no-drag className="flex justify-center">
      <button
        type="button"
        onClick={handleToggle}
        disabled={!species}
        title="Fill this Pokémon from a real tournament set"
        className="px-2 py-1 text-[10px] font-bold uppercase tracking-wide rounded transition-colors cursor-pointer bg-zinc-800 text-zinc-300 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Real Sets
      </button>

      {isOpen && anchorRect && (
        <FloatingCardPanel anchorRect={anchorRect} cardRect={cardRect}>
          <div ref={dismissRef} className="w-full bg-zinc-800 border-2 border-accent-gold rounded-lg p-2">
            <CalcRealSetsSection
              species={species}
              regulation={regulation}
              hasCatalogRows={vgcPastesState.getRows(regulation).length > 0}
              isCatalogRefreshing={vgcPastesState.isRefreshing}
              onRefreshCatalog={() => realSets.refreshCatalogAndRetry(species)}
              entry={realSets.entry}
              isLoading={realSets.isLoading}
              error={realSets.error}
              onPickBundle={handlePickBundle}
              collapsible={false}
            />
          </div>
        </FloatingCardPanel>
      )}
    </div>
  );
}
