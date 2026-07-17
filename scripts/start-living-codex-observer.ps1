$ErrorActionPreference = "Stop"

try {
    Invoke-RestMethod "http://127.0.0.1:2460/snapshot" -TimeoutSec 1 | Out-Null
    exit 0
} catch {
    # Start the observer below.
}

$node = if ($env:CODEX_NODE) {
    $env:CODEX_NODE
} elseif (Get-Command node -ErrorAction SilentlyContinue) {
    (Get-Command node).Source
} else {
    Join-Path $HOME ".cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
}

if (-not (Test-Path $node)) { throw "Node.js was not found. Set CODEX_NODE to node.exe." }
Start-Process -FilePath $node -ArgumentList (Join-Path $PSScriptRoot "living-codex-observer.mjs") -WindowStyle Hidden
