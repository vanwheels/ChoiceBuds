---
paths:
  - "src/renderer/config/pokemonRules.ts"
  - "src/renderer/services/pokeapi.ts"
---

# Gender/form handling

VGC-legal species have two gender concerns that must stay in sync across two
files: `config/pokemonRules.ts::getFallbackGender` (parsing-time fallback
when Showdown text omits an explicit `(M)`/`(F)`) and
`services/pokeapi.ts::normalizeSpeciesForAPI` (PokeAPI models
Basculegion/Indeedee/Oinkologne/Meowstic as distinct `-male`/`-female`
resources, not one gender-neutral entry). When adding a new
gender-divergent or gender-locked/genderless species, update both.
