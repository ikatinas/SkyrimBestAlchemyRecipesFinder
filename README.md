# SkyrimBestAlchemyRecipesFinder
try it out here - [ikatinas.github.io/SkyrimBestAlchemyRecipesFinder](https://ikatinas.github.io/SkyrimBestAlchemyRecipesFinder/)

## about
_TES Skyrim Best Alchemy Recipes Finder_. Alchemy's quality of life improvement tool. Data includes ingredients and effects from Dawnguard, Hearthfire, Dragonborn DLCs and Creation Club creations (e.g. Rare Curios).

The code is structured so it is easy to add new ingredients from other creations/mods and auto generate recipes DB.

Build to be lightweight and fast, no frameworks, no external runtime packages. Pure vanilla JS (once build)

# Development setup
required [nodejs](https://nodejs.org)
run command to install typescipt and development http server packages
```
npm install
```
# quick start
```shell
npm run build:sprites && npm run build:db && npm start
```

## step by step explained

```shell
### build sprites sheet and frame lookup data needed for db build
npm run build:sprites

### build optimised db files from human readable ones in `/db` folder
npm run build:db 

### start local dev. http server
npm start

### re-compile your TS code to JS when changed
npm run build
```