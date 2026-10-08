# Weave Patterner

A weaving draft editor: set the threading, tie-up and treadling, pick warp and weft colours, and see the drawdown update live. Patterns can be saved in the browser (up to 200) or exported and imported as `.weave.json` files. An example is in `samples/`.

For looms and other weaving software, Export also writes [WIF](https://www.mhsoft.com/wif/wif.html) 1.1 files, either with tie-up and treadling or as a lift plan for computer-dobby looms. Import reads WIF files too.

```sh
npm install
npm run dev     # local dev server
npm run build   # production build in dist/
npm test          # unit tests (Vitest)
npm run test:e2e  # browser tests (Playwright; desktop, phone and tablet)
npm run lint      # Biome lint + format check (npm run format to fix)
```

## Features

- Edit threading, tie-up and treadling by click, drag, keyboard or touch, with undo/redo (Ctrl+Z, Ctrl+Shift+Z)
- Per-thread warp and weft colours
- **Weaving mode**: a full-screen, pick-by-pick guide for the loom (treadles or shafts), keyboard and page-turner
  pedal friendly, remembering where you stopped
- **Sequence tools**: fill ranges with straight, point, advancing-twill or custom draws; repeat, mirror, reverse,
  insert, delete, **copy and paste** ends and picks (including threading into treadling); **tromp as writ**
- **Lift plans**: convert to a lift plan for dobby looms and back to a tie-up and treadling
- **Colours**: stripe sequences for warp and weft; colour-and-weave presets (houndstooth, log cabin, gingham,
  broken-twill check)
- **Display options**: end 1 on the right, numbers in boxes, rulers every N threads, hover crosshair
- **Long-float highlighting** and float statistics
- **Warp calculator**: width in reed, warp length and yarn per colour, with optional weight and cost
- Save up to 200 patterns in the browser; export/import `.weave.json` and WIF (including lift plans for dobby looms);
  export PNG and SVG images
- Print the draft in the classic layout, optionally with written threading/treadling instructions; light and dark
  themes; phone and tablet friendly

## Code layout

| Path | What's there |
|---|---|
| `src/*.ts` | Pure logic with unit tests: drafts (`weave`), WIF, floats, sequence tools, calculator, weaving, history |
| `src/components/` | UI pieces: toolbar, settings panel, draft view, grids, print sheet |
| `src/dialogs/` | Save, load, import, sequence tools, warp calculator, weaving mode |
| `src/hooks/` | Undo history and share-link loading |
| `e2e/` | Playwright tests |
| `mcp/` | MCP server for AI assistants |

## MCP server: let AIs design patterns

`mcp/` is a [Model Context Protocol](https://modelcontextprotocol.io) server that lets AI assistants create weaving
drafts, see a preview, and export them for looms. Every result includes a link that opens the pattern in the web app.

| Tool | What it does |
|---|---|
| `create_weave_pattern` | Build a draft from threading, tie-up and treadling (or a lift plan); returns a PNG preview, float lengths and an app link |
| `export_weave_pattern` | Write or return a `.wif`, lift-plan `.wif` or `.weave.json` |
| `read_weave_file` | Read a `.wif`/`.weave.json` into editable pattern fields |

After `npm install`, add it to an MCP client. Claude Code:

```sh
claude mcp add weave-patterner -- /path/to/weave-patterner/node_modules/.bin/tsx /path/to/weave-patterner/mcp/index.ts
```

Claude Desktop, Cursor and others (`mcpServers` in their config file):

```json
{
  "mcpServers": {
    "weave-patterner": {
      "command": "/path/to/weave-patterner/node_modules/.bin/tsx",
      "args": ["/path/to/weave-patterner/mcp/index.ts"]
    }
  }
}
```

Files are read and written relative to the client's working directory. Set `WEAVE_APP_URL` to point links at another
copy of the app.

## Licence

[MIT](LICENSE) © Stephen Skidmore

Pushing to `main` deploys to GitHub Pages via `.github/workflows/deploy.yml`.
