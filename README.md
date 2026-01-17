# dep-drift-sec

**Production-grade security and stability guardrails for your Node.js dependencies.**

`dep-drift-sec` is an open-source CLI tool designed to prevent production breakage and identify supply-chain risks. It bridges the gap between basic vulnerability scanners and manual audits by focusing on **dependency drift**, **transitive relationships**, and **maintenance heuristics**.

> [!NOTE]
> The CLI is open-source and works entirely offline/locally without any mandatory backend service.

---

## Key Features

- **Drift Protection**: Detects flexible version ranges (`^`, `~`) in `package.json` and transitive version conflicts that cause "works on my machine" bugs.
- **Transitive Visibility**: Explicitly surfaces the full dependency chain for every risky package found.
- **Maintenance Heuristics**: 
  - **Unmaintained**: Identifies packages not updated in the last 18 months.
  - **Deprecated**: Alerts on packages officially marked as deprecated by maintainers.
  - **Single-Maintainer**: Highlights potential single-point-of-failure risks in your supply chain.
- **CI/CD Ready**: Machine-readable JSON output and standardized exit codes for easy pipeline integration.

---

## Getting Started

### Installation (Development)
```bash
npm install
npm run build
```

### Usage

#### Using `npx` (Recommended for CI/Production)
```bash
# Run a check on the current directory
npx dep-drift-sec check

# Run with JSON output and SaaS-ready flag
npx dep-drift-sec check --json --upload

# Check a specific project path
npx dep-drift-sec check --path ./my-project
```

#### Using Local Scripts
```bash
# Quick scan (requires local build)
npm run scan

# Direct execution
node dist/cli/index.js check
```

---

## Scan Results Contract (v1.0)

When run with `--json`, the CLI produces a versioned, stable JSON structure.

### Example Output
```json
{
  "meta": {
    "schemaVersion": "1.0",
    "scanId": "550e8400-e29b-41d4-a716-446655440000",
    "projectName": "my-project",
    "projectId": "a3f5b2c...",
    "generatedAt": "2026-01-17T20:55:00Z"
  },
  "summary": {
    "driftCount": 0,
    "securityCount": 1,
    "riskLevel": "medium",
    "riskReason": "1 dependency has security or drift issues, increasing breakage and security risk.",
    "recommendedAction": "warn",
    "recommendedExitCode": 2
  },
  "drift": [],
  "security": [
    {
      "dependencyName": "example-pkg",
      "transitive": true,
      "introducedBy": ["direct-parent"],
      "description": "An example package",
      "issues": [
        {
          "type": "unmaintained",
          "reason": "Last update was 70 months ago.",
          "riskLevel": "medium",
          "details": { "lastUpdate": "2020-03-04" }
        }
      ],
      "overallRisk": "medium"
    }
  ]
}
```

---

## CI/CD Integration (Exit Codes)

| Code | Meaning | Outcome |
| :--- | :--- | :--- |
| `0` | **OK** | No drift or security issues found. |
| `1` | **Drift Detected** | Version ranges found in `package.json`. |
| `2` | **Security Issue** | Heuristics triggered (unmaintained, etc). |
| `3` | **Mixed Issues** | Both drift and security issues present. |
| `4` | **Internal Error** | Missing files or runtime failure. |

---

## License

MIT - See [LICENSE](./LICENSE) for details.
