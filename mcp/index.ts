// Entry point: runs the Weave Patterner MCP server over stdio.
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { createServer } from './server'

await createServer().connect(new StdioServerTransport())
