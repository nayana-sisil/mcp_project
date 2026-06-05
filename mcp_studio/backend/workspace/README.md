# Welcome to MCP Studio

This is the sandboxed workspace for MCP Studio. Anything you put here
can be read, edited, and deleted by the MCP tools, by the REST API,
and by the file browser in the UI.

Try:

- Open the **Files** page in the sidebar and edit this file.
- Open the **Chat** page and ask: *"List the files in the workspace"*
  - the AI host will call `list_files` and report the result.
- Open the **Tools** page and call `read_file` with `filepath =
  "README.md"`.
- From any MCP client (Claude Desktop, the MCP Inspector, etc.) connect
  to the studio's `/mcp/mcp` streamable HTTP endpoint to drive the
  same tools over the standard MCP protocol.
