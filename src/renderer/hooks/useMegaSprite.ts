/**
 * useMegaSprite Hook - Live Mega Form Sprite Lookup
 * Given a PokeAPI resource slug (e.g. "gengar-mega", "charizard-mega-x"),
 * fetches that Pokémon's real `id` and derives its sprite URLs from it -
 * Mega forms live at their own distinct PokeAPI id (e.g. Mega Venusaur is
 * 10033, not a suffixed filename off Venusaur's own id 3), so this can't be
 * computed locally the way the base/female sprite variants are.
 *
 * Species newly added to Mega Evolution by Pokémon Champions mostly have no
 * PokeAPI resource yet, so a 404 here is expected and just means "no mega
 * sprite available yet" - callers fall back to the normal sprite, never a
 * broken image. Cached in-memory per slug for the rest of the session.
 */

import { useState, useEffect } from 'react';
import { fetchJSON } from '../services/pokeapiService';
import { CURATED_MEGA_FORM_SLUGS } from '../config/megaEvolution';
import { runWithConcurrency } from '../utils/concurrency';

const PREFETCH_CONCURRENCY = 8;

export interface MegaSpriteResult {
  id: number;
  spriteUrl: string;
  shinySpriteUrl: string;
}

interface PokeAPIPokemonResponse {
  id: number;
}

const cache = new Map<string, MegaSpriteResult | null>();

function buildResult(id: number): MegaSpriteResult {
  return {
    id,
    spriteUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`,
    shinySpriteUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${id}.png`,
  };
}

/**
 * Exported (not just used internally) so useInitialSync can bulk-prefetch
 * every Mega form's id/sprite URLs during the first-launch/regulation-delta
 * sync pass - it shares this same module-level cache, so a component that
 * later calls useMegaSprite for an already-prefetched slug gets an instant
 * hit instead of re-fetching.
 */
export async function fetchMegaSprite(apiSlug: string): Promise<MegaSpriteResult | null> {
  if (cache.has(apiSlug)) return cache.get(apiSlug)!;
  const data = await fetchJSON<PokeAPIPokemonResponse>(`/pokemon/${apiSlug}`);
  const result = data ? buildResult(data.id) : null;
  cache.set(apiSlug, result);
  return result;
}

/**
 * Synchronous read of the same module-level cache, for a caller that can't
 * use the `useMegaSprite` hook itself (e.g. mapping over a dynamic list of
 * roster species, where the Rules of Hooks forbid calling a hook per item) -
 * Speed Tiers' Mega-form rows (see SpeedTiersPage.tsx) call
 * useMegaSpritePrefetch below to warm this cache before reading it this way.
 */
export function getCachedMegaSprite(apiSlug: string): MegaSpriteResult | null {
  return cache.get(apiSlug) ?? null;
}

/**
 * Resolves the sprite to actually display for `species` (already-known,
 * possibly Mega-form species name, e.g. from a Speed Tiers form toggle
 * override) - the cached Mega sprite when `species` is a known Mega form,
 * otherwise `fallbackSpriteUrl` (the base species' own sprite, already
 * resolved by the caller) unchanged. Covers a base species, a stat-only
 * forme (Aegislash-Shield), or a still-cold cache the same way: none of
 * those have a cache entry, so this is just a no-op fallback for them.
 */
export function resolveDisplaySpriteUrl(species: string, shiny: boolean, fallbackSpriteUrl: string): string {
  const megaSprite = getCachedMegaSprite(species.toLowerCase());
  if (!megaSprite) return fallbackSpriteUrl;
  return shiny ? megaSprite.shinySpriteUrl : megaSprite.spriteUrl;
}

/**
 * Bulk-warms the cache above for every Champions-legal Mega form slug
 * (CURATED_MEGA_FORM_SLUGS), for a caller that reads it synchronously via
 * getCachedMegaSprite over a dynamic roster list - Rules of Hooks forbids
 * calling useMegaSprite itself once per item in a loop, which is why
 * SpeedTiersPage's Mega roster rows need this instead.
 *
 * Deliberately independent of useInitialSync's own Mega-sprite bulk-download
 * pass: that pass exists to warm the on-disk sprite *image* cache and only
 * runs again once useInitialSync finds something genuinely unsynced (first
 * launch, or a future regulation adding new species) - see its header. The
 * id/URL mapping this hook populates, though, lives in the plain in-memory
 * `cache` map above, which is wiped on every app restart. Without a fetch of
 * its own, every session after the very first app launch would find that
 * map empty and silently fall back to the base-species sprite for every Mega
 * row shown here, even though useInitialSync "finished" syncing long ago -
 * this was reported live 2026-09-09 as Mega rows always rendering with the
 * base sprite (see TODO.md's Speed Tiers Mega Sprite Fallback entry).
 *
 * Returns a version counter (not a boolean) so a caller's derived data can
 * depend on it and recompute once real data lands - a boolean flipping
 * false->true only once wouldn't distinguish "still loading" from "nothing
 * to load" the way a fresh number after each completed pass does. Cheap
 * even on a fully cold cache: ~90 small JSON lookups run at bounded
 * concurrency via runWithConcurrency, and any individual miss just means the
 * existing base-sprite fallback keeps showing for that one row (non-fatal,
 * same as a single fetchMegaSprite miss elsewhere).
 */
export function useMegaSpritePrefetch(): number {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let cancelled = false;
    const slugs = [...CURATED_MEGA_FORM_SLUGS].filter(slug => !cache.has(slug));
    if (slugs.length === 0) return;
    runWithConcurrency(slugs, PREFETCH_CONCURRENCY, () => {}, fetchMegaSprite).then(() => {
      if (!cancelled) setVersion(v => v + 1);
    });
    return () => { cancelled = true; };
  }, []);
  return version;
}

/** `apiSlug` null means "not currently mega-eligible" - returns null immediately, no fetch */
export function useMegaSprite(apiSlug: string | null): MegaSpriteResult | null {
  const [result, setResult] = useState<MegaSpriteResult | null>(apiSlug ? cache.get(apiSlug) ?? null : null);

  // Re-derives synchronously from cache the moment apiSlug changes - set
  // during render rather than in an effect, see
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [resolvedForSlug, setResolvedForSlug] = useState(apiSlug);
  if (apiSlug !== resolvedForSlug) {
    setResolvedForSlug(apiSlug);
    setResult(apiSlug ? cache.get(apiSlug) ?? null : null);
  }

  useEffect(() => {
    if (!apiSlug || cache.has(apiSlug)) return;
    let cancelled = false;
    fetchMegaSprite(apiSlug).then(r => { if (!cancelled) setResult(r); });
    return () => { cancelled = true; };
  }, [apiSlug]);

  return result;
}
