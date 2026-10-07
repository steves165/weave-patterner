# Weave Patterner

A weaving draft editor: set the threading, tie-up and treadling, pick warp and weft colours, and see the drawdown update live. Patterns can be saved in the browser (up to 200) or exported and imported as `.weave.json` files. An example is in `samples/`.

For looms and other weaving software, Export also writes [WIF](https://www.mhsoft.com/wif/wif.html) 1.1 files, either with tie-up and treadling or as a lift plan for computer-dobby looms. Import reads WIF files too.

```sh
npm install
npm run dev     # local dev server
npm run build   # production build in dist/
npm test        # unit tests (Vitest)
npm run lint    # Biome lint + format check (npm run format to fix)
```

The Print button prints the draft in the classic layout (threading, tie-up, treadling and drawdown with numbered
ticks every 4 threads).

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
