[CmdletBinding()]
param(
  [Parameter(Mandatory = $false)]
  [string]$Version = "patch",

  [Parameter(Mandatory = $false)]
  [string]$Remote = "origin"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Invoke-Step {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Message,

    [Parameter(Mandatory = $true)]
    [scriptblock]$Action
  )

  Write-Host "==> $Message" -ForegroundColor Cyan
  & $Action
}

function Assert-CommandExists {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Name
  )

  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required command '$Name' was not found in PATH."
  }
}

function Invoke-Checked {
  param(
    [Parameter(Mandatory = $true)]
    [string]$FilePath,

    [Parameter(Mandatory = $false)]
    [string[]]$Arguments = @()
  )

  & $FilePath @Arguments
  if ($LASTEXITCODE -ne 0) {
    $joined = if ($Arguments.Length -gt 0) { " $($Arguments -join ' ')" } else { "" }
    throw "Command failed: $FilePath$joined"
  }
}

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $repoRoot

Assert-CommandExists -Name "git"
Assert-CommandExists -Name "npm"
Assert-CommandExists -Name "npx"

$gitStatus = git status --porcelain
if ($LASTEXITCODE -ne 0) {
  throw "Unable to read git status."
}

if ($gitStatus) {
  throw "Working tree is not clean. Commit or stash existing changes before running release.ps1."
}

$packageJsonPath = Join-Path $repoRoot "package.json"
$packageJson = Get-Content -Raw -Path $packageJsonPath | ConvertFrom-Json
$startingVersion = [string]$packageJson.version

Invoke-Step -Message "Bumping version ($Version)" -Action {
  Invoke-Checked -FilePath "npm" -Arguments @("version", $Version, "--no-git-tag-version")
}

$updatedPackageJson = Get-Content -Raw -Path $packageJsonPath | ConvertFrom-Json
$newVersion = [string]$updatedPackageJson.version
$tagName = "v$newVersion"
$vsixFile = "{0}-{1}.vsix" -f $updatedPackageJson.name, $newVersion
$vsixPath = Join-Path $repoRoot $vsixFile

Invoke-Step -Message "Running compile" -Action {
  Invoke-Checked -FilePath "npm" -Arguments @("run", "compile")
}

Invoke-Step -Message "Running lint" -Action {
  Invoke-Checked -FilePath "npm" -Arguments @("run", "lint")
}

Invoke-Step -Message "Packaging VSIX" -Action {
  Invoke-Checked -FilePath "npm" -Arguments @("run", "package")
}

if (-not (Test-Path -Path $vsixPath)) {
  throw "Expected VSIX was not produced: $vsixPath"
}

Invoke-Step -Message "Committing release version files" -Action {
  Invoke-Checked -FilePath "git" -Arguments @("add", "package.json", "package-lock.json")
  Invoke-Checked -FilePath "git" -Arguments @("commit", "-m", "Release $tagName")
}

Invoke-Step -Message "Creating git tag $tagName" -Action {
  Invoke-Checked -FilePath "git" -Arguments @("tag", $tagName)
}

Invoke-Step -Message "Pushing commit to $Remote" -Action {
  Invoke-Checked -FilePath "git" -Arguments @("push", $Remote, "HEAD")
}

Invoke-Step -Message "Pushing tag $tagName to $Remote" -Action {
  Invoke-Checked -FilePath "git" -Arguments @("push", $Remote, $tagName)
}

Invoke-Step -Message "Publishing VSIX to the Visual Studio Code Marketplace" -Action {
  Invoke-Checked -FilePath "npx" -Arguments @("vsce", "publish", "--packagePath", $vsixPath)
}

Write-Host "Release completed successfully." -ForegroundColor Green
Write-Host "Version: $startingVersion -> $newVersion"
Write-Host "Tag: $tagName"
Write-Host "VSIX: $vsixPath"
if (-not $env:VSCE_PAT) {
  Write-Host "Note: vsce publish used your existing authentication context. Set VSCE_PAT if you prefer token-based publishing." -ForegroundColor Yellow
}
