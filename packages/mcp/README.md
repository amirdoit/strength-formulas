# strength-formulas-mcp

An [MCP](https://modelcontextprotocol.io) server that gives AI agents exact strength-sport math instead of letting them guess.

```json
{
  "mcpServers": {
    "strength-formulas": { "command": "npx", "args": ["-y", "strength-formulas-mcp"] }
  }
}
```

Claude Code: `claude mcp add strength-formulas -- npx -y strength-formulas-mcp`

Tools (all read-only, no network): `strength_scores` (Wilks, Wilks-2020, DOTS, IPF GL, IPF Points), `estimate_one_rep_max`, `weight_for_reps`, `plate_loading`, `convert_weight`.

Source, tests and verification details: https://github.com/amirdoit/strength-formulas. MIT licensed.
