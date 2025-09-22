# Script de Instalação Automática - VerifAI Desktop
# Autor: VerifAI
# Versão: 1.0

param(
    [switch]$Portable,
    [switch]$Silent
)

Write-Host "🚀 VerifAI Desktop - Instalador Automático" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green

# Configurações
$RepoOwner = "silvaleo1979"
$RepoName = "verifai-desktop"
$Version = "v1.0.0"
$GitHubApi = "https://api.github.com/repos/$RepoOwner/$RepoName/releases/latest"

# URLs dos arquivos
$InstallerUrl = "https://github.com/$RepoOwner/$RepoName/releases/download/$Version/VerifAI.Assistant-1.0.0.Setup.exe"
$PortableUrl = "https://github.com/$RepoOwner/$RepoName/releases/download/$Version/VerifAI.Assistant-win32-x64-1.0.0.zip"

# Diretórios
$DownloadDir = "$env:USERPROFILE\Downloads\VerifAI"
$InstallDir = "$env:PROGRAMFILES\VerifAI Desktop"

# Criar diretórios se não existirem
if (!(Test-Path $DownloadDir)) {
    New-Item -ItemType Directory -Path $DownloadDir -Force | Out-Null
    Write-Host "📁 Diretório de download criado: $DownloadDir" -ForegroundColor Yellow
}

# Função para baixar arquivo
function Download-File {
    param($Url, $OutputPath)
    
    Write-Host "📥 Baixando arquivo..." -ForegroundColor Cyan
    Write-Host "URL: $Url" -ForegroundColor Gray
    
    try {
        $ProgressPreference = 'SilentlyContinue'
        Invoke-WebRequest -Uri $Url -OutFile $OutputPath -UseBasicParsing
        Write-Host "✅ Download concluído: $OutputPath" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "❌ Erro no download: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Função para instalar versão portátil
function Install-Portable {
    $ZipPath = "$DownloadDir\VerifAI-Assistant-portable.zip"
    
    Write-Host "📦 Instalando versão portátil..." -ForegroundColor Cyan
    
    if (Download-File -Url $PortableUrl -OutputPath $ZipPath) {
        $ExtractPath = "$env:USERPROFILE\Desktop\VerifAI Desktop"
        
        if (Test-Path $ExtractPath) {
            Remove-Item $ExtractPath -Recurse -Force
        }
        
        Write-Host "📂 Extraindo arquivos..." -ForegroundColor Yellow
        Expand-Archive -Path $ZipPath -DestinationPath $ExtractPath -Force
        
        Write-Host "✅ Versão portátil instalada em: $ExtractPath" -ForegroundColor Green
        Write-Host "🎯 Execute: $ExtractPath\VerifAI.exe" -ForegroundColor Cyan
        
        # Limpar arquivo temporário
        Remove-Item $ZipPath -Force
        
        return $true
    }
    return $false
}

# Função para instalar versão completa
function Install-Full {
    $ExePath = "$DownloadDir\VerifAI-Assistant-Setup.exe"
    
    Write-Host "🔧 Instalando versão completa..." -ForegroundColor Cyan
    
    if (Download-File -Url $InstallerUrl -OutputPath $ExePath) {
        Write-Host "⚙️ Executando instalador..." -ForegroundColor Yellow
        
        if ($Silent) {
            # Instalação silenciosa
            Start-Process -FilePath $ExePath -ArgumentList "/S" -Wait
            Write-Host "✅ Instalação silenciosa concluída" -ForegroundColor Green
        } else {
            # Instalação interativa
            Start-Process -FilePath $ExePath -Wait
            Write-Host "✅ Instalação concluída" -ForegroundColor Green
        }
        
        # Limpar arquivo temporário
        Remove-Item $ExePath -Force
        
        return $true
    }
    return $false
}

# Função para verificar se já está instalado
function Test-Installation {
    $InstalledPaths = @(
        "$env:PROGRAMFILES\VerifAI Desktop",
        "$env:PROGRAMFILES(X86)\VerifAI Desktop",
        "$env:USERPROFILE\Desktop\VerifAI Desktop"
    )
    
    foreach ($Path in $InstalledPaths) {
        if (Test-Path "$Path\VerifAI.exe") {
            Write-Host "⚠️ VerifAI Desktop já está instalado em: $Path" -ForegroundColor Yellow
            return $true
        }
    }
    return $false
}

# Função para criar atalho na área de trabalho
function Create-Shortcut {
    param($TargetPath)
    
    $ShortcutPath = "$env:USERPROFILE\Desktop\VerifAI Desktop.lnk"
    $WScriptShell = New-Object -ComObject WScript.Shell
    $Shortcut = $WScriptShell.CreateShortcut($ShortcutPath)
    $Shortcut.TargetPath = $TargetPath
    $Shortcut.WorkingDirectory = Split-Path $TargetPath
    $Shortcut.Description = "VerifAI Desktop - Assistente de IA"
    $Shortcut.Save()
    
    Write-Host "🔗 Atalho criado na área de trabalho" -ForegroundColor Green
}

# Verificar se já está instalado
if (Test-Installation) {
    $Continue = Read-Host "Deseja continuar mesmo assim? (S/N)"
    if ($Continue -ne "S" -and $Continue -ne "s") {
        Write-Host "❌ Instalação cancelada" -ForegroundColor Red
        exit
    }
}

# Escolher tipo de instalação
if ($Portable) {
    Write-Host "📦 Instalando versão portátil..." -ForegroundColor Cyan
    if (Install-Portable) {
        $ExtractPath = "$env:USERPROFILE\Desktop\VerifAI Desktop"
        Create-Shortcut -TargetPath "$ExtractPath\VerifAI.exe"
    }
} else {
    Write-Host "🔧 Instalando versão completa..." -ForegroundColor Cyan
    if (Install-Full) {
        # Criar atalho para versão instalada
        $InstalledPath = "$env:PROGRAMFILES\VerifAI Desktop\VerifAI.exe"
        if (Test-Path $InstalledPath) {
            Create-Shortcut -TargetPath $InstalledPath
        }
    }
}

Write-Host ""
Write-Host "🎉 Instalação concluída!" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host "📋 Próximos passos:" -ForegroundColor Cyan
Write-Host "1. Execute o VerifAI Desktop" -ForegroundColor White
Write-Host "2. Configure suas chaves de API" -ForegroundColor White
Write-Host "3. O sistema de atualização automática está ativo" -ForegroundColor White
Write-Host ""
Write-Host "🌐 Para mais informações: https://github.com/$RepoOwner/$RepoName" -ForegroundColor Blue

