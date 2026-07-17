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
 * Deliberately not filled: the per-stat numeric side-table (HP/Atk/Def/SpA/
 * SpD/Speed) next to each Pokémon slot on page 1 ("For Tournament Staff") -
 * that's staff's handwritten field at check-in, not player-entered data.
 */
export { TEAM_SHEET_LAYOUT } from './teamSheetLayout.generated';
export type {
  TeamSheetFieldPos,
  TeamSheetPokemonSlot,
  TeamSheetPageLayout,
  TeamSheetStaffPageLayout,
} from './teamSheetLayout.generated';
