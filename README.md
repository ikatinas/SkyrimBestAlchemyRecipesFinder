# SkyrimBestAlchemyRecipesFinder
try it out here - [ikatinas.github.io/SkyrimBestAlchemyRecipesFinder](https://ikatinas.github.io/SkyrimBestAlchemyRecipesFinder/)

## about
TES Skyrim Best Alchemy Recipes Finder. Alchemy's quality of life improvement tool. Data includes ingredients and effects from Dawnguard, Hearthfire, Dragonborn DLCs and Creation Club creations (e.g. Rare Curios). There are plans to include ingredients from some popular mods too (e.g. Beyond Skyrim) as well as adding Price, Magnitude, Duration calculator.

# Development setup
required [nodejs](https://nodejs.org)
run command to install typescipt and development http server packages
```
npm install
```
## Compile your TypeScript code by running the following command:
```
npm run build
```

## Generate prebuilt recipes DB
This generates `db/build_recipes_db.json` from `db/effects_db.json` and `db/ingredients_db.json`:
```
npm run build:recipes
```

In CI, the workflow will regenerate this file
## run in local npm web server
```
npm start
```