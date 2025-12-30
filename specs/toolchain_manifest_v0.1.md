# Brenner Toolchain Manifest v0.1

> **Status**: Draft specification
> **Purpose**: Portable manifest format for installing and verifying the operator toolchain
> **Consumers**: install.sh (bash), install.ps1 (PowerShell), `brenner doctor --json` (TypeScript/Bun)

---

## Overview

The toolchain manifest defines:
1. Which tools are required for a Brenner Bot operator workstation
2. Pinned versions for each tool
3. How to install each tool (release binary or upstream installer)
4. How to verify each tool is correctly installed

### Design Goals

1. **Bash-parseable without jq**: Operators may not have jq installed yet
2. **PowerShell-native**: No extra modules required
3. **TypeScript-trivial**: Standard JSON.parse
4. **Single source of truth**: One manifest file, multiple consumers

---

## Manifest Format

The manifest uses **flat JSON** with a deliberate structure that enables bash parsing via grep/sed.

### File Location

```
specs/toolchain.manifest.json
```

### Schema

```json
{
  "manifest_version": "0.1.0",
  "min_bun_version": "1.1.0",

  "tools": {
    "brenner": {
      "version": "0.1.0",
      "install_strategy": "release_binary",
      "release_url_template": "https://github.com/Dicklesworthstone/brenner_bot/releases/download/v${VERSION}/brenner-${OS}-${ARCH}",
      "checksum_url_template": "https://github.com/Dicklesworthstone/brenner_bot/releases/download/v${VERSION}/brenner-${OS}-${ARCH}.sha256",
      "verify_command": "brenner doctor --json",
      "verify_success": "exit_code_zero",
      "platforms": ["linux-x64", "darwin-arm64", "darwin-x64", "win-x64"]
    },
    "ntm": {
      "version": "0.3.0",
      "install_strategy": "upstream_installer",
      "install_url": "https://raw.githubusercontent.com/anthropics/ntm/v0.3.0/install.sh",
      "install_args": "--version 0.3.0",
      "verify_command": "ntm version",
      "verify_success": "exit_code_zero",
      "platforms": ["linux-x64", "darwin-arm64", "darwin-x64"]
    },
    "cass": {
      "version": "0.4.0",
      "install_strategy": "upstream_installer",
      "install_url": "https://raw.githubusercontent.com/anthropics/cass/v0.4.0/install.sh",
      "install_args": "--easy-mode --verify",
      "verify_command": "cass health",
      "verify_success": "exit_code_zero",
      "platforms": ["linux-x64", "darwin-arm64", "darwin-x64", "win-x64"]
    },
    "cm": {
      "version": "0.2.0",
      "install_strategy": "upstream_installer",
      "install_url": "https://raw.githubusercontent.com/anthropics/cass-memory/v0.2.0/install.sh",
      "install_args": "--easy-mode --verify",
      "verify_command": "cm --version",
      "verify_success": "exit_code_zero",
      "platforms": ["linux-x64", "darwin-arm64", "darwin-x64", "win-x64"]
    }
  }
}
```

---

## Field Definitions

### Top-Level Fields

| Field | Type | Description |
|-------|------|-------------|
| `manifest_version` | string | Manifest schema version (semver) |
| `min_bun_version` | string | Minimum required Bun version |
| `tools` | object | Map of tool name to tool spec |

### Tool Spec Fields

| Field | Type | Description |
|-------|------|-------------|
| `version` | string | Pinned version (semver, no 'v' prefix) |
| `install_strategy` | enum | `release_binary` or `upstream_installer` |
| `release_url_template` | string | URL template for direct binary download |
| `checksum_url_template` | string | URL template for SHA256 checksum file |
| `install_url` | string | URL to upstream installer script |
| `install_args` | string | Arguments to pass to upstream installer |
| `verify_command` | string | Command to run for verification |
| `verify_success` | enum | `exit_code_zero` (more options later) |
| `platforms` | array | Supported platform strings |

### Platform Strings

| String | OS | Architecture |
|--------|-----|--------------|
| `linux-x64` | Linux | x86_64 |
| `darwin-arm64` | macOS | Apple Silicon |
| `darwin-x64` | macOS | Intel |
| `win-x64` | Windows | x86_64 |

### URL Template Variables

| Variable | Description | Example Values |
|----------|-------------|----------------|
| `${VERSION}` | Tool version (no 'v' prefix) | `0.1.0` |
| `${OS}` | Operating system | `linux`, `darwin`, `win` |
| `${ARCH}` | Architecture | `x64`, `arm64` |

---

## Install Strategies

### Strategy: `release_binary`

Download a pre-built binary directly from GitHub releases.

**Steps:**
1. Compute platform string from OS/arch
2. Substitute variables in `release_url_template`
3. Download binary to temp location
4. If `checksum_url_template` provided:
   - Download checksum file
   - Verify SHA256 matches
5. Move binary to `~/.local/bin/` (Unix) or `%LOCALAPPDATA%\brenner\bin\` (Windows)
6. Make executable (Unix)
7. Run verify command

**Checksum Verification:**
```bash
# Linux
sha256sum -c brenner-linux-x64.sha256

# macOS
shasum -a 256 -c brenner-darwin-arm64.sha256
```

### Strategy: `upstream_installer`

Delegate to the tool's own installer script at a pinned version.

**Steps:**
1. Fetch installer from `install_url` (must be at pinned tag)
2. Pipe to bash with `install_args`
3. Run verify command

**Security Note:** We pin to a specific tag URL (not `main` or `latest`) to ensure reproducibility.

---

## Verification Contract

Each tool must define a `verify_command` that:
1. Exits with code 0 on success
2. Can be run immediately after install
3. Does not require interactive input
4. Completes within 10 seconds

### Per-Tool Verification

| Tool | Command | Success Criteria |
|------|---------|------------------|
| `brenner` | `brenner doctor --json` | Exit 0, valid JSON with `status: "ok"` |
| `ntm` | `ntm version` | Exit 0, outputs version string |
| `cass` | `cass health` | Exit 0, outputs health status |
| `cm` | `cm --version` | Exit 0, outputs version string |

### Future: Structured Verification

The `verify_success` field currently only supports `exit_code_zero`. Future options:
- `output_contains: "string"` - stdout must contain string
- `json_field_equals: {"path": "$.status", "value": "ok"}` - JSON output validation

---

## Bash Parsing Helper

Since bash cannot natively parse JSON, provide a helper function:

```bash
#!/bin/bash
# manifest_get - Extract value from flat JSON manifest
# Usage: manifest_get tools.brenner.version

manifest_get() {
    local key="$1"
    local manifest="${2:-specs/toolchain.manifest.json}"

    # Convert dot notation to grep pattern
    # e.g., "tools.brenner.version" -> grep for "version": "X.Y.Z" in brenner block

    local parts=()
    IFS='.' read -ra parts <<< "$key"

    case "${#parts[@]}" in
        1)
            # Top-level key: manifest_version, min_bun_version
            grep -o "\"${parts[0]}\": *\"[^\"]*\"" "$manifest" | head -1 | cut -d'"' -f4
            ;;
        2)
            # tools.TOOL - get entire tool block (not typically needed)
            echo "Error: Use tools.TOOL.FIELD" >&2
            return 1
            ;;
        3)
            # tools.TOOL.FIELD - most common case
            local tool="${parts[1]}"
            local field="${parts[2]}"
            # Find tool block and extract field
            sed -n "/\"$tool\": {/,/^    }/p" "$manifest" | \
                grep -o "\"$field\": *\"[^\"]*\"" | head -1 | cut -d'"' -f4
            ;;
        *)
            echo "Error: Invalid key depth" >&2
            return 1
            ;;
    esac
}

# Example usage:
# VERSION=$(manifest_get tools.brenner.version)
# VERIFY=$(manifest_get tools.ntm.verify_command)
```

**Limitation:** This helper only extracts string values, not arrays or nested objects. For `platforms` arrays, use a separate function or require the caller to handle them specially.

---

## PowerShell Usage

PowerShell can parse JSON natively:

```powershell
$manifest = Get-Content specs/toolchain.manifest.json | ConvertFrom-Json
$brennerVersion = $manifest.tools.brenner.version
$verifyCmd = $manifest.tools.ntm.verify_command
```

---

## TypeScript Usage

```typescript
import manifest from '../specs/toolchain.manifest.json';

const brennerVersion = manifest.tools.brenner.version;
const ntmPlatforms = manifest.tools.ntm.platforms;
```

Or with validation:
```typescript
import { z } from 'zod';

const ToolSpecSchema = z.object({
  version: z.string(),
  install_strategy: z.enum(['release_binary', 'upstream_installer']),
  verify_command: z.string(),
  verify_success: z.enum(['exit_code_zero']),
  platforms: z.array(z.string()),
  // Optional fields based on strategy
  release_url_template: z.string().optional(),
  checksum_url_template: z.string().optional(),
  install_url: z.string().optional(),
  install_args: z.string().optional(),
});

const ManifestSchema = z.object({
  manifest_version: z.string(),
  min_bun_version: z.string(),
  tools: z.record(ToolSpecSchema),
});
```

---

## Platform Constraints

| Tool | Windows | Note |
|------|---------|------|
| `ntm` | No | tmux not available on Windows |
| `cass` | Yes | |
| `cm` | Yes | |
| `brenner` | Yes | |

The installer should skip `ntm` on Windows and document this limitation.

---

## Version Pinning Policy

1. **Exact versions only**: No `^` or `~` ranges
2. **Update via PR**: Version bumps require code review
3. **Changelog check**: Before updating, review upstream changelog for breaking changes
4. **CI verification**: Updates should trigger installer e2e tests

---

## Acceptance Criteria

- [x] Manifest format defined (JSON with bash-extractable structure)
- [x] Per-tool install strategy documented (`release_binary`, `upstream_installer`)
- [x] Verification commands specified per tool
- [x] Platform constraints documented
- [x] Initial manifest file created at `specs/toolchain.manifest.json`
- [ ] Bash helper function tested (deferred to installer implementation)
- [ ] Integration with `install.sh` (separate bead: brenner_bot-5so.11.2.1)

---

## Related Beads

- **brenner_bot-5so.11.1**: Parent - pin toolchain versions
- **brenner_bot-5so.11.1.1**: Define schema + initial pinned versions (blocked by this)
- **brenner_bot-5so.11.2.1**: Implement install.sh (uses this manifest)
- **brenner_bot-5so.5.5.3**: Define release artifact matrix (related)
