/**
 * Pure word-list/pattern-based safety filter for public-facing text
 * (usernames now; public team names/Pokemon nicknames once the Base
 * Route/Per-Item Visibility Toggles legs add a public-read endpoint - see
 * docs/investigations/public-profiles-safety-filter-research.md). No
 * network dependency, matching that research leg's decision against a
 * hosted filtering API.
 *
 * Uses `obscenity`'s English preset (whole-word/leetspeak/confusable-aware
 * matching, zero runtime deps, no Node-only APIs - safe for the Workers
 * runtime) rather than a naive substring word list, to avoid the
 * "Scunthorpe problem" on legitimate Pokemon/VGC text. Vetted against every
 * real species/move/ability/item name from PokeAPI (~4,500 names) plus
 * common VGC jargon: the only false positives found were two-word
 * ability/item names run together ("Neutralizing Gas", "Koffing Gas",
 * "Klefki" + "Key") colliding with the library's slur-evasion patterns
 * (`n[i]gga` matching the bare substring "ngga"; a bare "kike" substring
 * match with no word-boundary anchor). The two phrases below are rebuilt
 * from the English preset's own patterns with one extra whitelisted term
 * each to suppress exactly those collisions - real slurs ("nigga",
 * "niggerslur", "kike" alone) stayed flagged after this change.
 */

import {
  RegExpMatcher,
  DataSet,
  englishDataset,
  englishRecommendedTransformers,
  pattern,
} from 'obscenity';

const customDataset = new DataSet<{ originalWord: string }>()
  .addAll(englishDataset)
  .removePhrasesIf(
    (phrase) =>
      phrase.metadata?.originalWord === 'nigger' || phrase.metadata?.originalWord === 'kike',
  )
  .addPhrase(
    (phrase) =>
      phrase
        .setMetadata({ originalWord: 'nigger' })
        .addPattern(pattern`n[i]gger`)
        .addPattern(pattern`n[i]gga`)
        .addPattern(pattern`|nig|`)
        .addPattern(pattern`|nigs|`)
        .addWhitelistedTerm('snigger')
        .addWhitelistedTerm('izingga') // "Neutralizing Gas"
        .addWhitelistedTerm('offingga'), // "Koffing Gas"
  )
  .addPhrase(
    (phrase) =>
      phrase
        .setMetadata({ originalWord: 'kike' })
        .addPattern(pattern`kike`)
        .addWhitelistedTerm('fkikey'), // "Klefki" + "Key"
  );

const matcher = new RegExpMatcher({
  ...customDataset.build(),
  ...englishRecommendedTransformers,
});

/** True if `text` contains disallowed content (profanity/slurs). Pure, offline, no I/O. */
export function containsDisallowedContent(text: string): boolean {
  return matcher.hasMatch(text);
}
