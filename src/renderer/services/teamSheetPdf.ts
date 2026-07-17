/**
 * Generates a filled VGC Team Sheet PDF for a saved Team, by overlaying text
 * at fixed coordinates (config/teamSheetLayout.ts) on top of the bundled
 * official Play! Pokémon template (public/vg-team-list-template.pdf) - see
 * that config file's header for why coordinate overlay rather than named
 * form fields. Powers TeamSheetPdfModal.tsx's Download button; the returned
 * bytes are handed to a Blob + `<a download>`, same pattern
 * TeamExportImageModal.tsx already uses for its poster PNG.
 */
import { PDFDocument, StandardFonts } from 'pdf-lib';
import type { Team, PlayerProfile } from '../types/pokemon';
import { TEAM_SHEET_LAYOUT, type TeamSheetFieldPos, type TeamSheetPageLayout, type TeamSheetPokemonSlot } from '../config/teamSheetLayout';
import { formatStatAlignment } from '../utils/statAlignment';

function splitDateOfBirth(iso: string): { month: string; day: string; year: string } {
  const [year, month, day] = iso.split('-');
  return { month: month ?? '', day: day ?? '', year: year ?? '' };
}

export async function generateTeamSheetPdf(team: Team, playerProfile: PlayerProfile): Promise<Uint8Array> {
  const templateUrl = `${import.meta.env.BASE_URL}vg-team-list-template.pdf`;
  const templateBytes = await fetch(templateUrl).then(res => res.arrayBuffer());

  const doc = await PDFDocument.load(templateBytes);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const [page0, page1] = doc.getPages();

  const draw = (page: typeof page0, text: string, pos: TeamSheetFieldPos) => {
    if (!text) return;
    page.drawText(text, { x: pos.x, y: pos.y, size: pos.size, font });
  };

  const battleTeamNumberName = [team.battleTeamNumber, team.battleTeamName].filter(Boolean).join(' - ');

  const drawSharedHeader = (page: typeof page0, layout: TeamSheetPageLayout) => {
    draw(page, playerProfile.playerName, layout.playerName);
    draw(page, playerProfile.trainerNameInGame, layout.trainerNameInGame);
    draw(page, battleTeamNumberName, layout.battleTeamNumberName);
    draw(page, playerProfile.switchProfileName, layout.switchProfileName);
    const ageDivisionPos = playerProfile.ageDivision === 'Juniors' ? layout.ageDivision.juniors
      : playerProfile.ageDivision === 'Seniors' ? layout.ageDivision.seniors
      : playerProfile.ageDivision === 'Masters' ? layout.ageDivision.masters
      : null;
    if (ageDivisionPos) draw(page, 'X', ageDivisionPos);
  };

  const drawPokemonSlots = (page: typeof page0, slots: TeamSheetPokemonSlot[]) => {
    team.pokemon.slice(0, 6).forEach((pokemon, i) => {
      const slot = slots[i];
      const { showdownData } = pokemon;
      draw(page, showdownData.species, slot.species);
      draw(page, formatStatAlignment(showdownData.nature, showdownData.evs), slot.statAlignment);
      draw(page, showdownData.ability ?? '', slot.ability);
      draw(page, showdownData.item ?? '', slot.heldItem);
      draw(page, showdownData.moves[0] ?? '', slot.move1);
      draw(page, showdownData.moves[1] ?? '', slot.move2);
      draw(page, showdownData.moves[2] ?? '', slot.move3);
      draw(page, showdownData.moves[3] ?? '', slot.move4);
    });
  };

  // Page 0: "1 of 2 - For Tournament Staff" - shared header + staff-only fields
  drawSharedHeader(page0, TEAM_SHEET_LAYOUT.page0);
  draw(page0, playerProfile.playerId, TEAM_SHEET_LAYOUT.page0.playerId);
  draw(page0, playerProfile.supportId, TEAM_SHEET_LAYOUT.page0.supportId);
  if (playerProfile.dateOfBirth) {
    const dob = splitDateOfBirth(playerProfile.dateOfBirth);
    draw(page0, dob.month, TEAM_SHEET_LAYOUT.page0.dateOfBirth.month);
    draw(page0, dob.day, TEAM_SHEET_LAYOUT.page0.dateOfBirth.day);
    draw(page0, dob.year, TEAM_SHEET_LAYOUT.page0.dateOfBirth.year);
  }
  drawPokemonSlots(page0, TEAM_SHEET_LAYOUT.page0.pokemonSlots);

  // Page 1: "2 of 2 - For Opponents" - shared header only, no player-identity fields
  drawSharedHeader(page1, TEAM_SHEET_LAYOUT.page1);
  drawPokemonSlots(page1, TEAM_SHEET_LAYOUT.page1.pokemonSlots);

  return doc.save();
}
