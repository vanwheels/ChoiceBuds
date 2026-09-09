/**
 * TeamPreviewCard.tsx - One Team Member's Speed Tiers Preview Control
 * One card per SpeedTiersTeamPreviewStrip.tsx entry: sprite, a Speed-SP
 * modifier (same hold-to-repeat +/- + typable-input interaction as Team
 * Builder's EV editing - EVStatCell.tsx - scoped to just the Speed stat
 * here, so it's always shown expanded rather than needing StatsColumn.tsx's
 * click-to-expand gate), a nature selector, and a form/Mega toggle (mirrors
 * CalcPokemonPanel.tsx's own FormeToggle). All three write into the parent's
 * session-only TeamSpeedOverride via onChange - see utils/speedTierOverrides.ts
 * for why ability isn't a fourth editable field here.
 */
import type { NatureName } from '@smogon/calc/dist/data/interface';
import type { ImportedPokemonInfo } from '../../types/pokemon';
import type { UseSpriteCacheReturn } from '../../hooks/useSpriteCache';
import type { FormeFamily } from '../../utils/calcFormes';
import { formeDisplayLabel } from '../../utils/calcFormes';
import type { TeamSpeedOverride } from '../../utils/speedTierOverrides';
import { useHoldRepeat } from '../../hooks/useHoldRepeat';

interface TeamPreviewCardProps {
  pokemon: ImportedPokemonInfo;
  override: TeamSpeedOverride;
  formes: FormeFamily;
  natureOptions: NatureName[];
  onChange: (updates: Partial<TeamSpeedOverride>) => void;
  spriteCacheState: UseSpriteCacheReturn;
}

function FormeToggle({ group, current, onSelect }: { group: string[]; current: string; onSelect: (name: string) => void }) {
  return (
    <div className="flex gap-1 flex-wrap justify-center">
      {group.map(name => (
        <button
          key={name}
          type="button"
          onClick={() => onSelect(name)}
          className={`px-1.5 py-0.5 text-[9px] font-bold rounded transition-colors cursor-pointer ${
            current === name ? 'bg-accent-gold text-zinc-900' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
          }`}
        >
          {formeDisplayLabel(group, name)}
        </button>
      ))}
    </div>
  );
}

export default function TeamPreviewCard({ pokemon, override, formes, natureOptions, onChange, spriteCacheState }: TeamPreviewCardProps) {
  const incRepeat = useHoldRepeat(() => onChange({ spSpeed: Math.min(32, override.spSpeed + 1) }));
  const decRepeat = useHoldRepeat(() => onChange({ spSpeed: Math.max(0, override.spSpeed - 1) }));
  const megaGroup = formes.megaFormes.length > 0 ? [formes.root, ...formes.megaFormes] : [];

  return (
    <div className="flex flex-col items-center gap-1 bg-zinc-900/40 border border-zinc-800/80 rounded-lg p-2 w-[108px] shrink-0">
      <img
        src={spriteCacheState.resolveSprite(pokemon.spriteUrl)}
        alt={pokemon.showdownData.species}
        title={pokemon.showdownData.species}
        className="w-10 h-10 object-contain [image-rendering:pixelated]"
      />
      <span className="text-[10px] text-zinc-200 text-center leading-tight truncate w-full" title={pokemon.showdownData.species}>
        {pokemon.showdownData.species}
      </span>

      <div className="flex flex-col items-center gap-0.5">
        <span className="text-[9px] font-bold text-zinc-400 uppercase">Spe SP</span>
        <div className="flex items-center gap-0.5">
          <button
            {...decRepeat}
            disabled={override.spSpeed <= 0}
            className="w-5 h-5 text-xs font-bold rounded border shrink-0"
            style={{ backgroundColor: override.spSpeed <= 0 ? '#1f2937' : '#374151', color: override.spSpeed <= 0 ? '#6b7280' : '#f3f4f6', borderColor: '#4b5563', cursor: override.spSpeed <= 0 ? 'not-allowed' : 'pointer' }}
          >
            −
          </button>
          <input
            type="number"
            value={override.spSpeed}
            onFocus={(e) => e.currentTarget.select()}
            onChange={(e) => {
              const parsed = Number(e.target.value);
              if (!Number.isNaN(parsed)) onChange({ spSpeed: Math.max(0, Math.min(32, Math.floor(parsed))) });
            }}
            className="w-9 text-center text-sm font-mono font-bold rounded border border-zinc-600 bg-zinc-900 text-zinc-100 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <button
            {...incRepeat}
            disabled={override.spSpeed >= 32}
            className="w-5 h-5 text-xs font-bold rounded border shrink-0"
            style={{ backgroundColor: override.spSpeed >= 32 ? '#1f2937' : '#374151', color: override.spSpeed >= 32 ? '#6b7280' : '#f3f4f6', borderColor: '#4b5563', cursor: override.spSpeed >= 32 ? 'not-allowed' : 'pointer' }}
          >
            +
          </button>
        </div>
      </div>

      <select
        value={override.nature}
        onChange={(e) => onChange({ nature: e.target.value as NatureName })}
        className="w-full px-1 py-0.5 text-[10px] bg-zinc-800 border border-zinc-600 rounded text-white outline-none focus:border-accent-gold"
      >
        {natureOptions.map(n => <option key={n} value={n}>{n}</option>)}
      </select>

      {formes.statFormes.length > 1 && (
        <FormeToggle group={formes.statFormes} current={override.species} onSelect={(species) => onChange({ species })} />
      )}
      {megaGroup.length > 0 && (
        <FormeToggle group={megaGroup} current={override.species} onSelect={(species) => onChange({ species })} />
      )}
    </div>
  );
}
