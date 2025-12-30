Param(
  [string]$Version = "latest",
  [string]$Dest = "$HOME/.local/bin",
  [string]$Owner = "Dicklesworthstone",
  [string]$Repo = "brenner_bot",
  [string]$Checksum = "",
  [string]$ChecksumUrl = "",
  [string]$ArtifactUrl = "",
  [switch]$EasyMode,
  [switch]$Verify,
  [switch]$SkipCass,
  [switch]$SkipCm,
  [switch]$SkipNtm
)

$ErrorActionPreference = "Stop"

function Info([string]$Message) { Write-Host "→ $Message" }
function Warn([string]$Message) { Write-Host "WARN: $Message" -ForegroundColor Yellow }
function Fail([string]$Message) { Write-Error $Message; exit 1 }

function Is-Windows {
  if ($env:OS -eq "Windows_NT") { return $true }
  if ($PSVersionTable.PSEdition -eq "Desktop") { return $true }
  if ($PSVersionTable.Platform -eq "Win32NT") { return $true }
  return $false
}

function Normalize-VersionTag([string]$Raw) {
  if (-not $Raw) { return "" }
  if ($Raw.StartsWith("v")) { return $Raw }
  return "v$Raw"
}

function Resolve-LatestReleaseTag([string]$Owner, [string]$Repo) {
  $latestUrl = "https://api.github.com/repos/$Owner/$Repo/releases/latest"
  try {
    $resp = Invoke-RestMethod -Uri $latestUrl -Headers @{
      Accept     = "application/vnd.github+json"
      User-Agent = "brenner-install.ps1"
    }
    if (-not $resp.tag_name) { throw "No tag_name in response" }
    return $resp.tag_name
  } catch {
    Fail "Failed to resolve latest release tag from GitHub API ($latestUrl). Set -Version or -ArtifactUrl. Error: $($_.Exception.Message)"
  }
}

function Ensure-Directory([string]$Path) {
  if (-not (Test-Path $Path)) {
    New-Item -ItemType Directory -Force -Path $Path | Out-Null
  }
}

function Get-LocalPathFromFileUrl([string]$Url) {
  try {
    $uri = [Uri]$Url
    if ($uri.Scheme -eq "file" -and $uri.LocalPath) {
      return $uri.LocalPath
    }
  } catch {
    # fall back to manual parsing
  }

  $path = $Url.Substring("file://".Length)
  if ($path -match '^/+[A-Za-z]:/') {
    $path = $path.TrimStart("/")
  }
  return $path
}

function Ensure-DestOnPath([string]$Dest, [switch]$EasyMode) {
  $destAbs = (Resolve-Path $Dest).Path
  $userPath = [Environment]::GetEnvironmentVariable("PATH", "User")
  if (-not $userPath) { $userPath = "" }

  $parts = $userPath.Split(";", [System.StringSplitOptions]::RemoveEmptyEntries) | ForEach-Object { $_.Trim() }
  $already = $parts | Where-Object { $_ -ieq $destAbs } | Select-Object -First 1

  if (-not $already) {
    if ($EasyMode) {
      $newPath = if ($userPath.Trim()) { "$userPath;$destAbs" } else { $destAbs }
      [Environment]::SetEnvironmentVariable("PATH", $newPath, "User")
      $env:PATH = "$env:PATH;$destAbs"
      Info "Added $destAbs to PATH (User)"
    } else {
      Warn "Add $destAbs to your PATH to use installed tools."
    }
  } else {
    $env:PATH = "$env:PATH;$destAbs"
  }
}

function Parse-Sha256([string]$Content) {
  if (-not $Content) { return "" }
  $trimmed = $Content.Trim()
  $firstToken = $trimmed.Split([char[]]" `t`r`n", [System.StringSplitOptions]::RemoveEmptyEntries)[0]
  return $firstToken
}

function Fetch-Text([string]$Url) {
  if ($Url -like "file://*") {
    $localPath = Get-LocalPathFromFileUrl $Url
    if (-not (Test-Path $localPath)) { Fail "Local file not found: $localPath" }
    return Get-Content -Raw -Path $localPath
  }
  try {
    return (Invoke-WebRequest -Uri $Url -UseBasicParsing).Content
  } catch {
    # PowerShell 6+ may not support -UseBasicParsing
    return (Invoke-WebRequest -Uri $Url).Content
  }
}

function Download-File([string]$Url, [string]$OutFile) {
  Info "Downloading $Url"
  if ($Url -like "file://*") {
    $localPath = Get-LocalPathFromFileUrl $Url
    if (-not (Test-Path $localPath)) { Fail "Local file not found: $localPath" }
    Copy-Item -Path $localPath -Destination $OutFile -Force
    return
  }
  try {
    Invoke-WebRequest -Uri $Url -OutFile $OutFile -UseBasicParsing
  } catch {
    Invoke-WebRequest -Uri $Url -OutFile $OutFile
  }
}

function Verify-Sha256([string]$FilePath, [string]$ExpectedHex) {
  $hash = (Get-FileHash -Path $FilePath -Algorithm SHA256).Hash.ToLower()
  if ($hash -ne $ExpectedHex.ToLower()) {
    Fail "Checksum mismatch for $FilePath. Expected $ExpectedHex, got $hash."
  }
}

function Read-JsonFromUrl([string]$Url) {
  $raw = Fetch-Text $Url
  return $raw | ConvertFrom-Json
}

function Resolve-ToolchainManifest([string]$Owner, [string]$Repo, [string]$Tag) {
  $tagUrl = "https://raw.githubusercontent.com/$Owner/$Repo/$Tag/specs/toolchain.manifest.json"
  try {
    return Read-JsonFromUrl $tagUrl
  } catch {
    Fail "Failed to fetch toolchain manifest from $tagUrl. Error: $($_.Exception.Message)"
  }
}

function Install-Brenner(
  [string]$Owner,
  [string]$Repo,
  [string]$VersionTag,
  [string]$Dest,
  [string]$ArtifactUrl,
  [string]$Checksum,
  [string]$ChecksumUrl
) {
  $artifactName = "brenner-win-x64.exe"
  $url = if ($ArtifactUrl) { $ArtifactUrl } else { "https://github.com/$Owner/$Repo/releases/download/$VersionTag/$artifactName" }

  $checksumToUse = $Checksum
  if (-not $checksumToUse) {
    if (-not $ChecksumUrl) { $ChecksumUrl = "$url.sha256" }
    Info "Fetching checksum from $ChecksumUrl"
    try {
      $checksumToUse = Parse-Sha256 (Fetch-Text $ChecksumUrl)
    } catch {
      Fail "Checksum file not found or invalid; refusing to install brenner. Error: $($_.Exception.Message)"
    }
  }

  $tmpDir = Join-Path ([System.IO.Path]::GetTempPath()) ("brenner-install-" + [System.Guid]::NewGuid().ToString("n"))
  Ensure-Directory $tmpDir
  $tmpExe = Join-Path $tmpDir $artifactName

  try {
    Download-File $url $tmpExe
    Verify-Sha256 $tmpExe $checksumToUse

    Ensure-Directory $Dest
    $destExe = Join-Path $Dest "brenner.exe"
    Copy-Item -Path $tmpExe -Destination $destExe -Force
    Info "Installed brenner to $destExe"
  } finally {
    try { Remove-Item -Recurse -Force $tmpDir } catch { }
  }
}

function Install-Cass([string]$VersionTag, [string]$Dest) {
  $owner = "Dicklesworthstone"
  $repo = "coding_agent_session_search"
  $apiUrl = "https://api.github.com/repos/$owner/$repo/releases/tags/$VersionTag"

  $release = Invoke-RestMethod -Uri $apiUrl -Headers @{
    Accept     = "application/vnd.github+json"
    User-Agent = "brenner-install.ps1"
  }
  $asset = $release.assets | Where-Object { $_.name -like "*windows-msvc.zip" } | Select-Object -First 1
  if (-not $asset) {
    Fail "Could not find Windows zip asset for cass in $apiUrl"
  }

  $url = $asset.browser_download_url
  $checksumUrl = "$url.sha256"

  $tmpDir = Join-Path ([System.IO.Path]::GetTempPath()) ("cass-install-" + [System.Guid]::NewGuid().ToString("n"))
  Ensure-Directory $tmpDir
  $zipFile = Join-Path $tmpDir $asset.name

  try {
    Download-File $url $zipFile

    Info "Fetching checksum from $checksumUrl"
    $checksumToUse = Parse-Sha256 (Fetch-Text $checksumUrl)
    if (-not $checksumToUse) { Fail "Checksum file invalid for cass: $checksumUrl" }
    Verify-Sha256 $zipFile $checksumToUse

    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $extractDir = Join-Path $tmpDir "extract"
    [System.IO.Compression.ZipFile]::ExtractToDirectory($zipFile, $extractDir)

    $bin = Get-ChildItem -Path $extractDir -Recurse -Filter "cass.exe" | Select-Object -First 1
    if (-not $bin) {
      $bin = Get-ChildItem -Path $extractDir -Recurse -Filter "coding-agent-search.exe" | Select-Object -First 1
      if ($bin) { Warn "Found coding-agent-search.exe instead of cass.exe; installing as cass.exe" }
    }
    if (-not $bin) { Fail "cass.exe not found inside downloaded zip." }

    Ensure-Directory $Dest
    $destExe = Join-Path $Dest "cass.exe"
    Copy-Item -Path $bin.FullName -Destination $destExe -Force
    Info "Installed cass to $destExe"
  } finally {
    try { Remove-Item -Recurse -Force $tmpDir } catch { }
  }
}

function Install-Cm([string]$VersionTag, [string]$Dest) {
  $owner = "Dicklesworthstone"
  $repo = "cass_memory_system"
  $apiUrl = "https://api.github.com/repos/$owner/$repo/releases/tags/$VersionTag"

  $release = Invoke-RestMethod -Uri $apiUrl -Headers @{
    Accept     = "application/vnd.github+json"
    User-Agent = "brenner-install.ps1"
  }
  $asset = $release.assets | Where-Object { $_.name -like "*windows-x64.exe" } | Select-Object -First 1
  if (-not $asset) {
    Fail "Could not find Windows exe asset for cm in $apiUrl"
  }

  $url = $asset.browser_download_url
  $checksumUrl = "$url.sha256"

  $tmpDir = Join-Path ([System.IO.Path]::GetTempPath()) ("cm-install-" + [System.Guid]::NewGuid().ToString("n"))
  Ensure-Directory $tmpDir
  $tmpExe = Join-Path $tmpDir $asset.name

  try {
    Download-File $url $tmpExe

    Info "Fetching checksum from $checksumUrl"
    $checksumToUse = Parse-Sha256 (Fetch-Text $checksumUrl)
    if (-not $checksumToUse) { Fail "Checksum file invalid for cm: $checksumUrl" }
    Verify-Sha256 $tmpExe $checksumToUse

    Ensure-Directory $Dest
    $destExe = Join-Path $Dest "cm.exe"
    Copy-Item -Path $tmpExe -Destination $destExe -Force
    Info "Installed cm to $destExe"
  } finally {
    try { Remove-Item -Recurse -Force $tmpDir } catch { }
  }
}

function Verify-Command([string]$ExePath, [string[]]$Args) {
  Info ("Verifying: " + $ExePath + " " + ($Args -join " "))
  & $ExePath @Args | Write-Host
  if ($LASTEXITCODE -ne 0) {
    Fail "Verification failed: $ExePath exited with code $LASTEXITCODE"
  }
}

if (-not (Is-Windows)) {
  Fail "install.ps1 is intended for Windows. Use install.sh on macOS/Linux."
}

$versionTag = if ($ArtifactUrl) {
  if ($Version -and $Version -ne "latest") { Normalize-VersionTag $Version } else { "" }
} else {
  if (-not $Version -or $Version -eq "latest") {
    Resolve-LatestReleaseTag $Owner $Repo
  } else {
    Normalize-VersionTag $Version
  }
}

Info "Installing to $Dest"
Ensure-Directory $Dest

if (-not $SkipNtm) {
  Warn "ntm is not supported on Windows (requires tmux). Skipping."
}

if (-not $ArtifactUrl -and -not $versionTag) {
  Fail "No -Version provided and could not resolve latest release. Provide -Version or -ArtifactUrl."
}

if (-not $versionTag) {
  Info "Installing brenner from explicit artifact URL (no version tag)"
  Install-Brenner -Owner $Owner -Repo $Repo -VersionTag "v0.0.0" -Dest $Dest -ArtifactUrl $ArtifactUrl -Checksum $Checksum -ChecksumUrl $ChecksumUrl
} else {
  Info "Resolved brenner version: $versionTag"
  Install-Brenner -Owner $Owner -Repo $Repo -VersionTag $versionTag -Dest $Dest -ArtifactUrl $ArtifactUrl -Checksum $Checksum -ChecksumUrl $ChecksumUrl
}

$manifest = $null
if (-not $SkipCass -or -not $SkipCm) {
  if (-not $versionTag) {
    $manifest = Resolve-ToolchainManifest $Owner $Repo "main"
  } else {
    $manifest = Resolve-ToolchainManifest $Owner $Repo $versionTag
  }
}

if (-not $SkipCass) {
  $cassVersion = $manifest.tools.cass.version
  if (-not $cassVersion) { Fail "Toolchain manifest missing tools.cass.version" }
  $cassTag = Normalize-VersionTag $cassVersion
  Info "Installing cass $cassTag"
  Install-Cass -VersionTag $cassTag -Dest $Dest
} else {
  Info "Skipping cass"
}

if (-not $SkipCm) {
  $cmVersion = $manifest.tools.cm.version
  if (-not $cmVersion) { Fail "Toolchain manifest missing tools.cm.version" }
  $cmTag = Normalize-VersionTag $cmVersion
  Info "Installing cm $cmTag"
  Install-Cm -VersionTag $cmTag -Dest $Dest
} else {
  Info "Skipping cm"
}

Ensure-DestOnPath -Dest $Dest -EasyMode:$EasyMode

if ($Verify) {
  Verify-Command (Join-Path $Dest "brenner.exe") @("--help")
  if (-not $SkipCass) { Verify-Command (Join-Path $Dest "cass.exe") @("--version") }
  if (-not $SkipCm) { Verify-Command (Join-Path $Dest "cm.exe") @("--version") }
  Info "All verifications passed."
} else {
  Info "Install complete."
}
