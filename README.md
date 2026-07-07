## 🎨 Credits & Data Asset Pipelines

ChoiceBuds is built on top of incredible open-source datasets, asset pipelines, and community-driven tools. I want to extend our immense gratitude to the creators and maintainers of the following resources that make this VGC teambuilder possible:

### 📊 Data & Legality Engines
* **[PokeAPI Data Hub](https://pokeapi.co)** - The ultimate open-source RESTful API for Pokémon data. Powers our core species data hooks, ability descriptions, and move-set structures.
* **[@smogon/calc (damage-calc)](https://github.com/smogon/damage-calc)** - MIT-licensed damage calculation engine (published as the `@smogon/calc` npm package) powering our entire damage calculator's underlying math.
* **[Pokémon Showdown Repository](https://github.com/smogon/pokemon-showdown)** - The structural backbone for competitive text serialization formats (PokePaste) and move formatting standards.
* **[Serebii.net](https://serebii.net)** - Used two ways: (1) hotlinked directly for item sprites and Move Category badges (Physical/Special/Status) that PokeAPI doesn't cleanly provide, and (2) read manually as a reference during development to hand-compile our VGC-legal item list, Regulation M-A/M-B legality tables, and Mega Stone mappings, where no other source had the information.

### 🖼️ Visual Assets & Sprites
* **[PokeAPI/sprites](https://github.com/PokeAPI/sprites)** - The actual hotlink source for every pixel-art Pokémon sprite in the app (normal and shiny). This repo's own README credits the Smogon community for permission to serve their modern (Gen 6+) sprite set through it.
* **[msikma / PokéSprite Repository](https://github.com/msikma/pokesprite)** - MIT-licensed. Powers our clean, compact Shiny star indicator badges and interactive gender symbols.

---
