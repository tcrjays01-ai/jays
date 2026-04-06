Stop-Process -Name node -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
$success = $false
for ($i=0; $i -lt 5; $i++) {
    Write-Host "Attempting to secure cosmic-ascii-engine... $i"
    $proc = Start-Process npx -ArgumentList "localtunnel","--port","8080","--subdomain","cosmic-ascii-engine" -PassThru -WindowStyle Hidden -RedirectStandardOutput "lt.log"
    Start-Sleep -Seconds 4
    $log = Get-Content lt.log -Raw -ErrorAction SilentlyContinue
    if ($log -match 'cosmic-ascii-engine') {
        Write-Host "SUCCESS!!!"
        $success = $true
        break
    } else {
        Write-Host "FAILED. output was $log"
        Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 3
}
if ($success) { 
    Write-Host "Starting http-server..."
    npx -y http-server "d:\사이드 프로젝트\COSMIC" -p 8080 --cors -c-1 
}
