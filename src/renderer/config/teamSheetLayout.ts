/**
 * VGC Team Sheet PDF field positions (Battle Logger's sibling feature -
 * services/teamSheetPdf.ts overlays a saved Team + PlayerProfile onto the
 * bundled official Play! Pokémon team-list PDF, public/vg-team-list-template.pdf).
 *
 * The template is a flat/static PDF with no AcroForm fields (confirmed by
 * byte-level inspection - no /Widget, /FT, /Annots), so values are drawn at
 * fixed x/y coordinates rather than set into named form fields. Those
 * coordinates are generated, not hand-authored - see
 * scripts/generateTeamSheetLayout.ts and teamSheetLayout.generated.ts for
 * the derivation (every field is a text label immediately followed by blank
 * space on the same baseline, so the value position is just the label's own
 * end-x + a small gap). Regenerate if the template PDF is ever replaced.
 *
 * Page 0 ("For Tournament Staff") additionally has a per-Pokémon numeric
 * stat side-table (HP/Atk/Def/SpA/SpD/Speed) - filled with each Pokémon's
 * own computed real stats (services/teamSheetPdf.ts, via @smogon/calc, same
 * approach as useDamageCalc.ts: level 50, max IVs, Nature, Stat Points*4 as
 * EVs), not left blank - real VGC team sheets are filled this way.
 */
export { TEAM_SHEET_LAYOUT } from './teamSheetLayout.generated';
export type {
  TeamSheetFieldPos,
  TeamSheetStatsTable,
  TeamSheetPokemonSlot,
  TeamSheetStaffPokemonSlot,
  TeamSheetPageLayout,
  TeamSheetStaffPageLayout,
} from './teamSheetLayout.generated';
