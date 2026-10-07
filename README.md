# Weave Patterner

A weaving draft editor: set the threading, tie-up and treadling, pick warp and weft colours, and see the drawdown update live. Patterns can be saved in the browser (up to 200) or exported and imported as `.weave.json` files. An example is in `samples/`.

For looms and other weaving software, Export also writes [WIF](https://www.mhsoft.com/wif/wif.html) 1.1 files, either with tie-up and treadling or as a lift plan for computer-dobby looms. Import reads WIF files too.

```sh
npm install
npm run dev     # local dev server
npm run build   # production build in dist/
```

Pushing to `main` deploys to GitHub Pages via `.github/workflows/deploy.yml`.
