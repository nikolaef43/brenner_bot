# BrennerBot Bootstrap Troubleshooting v0.1 (install.sh / install.ps1)

> **Scope**: Fix common failures when installing or upgrading the BrennerBot operator toolchain:
> - `brenner` (CLI)
> - `ntm` (Unix-only; requires `tmux`)
> - `cass`
> - `cm`
>
> See also: `README.md` (install commands) and `specs/toolchain.manifest.json` (pinned toolchain versions).

---

## 0) Quick diagnosis checklist (start here)

Run the built-in verifier:

```bash
brenner doctor
```

Machine-readable output (useful for CI or copy/paste into an issue):

```bash
brenner doctor --json
```

If you also want to check Agent Mail reachability:

```bash
brenner doctor --agent-mail
```

If `brenner` itself is not found, skip to **1) PATH / “command not found”**.

---

## 1) PATH / “command not found”

### macOS / Linux

By default, `install.sh` installs to:

- `~/.local/bin` (default), or
- your chosen `--dest <path>`, or
- `/usr/local/bin` if you used `--system`.

Quick checks:

```bash
echo "$PATH"
command -v brenner || which brenner
ls -la ~/.local/bin | grep -E "brenner|ntm|cass|cm" || true
```

Fix for the *current* shell session:

```bash
export PATH="$HOME/.local/bin:$PATH"
```

Persistent fix (recommended): re-run the installer with `--easy-mode`, which attempts to append the correct PATH line for:
- bash (`~/.bash_profile` or `~/.bashrc`)
- zsh (`~/.zshrc`)
- fish (`~/.config/fish/config.fish`)

```bash
curl -fsSL "https://raw.githubusercontent.com/Dicklesworthstone/brenner_bot/main/install.sh" \
  | bash -s -- --easy-mode --verify
```

If you use a different shell, add the equivalent PATH export manually.

### Windows

By default, `install.ps1` installs to `$HOME/.local/bin` and will:
- add that path to **User PATH** if you pass `-EasyMode`
- add it to the current process’ `$env:PATH` so the tools work immediately

Verify where `brenner.exe` was installed:

```powershell
Get-ChildItem -Path "$HOME/.local/bin" | Select-Object Name
```

If you didn’t use `-EasyMode`, either add the destination directory to PATH manually, or re-run the installer with `-EasyMode`:

```powershell
$Version = "0.1.0" # example
iwr "https://raw.githubusercontent.com/Dicklesworthstone/brenner_bot/v$Version/install.ps1" -OutFile install.ps1
pwsh -ExecutionPolicy Bypass -File .\install.ps1 -Version $Version -EasyMode -Verify
```

---

## 2) Installer verification failed (`--verify` / `-Verify`)

### macOS / Linux (`install.sh`)

`install.sh --verify` checks (at minimum):
- `brenner --help`
- `brenner doctor --json`
- `ntm deps -v` (unless `--skip-ntm`)
- `cass health` (unless `--skip-cass`)
- `cm --version` (unless `--skip-cm`)

Common causes:

- **No SHA256 tool available**: `install.sh` requires either `sha256sum` or `shasum`.
  - Linux: `sha256sum` is typically available via coreutils.
  - macOS: `shasum` is usually present.
- **`ntm deps` fails** because `tmux` (or another dependency) is missing. See **3) ntm / tmux**.

Run again with verbose logging:

```bash
curl -fsSL "https://raw.githubusercontent.com/Dicklesworthstone/brenner_bot/main/install.sh" \
  | bash -s -- --easy-mode --verify --verbose
```

### Windows (`install.ps1`)

`install.ps1 -Verify` runs:
- `brenner.exe --help`
- `cass.exe --version` (unless `-SkipCass`)
- `cm.exe --version` (unless `-SkipCm`)

If GitHub is blocked in your environment, use `-ArtifactUrl` + `-Checksum` (see **4) Proxies / restricted networks**).

---

## 3) ntm / tmux issues (macOS/Linux)

`ntm` is Unix-only and requires `tmux`.

Check:

```bash
ntm deps -v
```

If it reports `tmux` missing:

- macOS (Homebrew):
  ```bash
  brew install tmux
  ```
- Debian/Ubuntu:
  ```bash
  sudo apt-get update
  sudo apt-get install -y tmux
  ```

Then re-run:

```bash
ntm deps -v
```

If you do not want `ntm`, you can install without it:

```bash
curl -fsSL "https://raw.githubusercontent.com/Dicklesworthstone/brenner_bot/main/install.sh" \
  | bash -s -- --easy-mode --verify --skip-ntm
```

---

## 4) Proxies / restricted networks (curl/GitHub)

### macOS / Linux

`install.sh` uses `curl` and will typically respect:
- `HTTPS_PROXY` / `https_proxy`
- `HTTP_PROXY` / `http_proxy`
- `NO_PROXY` / `no_proxy`

Example:

```bash
export HTTPS_PROXY="http://proxy.mycompany.com:8080"
export HTTP_PROXY="http://proxy.mycompany.com:8080"
export NO_PROXY="127.0.0.1,localhost"
```

If GitHub is unreachable from the install target, you can do a CI/offline-style install using a local artifact:

```bash
./install.sh --artifact-url "file:///abs/path/to/brenner-linux-x64" --checksum "<sha256-hex>" --verify
```

### Windows

If GitHub API access is blocked, prefer an offline install:

```powershell
pwsh -ExecutionPolicy Bypass -File .\install.ps1 `
  -ArtifactUrl "file:///C:/path/to/brenner-win-x64.exe" `
  -Checksum "<sha256-hex>" `
  -EasyMode -Verify
```

---

## 5) macOS Gatekeeper / quarantine prompts

If you see warnings like “cannot be opened because the developer cannot be verified”, the binary may be quarantined.

Typical recovery options:
- Open via Finder and approve in System Settings → Privacy & Security, or
- Remove quarantine attribute (advanced; do this only if you trust the source):

```bash
xattr -dr com.apple.quarantine ~/.local/bin/brenner
```

---

## 6) Upgrade workflow (recommended)

The safest upgrade is to re-run the installer pinned to a release tag.

If `brenner` is already installed, this prints the canonical commands:

```bash
brenner upgrade
```

Pinned upgrade example (macOS/Linux):

```bash
export VERSION="0.1.0" # example
curl -fsSL "https://raw.githubusercontent.com/Dicklesworthstone/brenner_bot/v${VERSION}/install.sh" \
  | bash -s -- --version "${VERSION}" --easy-mode --verify
```

Windows example:

```powershell
$Version = "0.1.0" # example
iwr "https://raw.githubusercontent.com/Dicklesworthstone/brenner_bot/v$Version/install.ps1" -OutFile install.ps1
pwsh -ExecutionPolicy Bypass -File .\install.ps1 -Version $Version -EasyMode -Verify
```

Notes:
- `install.sh` overwrites the destination binary (`mv -f`) after checksum verification.
- `install.ps1` overwrites installed executables via `Copy-Item -Force` after checksum verification.

---

## 7) For maintainers: how versions are pinned

Pinned versions and verify commands are defined in:

- `specs/toolchain.manifest.json`

Installers and `brenner doctor` consult this manifest so:
- installs are reproducible by tag
- verify commands are consistent across platforms
