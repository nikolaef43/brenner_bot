# Brenner Release Artifact Matrix v0.1

> **Status**: Draft specification
> **Purpose**: Define canonical release artifact naming, targets, and checksum layout
> **Consumers**: GitHub Actions workflow, install.sh, install.ps1, brenner doctor

---

## Overview

This spec defines the contract between:
1. **Producer**: GitHub Actions release workflow
2. **Consumers**: install.sh, install.ps1, `brenner doctor --json`
3. **Reference**: specs/toolchain.manifest.json

---

## Target Matrix

### Supported Platforms

| Platform | Bun Target | Artifact Name | Notes |
|----------|------------|---------------|-------|
| Linux x64 | `bun-linux-x64-baseline` | `brenner-linux-x64` | baseline for broad compatibility |
| Linux ARM64 | `bun-linux-arm64` | `brenner-linux-arm64` | for ARM servers (AWS Graviton, etc.) |
| macOS Apple Silicon | `bun-darwin-arm64` | `brenner-darwin-arm64` | M1/M2/M3/M4 Macs |
| macOS Intel | `bun-darwin-x64` | `brenner-darwin-x64` | Intel Macs |
| Windows x64 | `bun-windows-x64-baseline` | `brenner-win-x64.exe` | baseline for broad compatibility |

### Deferred (v0.2+)

| Platform | Bun Target | Reason |
|----------|------------|--------|
| Linux x64 modern | `bun-linux-x64` | Requires AVX2; defer until telemetry shows demand |
| Linux musl | `bun-linux-x64-musl` | Alpine/musl; defer until requested |
| Windows ARM64 | N/A | Bun doesn't support yet |

### Why `baseline` Targets

- `bun-linux-x64-baseline` and `bun-windows-x64-baseline` work on CPUs without AVX2
- Ensures compatibility with older hardware and VMs
- Modern CPUs still run baseline binaries correctly (just slightly slower)
- Production servers often run on VMs that don't expose AVX2

---

## Naming Conventions

### Binary Names

```
brenner-${OS}-${ARCH}[.exe]
```

| Variable | Values |
|----------|--------|
| `${OS}` | `linux`, `darwin`, `win` |
| `${ARCH}` | `x64`, `arm64` |
| `.exe` | Windows only |

### Examples

```
brenner-linux-x64
brenner-linux-arm64
brenner-darwin-arm64
brenner-darwin-x64
brenner-win-x64.exe
```

### Checksum Files

Each binary has a corresponding SHA256 checksum file:

```
brenner-${OS}-${ARCH}.sha256
brenner-win-x64.exe.sha256
```

### Checksum File Format

BSD-style checksum format (works with both `sha256sum -c` and `shasum -a 256 -c`):

```
SHA256 (brenner-linux-x64) = abc123def456...
```

Or GNU-style (simpler, but requires filename stripping):

```
abc123def456...  brenner-linux-x64
```

**Decision**: Use GNU-style for simplicity:
```
abc123def456789...  brenner-linux-x64
```

This allows:
```bash
# Linux
sha256sum -c brenner-linux-x64.sha256

# macOS
shasum -a 256 -c brenner-darwin-arm64.sha256
```

---

## Release Directory Layout

For each release tag `vX.Y.Z`:

```
releases/download/vX.Y.Z/
├── brenner-linux-x64
├── brenner-linux-x64.sha256
├── brenner-linux-arm64
├── brenner-linux-arm64.sha256
├── brenner-darwin-arm64
├── brenner-darwin-arm64.sha256
├── brenner-darwin-x64
├── brenner-darwin-x64.sha256
├── brenner-win-x64.exe
├── brenner-win-x64.exe.sha256
├── SHA256SUMS                    # Optional: combined checksums
└── install.sh                    # Installer script (also a release asset)
```

### SHA256SUMS (Optional)

A combined checksum file containing all binaries:

```
abc123...  brenner-linux-x64
def456...  brenner-linux-arm64
789abc...  brenner-darwin-arm64
...
```

Useful for batch verification but not required if per-file checksums exist.

---

## URL Templates

### Binary Download

```
https://github.com/Dicklesworthstone/brenner_bot/releases/download/v${VERSION}/brenner-${OS}-${ARCH}
```

### Checksum Download

```
https://github.com/Dicklesworthstone/brenner_bot/releases/download/v${VERSION}/brenner-${OS}-${ARCH}.sha256
```

### Platform Detection

The installer must map runtime environment to artifact names:

| `uname -s` | `uname -m` | Artifact |
|------------|------------|----------|
| `Linux` | `x86_64` | `brenner-linux-x64` |
| `Linux` | `aarch64` | `brenner-linux-arm64` |
| `Darwin` | `arm64` | `brenner-darwin-arm64` |
| `Darwin` | `x86_64` | `brenner-darwin-x64` |
| Windows | N/A | `brenner-win-x64.exe` |

---

## Build Commands

For the GitHub Actions workflow:

```yaml
# Linux x64
bun build --compile --minify \
  --target=bun-linux-x64-baseline \
  --outfile=brenner-linux-x64 \
  ./brenner.ts

# Linux ARM64
bun build --compile --minify \
  --target=bun-linux-arm64 \
  --outfile=brenner-linux-arm64 \
  ./brenner.ts

# macOS ARM64
bun build --compile --minify \
  --target=bun-darwin-arm64 \
  --outfile=brenner-darwin-arm64 \
  ./brenner.ts

# macOS x64
bun build --compile --minify \
  --target=bun-darwin-x64 \
  --outfile=brenner-darwin-x64 \
  ./brenner.ts

# Windows x64
bun build --compile --minify \
  --target=bun-windows-x64-baseline \
  --outfile=brenner-win-x64.exe \
  --windows-hide-console \
  ./brenner.ts
```

### Checksum Generation

```bash
# Generate checksum file
sha256sum brenner-linux-x64 > brenner-linux-x64.sha256
```

---

## Verification Contract

### Installer Verification

The installer must:
1. Download binary to temp location
2. Download corresponding `.sha256` file
3. Verify checksum matches
4. Only then move to final location and make executable

### `brenner doctor` Verification

`brenner doctor --json` must output:
```json
{
  "status": "ok",
  "version": "0.1.0",
  "platform": "darwin-arm64",
  "checks": {
    "brenner": {"status": "ok", "version": "0.1.0"},
    "ntm": {"status": "ok", "version": "0.3.0"},
    "cass": {"status": "ok", "version": "0.4.0"},
    "cm": {"status": "ok", "version": "0.2.0"},
    "bun": {"status": "ok", "version": "1.1.38"}
  }
}
```

---

## Integration with Toolchain Manifest

The `specs/toolchain.manifest.json` file references this matrix:

```json
{
  "tools": {
    "brenner": {
      "version": "0.1.0",
      "install_strategy": "release_binary",
      "release_url_template": "https://github.com/Dicklesworthstone/brenner_bot/releases/download/v${VERSION}/brenner-${OS}-${ARCH}",
      "checksum_url_template": "https://github.com/Dicklesworthstone/brenner_bot/releases/download/v${VERSION}/brenner-${OS}-${ARCH}.sha256",
      "platforms": ["linux-x64", "linux-arm64", "darwin-arm64", "darwin-x64", "win-x64"]
    }
  }
}
```

The `platforms` array must match this matrix exactly.

---

## Security Considerations

1. **Checksum verification is mandatory**: Installers must not skip verification
2. **HTTPS only**: All downloads must use HTTPS
3. **Pinned URLs**: No `latest` redirects; always use specific version tags
4. **Reproducible builds**: Same source + Bun version should produce identical binaries

---

## Acceptance Criteria

- [x] Target matrix defined with Bun compile targets
- [x] Naming scheme documented (`brenner-${OS}-${ARCH}`)
- [x] Checksum format specified (GNU-style sha256)
- [x] URL templates provided
- [x] Platform detection mapping documented
- [ ] GitHub Actions workflow implementation (brenner_bot-5so.5.5.4)
- [ ] install.sh implementation (brenner_bot-5so.11.2.1)

---

## Related Beads

- **brenner_bot-5so.5.5**: Parent - CLI single-binary build + release workflow
- **brenner_bot-5so.11.1.3**: Toolchain manifest (references this matrix) - CLOSED
- **brenner_bot-5so.5.5.4**: GitHub Actions release workflow - blocked by this
- **brenner_bot-5so.11.2.1**: install.sh implementation - blocked by this
- **brenner_bot-5so.11.2.2**: install.ps1 implementation - blocked by this
