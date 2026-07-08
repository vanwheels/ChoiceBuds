## 🎨 Credits & Data Asset Pipelines

ChoiceBuds is built on top of incredible open-source datasets, asset pipelines, and community-driven tools. I want to extend our immense gratitude to the creators and maintainers of the following resources that make this VGC teambuilder possible:

### 📊 Data & Legality Engines
* **[PokeAPI Data Hub](https://pokeapi.co)** - The ultimate open-source RESTful API for Pokémon data. Powers our core species data hooks, ability descriptions, and move-set structures.
* **[@smogon/calc (damage-calc)](https://github.com/smogon/damage-calc)** - MIT-licensed damage calculation engine (published as the `@smogon/calc` npm package) powering our entire damage calculator's underlying math.
* **[Pokémon Showdown Repository](https://github.com/smogon/pokemon-showdown)** - The structural backbone for competitive text serialization formats (PokePaste) and move formatting standards.
* **[Pokepast.es](https://pokepast.es)** - Fetched live (via its own `/<id>/json` endpoint, never scraped) when a user pastes a `pokepast.es` link into the team importer, to pull the paste's own team name, author, and Showdown-format text directly.
* **[Serebii.net](https://serebii.net)** - Used two ways: (1) hotlinked directly for item sprites and Move Category badges (Physical/Special/Status) that PokeAPI doesn't cleanly provide, and (2) read manually as a reference during development to hand-compile our VGC-legal item list, Regulation M-A/M-B legality tables, Mega Stone mappings, and Pokemon Champions' balance-patch changes (updated move stats, retiered PP, changed abilities/status conditions), where no other source had the information.
* **[Bulbapedia](https://bulbapedia.bulbagarden.net)** - Read manually as a reference during development to cross-verify Pokemon Champions' balance-patch changes (move/ability/status-condition differences from mainline Scarlet/Violet) and identify per-species movepool additions Champions has made.
* **"Data Comparative Champions"** - A community-maintained spreadsheet by RoiDadadou, cross-referencing datamined values from Kaphotics and Anubis plus battle-mechanics research from DaWoblefet. Relayed to us directly by the user (never fetched live) to hand-verify move balance changes, PP retiering exceptions, and misc. mechanic differences from mainline.

### 🖼️ Visual Assets & Sprites
* **[PokeAPI/sprites](https://github.com/PokeAPI/sprites)** - The actual hotlink source for every pixel-art Pokémon sprite in the app (normal and shiny). This repo's own README credits the Smogon community for permission to serve their modern (Gen 6+) sprite set through it.
* **[msikma / PokéSprite Repository](https://github.com/msikma/pokesprite)** - MIT-licensed. Powers our clean, compact Shiny star indicator badges and interactive gender symbols.

---
