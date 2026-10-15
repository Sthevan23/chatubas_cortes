# Upload dist/site e dist/painel para Hostinger via FTP.
# Copie deploy.hostinger.example.json -> deploy.hostinger.json e preencha (não commitar).
param(
  [string]$ConfigPath = (Join-Path $PSScriptRoot "..\deploy.hostinger.json")
)

$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")

if (-not (Test-Path $ConfigPath)) {
  Write-Error "Crie deploy.hostinger.json (veja deploy.hostinger.example.json)."
}

$cfg = Get-Content $ConfigPath -Raw | ConvertFrom-Json
$required = @("host", "user", "password", "siteRemotePath", "painelRemotePath")
foreach ($k in $required) {
  if (-not $cfg.$k) { Write-Error "deploy.hostinger.json: falta '$k'." }
}

function Upload-FtpFile {
  param([string]$LocalPath, [string]$RemoteUri, [string]$User, [string]$Pass)
  $uri = [System.Uri]$RemoteUri
  $request = [System.Net.FtpWebRequest]::Create($uri)
  $request.Method = [System.Net.WebRequestMethods+Ftp]::UploadFile
  $request.Credentials = New-Object System.Net.NetworkCredential($User, $Pass)
  $request.UseBinary = $true
  $request.UsePassive = $true
  $bytes = [System.IO.File]::ReadAllBytes($LocalPath)
  $request.ContentLength = $bytes.Length
  $stream = $request.GetRequestStream()
  $stream.Write($bytes, 0, $bytes.Length)
  $stream.Close()
  $response = $request.GetResponse()
  $response.Close()
}

function Ensure-FtpDirectory {
  param([string]$RemoteDirUri, [string]$User, [string]$Pass)
  try {
    $request = [System.Net.FtpWebRequest]::Create($RemoteDirUri)
    $request.Method = [System.Net.WebRequestMethods+Ftp]::MakeDirectory
    $request.Credentials = New-Object System.Net.NetworkCredential($User, $Pass)
    $request.UsePassive = $true
    $response = $request.GetResponse()
    $response.Close()
  } catch {
    # já existe
  }
}

function Upload-FtpTree {
  param(
    [string]$LocalDir,
    [string]$RemoteBase,
    [string]$User,
    [string]$Pass
  )
  $hostBase = "ftp://$($cfg.host)"
  $remoteBase = "$hostBase$RemoteBase".TrimEnd("/")
  Ensure-FtpDirectory -RemoteDirUri "$remoteBase/" -User $User -Pass $Pass

  Get-ChildItem -Path $LocalDir -Recurse -File | ForEach-Object {
    $rel = $_.FullName.Substring($LocalDir.Length).TrimStart("\")
    $remoteDir = ($rel -replace "\\", "/")
    $remoteDir = Split-Path $remoteDir -Parent
    if ($remoteDir -and $remoteDir -ne ".") {
      $parts = $remoteDir -split "/"
      $acc = $RemoteBase.TrimEnd("/")
      foreach ($p in $parts) {
        $acc = "$acc/$p"
        Ensure-FtpDirectory -RemoteDirUri "$hostBase$acc/" -User $User -Pass $Pass
      }
    }
    $remoteFile = "$remoteBase/$($rel -replace '\\', '/')"
    Write-Host "  -> $remoteFile"
    Upload-FtpFile -LocalPath $_.FullName -RemoteUri $remoteFile -User $User -Pass $Pass
  }
}

Write-Host "Prepare dist..."
Push-Location $root
npm run prepare:hostinger | Out-Host
Pop-Location

$siteLocal = Join-Path $root "dist\site"
$painelLocal = Join-Path $root "dist\painel"

Write-Host "Upload site -> $($cfg.siteRemotePath)"
Upload-FtpTree -LocalDir $siteLocal -RemoteBase $cfg.siteRemotePath -User $cfg.user -Pass $cfg.password

Write-Host "Upload painel -> $($cfg.painelRemotePath)"
Upload-FtpTree -LocalDir $painelLocal -RemoteBase $cfg.painelRemotePath -User $cfg.user -Pass $cfg.password

Write-Host "Deploy FTP concluido."
