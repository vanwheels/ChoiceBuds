/**
 * Pure offline string parsing utility for Showdown/Pokepaste format
 * No API calls, no side effects - strictly regex-based text processing
 */

import type { ShowdownPokemon, ParseResult, EVSpread } from '../types/pokemon';
import { getFallbackGender } from '../config/pokemonRules';
import { normalizeMegaSpeciesOnImport } from '../config/megaEvolution';

/**
 * Default EV spread (all zeros)
 */
const DEFAULT_EVS: EVSpread = {
  hp: 0,
  attack: 0,
  defense: 0,
  specialAttack: 0,
  specialDefense: 0,
  speed: 0,
};


/**
 * Splits Showdown/Pokepaste text into individual Pokémon blocks
 * Uses double newline as the delimiter to separate each Pokémon
 * 
 * @param text - Raw Showdown/Pokepaste format text
 * @returns Array of text blocks, one per Pokémon
 */
export function splitIntoBlocks(text: string): string[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  // Split on double newlines (with optional whitespace between)
  const blocks = text.split(/\n\s*\n/);
  
  // Filter out empty blocks and trim whitespace
  return blocks
    .map(block => block.trim())
    .filter(block => block.length > 0);
}

/**
 * Parses a single Pokémon block into a ShowdownPokemon object
 * 
 * @param block - Single Pokémon text block
 * @returns Parsed ShowdownPokemon object
 */
export function parsePokemonBlock(block: string): ShowdownPokemon {
  const lines = block.split('\n').map(line => line.trim());
  
  // Initialize with defaults
  const pokemon: ShowdownPokemon = {
    species: '',
    level: 50, // VGC default
    shiny: false,
    gigantamax: false,
    happiness: 255,
    evs: { ...DEFAULT_EVS },
    moves: [],
  };

  // Parse first line: nickname/species/gender/item
  const firstLine = lines[0];
  if (firstLine) {
    parseFirstLine(firstLine, pokemon);
  }

  // Parse remaining lines
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.startsWith('Ability:')) {
      pokemon.ability = line.substring(8).trim();
    } else if (line.startsWith('Level:')) {
      const level = parseInt(line.substring(6).trim(), 10);
      if (!isNaN(level)) {
        pokemon.level = level;
      }
    } else if (line.startsWith('Shiny:')) {
      pokemon.shiny = line.substring(6).trim().toLowerCase() === 'yes';
    } else if (line.startsWith('Gigantamax:')) {
      pokemon.gigantamax = line.substring(11).trim().toLowerCase() === 'yes';
    } else if (line.startsWith('Happiness:')) {
      const happiness = parseInt(line.substring(10).trim(), 10);
      if (!isNaN(happiness)) {
        pokemon.happiness = happiness;
      }
    } else if (line.startsWith('Tera Type:')) {
      pokemon.teraType = line.substring(10).trim();
    } else if (line.endsWith('Nature')) {
      pokemon.nature = line.replace(/\s+Nature$/, '').trim();
    } else if (line.startsWith('EVs:')) {
      parseStatLine(line.substring(4), pokemon.evs);
    } else if (line.startsWith('-')) {
      // Move line
      const move = line.substring(1).trim();
      if (move.length > 0) {
        pokemon.moves.push(move);
      }
    }
  }

  return pokemon;
}

/**
 * Parses the first line of a Pokémon block
 * Format examples:
 *   - "Pikachu (M) @ Light Ball"
 *   - "Sparky (Pikachu) (F) @ Light Ball"
 *   - "Charizard"
 *   - "Basculegion-F @ Choice Scarf"
 * 
 * @param line - First line of the Pokémon block
 * @param pokemon - Pokemon object to populate
 */
function parseFirstLine(line: string, pokemon: ShowdownPokemon): void {
  let remaining = line;
  let explicitGender = false;

  // Extract item (@ symbol)
  const itemMatch = remaining.match(/@\s*(.+)$/);
  if (itemMatch) {
    pokemon.item = itemMatch[1].trim();
    remaining = remaining.substring(0, itemMatch.index).trim();
  }

  // Extract explicit gender from (M) or (F) notation
  const genderMatch = remaining.match(/\(([MF])\)\s*$/);
  if (genderMatch) {
    pokemon.gender = genderMatch[1] as 'M' | 'F';
    explicitGender = true;
    remaining = remaining.substring(0, genderMatch.index).trim();
  }

  // Extract species and nickname
  const nicknameMatch = remaining.match(/^(.+?)\s*\((.+?)\)$/);
  if (nicknameMatch) {
    pokemon.nickname = nicknameMatch[1].trim();
    pokemon.species = nicknameMatch[2].trim();
  } else {
    pokemon.species = remaining.trim();
  }

  // Showdown exports sometimes name a Mega-Evolved set after its Mega form
  // (e.g. "Aerodactyl-Mega") instead of the base species holding the Mega
  // Stone - not a real standalone species, since Mega Evolution only happens
  // in-battle. Correct it here (before gender fallback, so that logic runs
  // against the real base species) whenever the held item confirms it's
  // actually that species' own stone.
  pokemon.species = normalizeMegaSpeciesOnImport(pokemon.species, pokemon.item);

  // Apply gender fallback logic if no explicit gender was provided
  if (!explicitGender && pokemon.species) {
    const fallbackGender = getFallbackGender(pokemon.species);
    if (fallbackGender) {
      pokemon.gender = fallbackGender;
    }
  }
}

/**
 * Parses a stat line (EVs)
 * Format: "252 HP / 252 Atk / 4 Def"
 * 
 * @param line - Stat line content (without "EVs:" prefix)
 * @param stats - Stats object to populate
 */
function parseStatLine(line: string, stats: EVSpread): void {
  const parts = line.split('/').map(part => part.trim());
  
  for (const part of parts) {
    const match = part.match(/^(\d+)\s+(.+)$/);
    if (match) {
      const value = parseInt(match[1], 10);
      const statName = match[2].trim().toLowerCase();
      
      if (isNaN(value)) continue;
      
      // Map stat names to object keys
      switch (statName) {
        case 'hp':
          stats.hp = value;
          break;
        case 'atk':
        case 'attack':
          stats.attack = value;
          break;
        case 'def':
        case 'defense':
          stats.defense = value;
          break;
        case 'spa':
        case 'sp. atk':
        case 'spatk':
        case 'special attack':
          stats.specialAttack = value;
          break;
        case 'spd':
        case 'sp. def':
        case 'spdef':
        case 'special defense':
          stats.specialDefense = value;
          break;
        case 'spe':
        case 'speed':
          stats.speed = value;
          break;
      }
    }
  }
}

/**
 * One line of a formatted Pokémon block. The EVs line is kept structured
 * (rather than a plain string like every other line) so callers that want a
 * colored on-screen preview (matching the app's per-stat color convention -
 * see config/pokemonTheme.ts::getStatLabelColor) can render it themselves
 * without re-parsing plain text back into stat/value pairs.
 */
export type FormattedLine =
  | { kind: 'text'; text: string }
  | { kind: 'evs'; parts: Array<{ stat: string; value: number }> };

const EV_STAT_LABELS: Array<{ key: keyof EVSpread; label: string }> = [
  { key: 'hp', label: 'HP' },
  { key: 'attack', label: 'Atk' },
  { key: 'defense', label: 'Def' },
  { key: 'specialAttack', label: 'SpA' },
  { key: 'specialDefense', label: 'SpD' },
  { key: 'speed', label: 'Spe' },
];

/**
 * Builds one Pokémon's export lines from its parsed/edited data - the
 * reverse of parsePokemonBlock. Line order matches real Showdown's own
 * export convention (name/item, Ability, Level, Shiny, Tera Type, EVs,
 * Nature, moves); optional lines are omitted whenever the value is still
 * at its Showdown-assumed default (mirroring what real exports do), except
 * Level - always stated explicitly since VGC/Champions defaults to 50,
 * not real Showdown's own implicit 100 default, so omitting it would
 * silently change the Pokémon if pasted elsewhere. IVs are never emitted:
 * this app doesn't model them at all (see git history - "Remove IV
 * handling from renderer flow").
 *
 * Note: this app's "EVs:" field is actually Champions' 0-32 Stat Point
 * scale, not real Showdown's 0-252 EVs - exported as-is under the same
 * "EVs:" label so re-importing through this app's own parser round-trips
 * exactly, even though the numbers would misread if pasted into the real
 * Showdown client.
 */
export function formatPokemonLines(pokemon: ShowdownPokemon): FormattedLine[] {
  const lines: FormattedLine[] = [];

  const namePart = pokemon.nickname && pokemon.nickname !== pokemon.species
    ? `${pokemon.nickname} (${pokemon.species})`
    : pokemon.species;
  const fallbackGender = getFallbackGender(pokemon.species);
  const genderPart = pokemon.gender && pokemon.gender !== 'N' && pokemon.gender !== fallbackGender
    ? ` (${pokemon.gender})`
    : '';
  const itemPart = pokemon.item ? ` @ ${pokemon.item}` : '';
  lines.push({ kind: 'text', text: `${namePart}${genderPart}${itemPart}` });

  if (pokemon.ability) lines.push({ kind: 'text', text: `Ability: ${pokemon.ability}` });
  lines.push({ kind: 'text', text: `Level: ${pokemon.level}` });
  if (pokemon.shiny) lines.push({ kind: 'text', text: 'Shiny: Yes' });
  if (pokemon.gigantamax) lines.push({ kind: 'text', text: 'Gigantamax: Yes' });
  if (pokemon.happiness !== 255) lines.push({ kind: 'text', text: `Happiness: ${pokemon.happiness}` });
  if (pokemon.teraType) lines.push({ kind: 'text', text: `Tera Type: ${pokemon.teraType}` });

  const evParts = EV_STAT_LABELS
    .map(({ key, label }) => ({ stat: label, value: pokemon.evs[key] }))
    .filter(part => part.value > 0);
  if (evParts.length > 0) lines.push({ kind: 'evs', parts: evParts });

  if (pokemon.nature) lines.push({ kind: 'text', text: `${pokemon.nature} Nature` });

  for (const move of pokemon.moves) {
    lines.push({ kind: 'text', text: `- ${move}` });
  }

  return lines;
}

function linesToText(lines: FormattedLine[]): string {
  return lines
    .map(line => line.kind === 'text'
      ? line.text
      : `EVs: ${line.parts.map(p => `${p.value} ${p.stat}`).join(' / ')}`)
    .join('\n');
}

/**
 * Formats a list of Pokémon back into Showdown/Pokepaste export text - the
 * reverse of parseShowdownText. Blocks are separated by a blank line,
 * matching splitIntoBlocks' own expected delimiter.
 */
export function formatShowdownText(pokemonList: ShowdownPokemon[]): string {
  return pokemonList.map(p => linesToText(formatPokemonLines(p))).join('\n\n');
}

/**
 * Main parser function: converts Showdown/Pokepaste text into structured data
 *
 * @param text - Raw Showdown/Pokepaste format text
 * @returns ParseResult with parsed Pokémon and any errors
 */
export function parseShowdownText(text: string): ParseResult {
  const errors: string[] = [];
  const pokemon: ShowdownPokemon[] = [];
  
  try {
    const blocks = splitIntoBlocks(text);
    
    if (blocks.length === 0) {
      errors.push('No Pokémon data found in the provided text');
      return {
        success: false,
        pokemon: [],
        errors,
        rawBlocks: [],
      };
    }

    for (let i = 0; i < blocks.length; i++) {
      try {
        const parsed = parsePokemonBlock(blocks[i]);
        
        // Validate that we at least got a species name
        if (!parsed.species || parsed.species.length === 0) {
          errors.push(`Block ${i + 1}: Could not determine Pokémon species`);
          continue;
        }
        
        pokemon.push(parsed);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Block ${i + 1}: ${errorMessage}`);
      }
    }

    return {
      success: pokemon.length > 0,
      pokemon,
      errors,
      rawBlocks: blocks,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown parsing error';
    errors.push(`Fatal parsing error: ${errorMessage}`);
    
    return {
      success: false,
      pokemon: [],
      errors,
      rawBlocks: [],
    };
  }
}
