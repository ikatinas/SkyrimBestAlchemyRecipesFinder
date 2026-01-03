# SkyrimBestAlchemyRecipesFinder
try it out here - [ikatinas.github.io/SkyrimBestAlchemyRecipesFinder](https://ikatinas.github.io/SkyrimBestAlchemyRecipesFinder/)

## about
_TES Skyrim Best Alchemy Recipes Finder_. Alchemy's quality of life improvement tool. Data includes ingredients and effects from Dawnguard, Hearthfire, Dragonborn DLCs and Creation Club creations (e.g. Rare Curios).

The code is structured so it is easy to add new ingredients from other creations/mods and auto generate recipes DB.

Build to be lightweight and fast, no frameworks, no external runtime packages.

# Development setup
required [nodejs](https://nodejs.org)
run command to install typescipt and development http server packages
```
npm install
```
# quick start
```shell
npm run build:db && npm start
```

## step by step explained
- This builds optimised db files from human readable ones in `/db` folder
```shell
npm run build:db 
```

### start local dev. http server
```shell
npm start
```

### re-compile your TS code to JS when changed
```shell
npm run build
```