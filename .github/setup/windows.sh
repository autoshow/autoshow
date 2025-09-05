#!/usr/bin/env bash

install_ffmpeg_windows() {
  local p="[setup/windows/install_ffmpeg]"
  echo "$p Installing ffmpeg on Windows..."
  
  if command_exists ffmpeg; then
    echo "$p ffmpeg is already installed and available in PATH."
    return 0
  fi
  
  echo "$p Attempting winget installation..."
  if command_exists winget; then
    if winget list | grep -q "FFmpeg"; then
      echo "$p ffmpeg is already installed via winget."
      return 0
    else
      echo "$p Installing ffmpeg via winget..."
      if winget install FFmpeg &>/dev/null; then
        echo "$p ffmpeg installed successfully via winget"
        return 0
      else
        echo "$p winget installation failed, trying Chocolatey..."
      fi
    fi
  else
    echo "$p winget not found, trying Chocolatey..."
  fi
  
  echo "$p Attempting Chocolatey installation..."
  if command_exists choco; then
    if choco list --local-only | grep -q "ffmpeg"; then
      echo "$p ffmpeg is already installed via Chocolatey."
      return 0
    else
      echo "$p Installing ffmpeg via Chocolatey..."
      if choco install ffmpeg -y &>/dev/null; then
        echo "$p ffmpeg installed successfully via Chocolatey"
        return 0
      else
        echo "$p Chocolatey installation failed, trying Scoop..."
      fi
    fi
  else
    echo "$p Chocolatey not found, trying Scoop..."
  fi
  
  echo "$p Attempting Scoop installation..."
  if command_exists scoop; then
    if scoop list | grep -q "ffmpeg"; then
      echo "$p ffmpeg is already installed via Scoop."
      return 0
    else
      echo "$p Installing ffmpeg via Scoop..."
      if scoop install ffmpeg &>/dev/null; then
        echo "$p ffmpeg installed successfully via Scoop"
        return 0
      else
        echo "$p Scoop installation failed, trying direct download..."
      fi
    fi
  else
    echo "$p Scoop not found, trying direct download..."
  fi
  
  echo "$p Attempting direct binary download..."
  local ffmpeg_dir="$HOME/ffmpeg"
  local ffmpeg_bin="$ffmpeg_dir/ffmpeg.exe"
  
  if [ ! -d "$ffmpeg_dir" ]; then
    mkdir -p "$ffmpeg_dir"
  fi
  
  if [ ! -f "$ffmpeg_bin" ]; then
    echo "$p Downloading ffmpeg binary..."
    if curl -L "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip" -o "/tmp/ffmpeg.zip" &>/dev/null; then
      if command_exists unzip; then
        if unzip -q "/tmp/ffmpeg.zip" -d "/tmp" &>/dev/null; then
          local extracted_dir=$(find /tmp -name "ffmpeg-master-latest-win64-gpl" -type d | head -1)
          if [ -n "$extracted_dir" ] && [ -d "$extracted_dir/bin" ]; then
            cp "$extracted_dir/bin"/* "$ffmpeg_dir/"
            echo "$p ffmpeg downloaded to $ffmpeg_dir"
            
            if [[ ":$PATH:" != *":$ffmpeg_dir:"* ]]; then
              export PATH="$ffmpeg_dir:$PATH"
              echo "$p Added $ffmpeg_dir to PATH for current session"
              echo "$p To make this permanent, add $ffmpeg_dir to your system PATH"
            fi
            
            if command_exists ffmpeg; then
              echo "$p ffmpeg installed successfully via direct download"
              return 0
            fi
          fi
        fi
      fi
    fi
  fi
  
  echo "$p All installation methods failed. Manual installation required:"
  echo ""
  echo "Option 1 - Install a package manager:"
  echo ""
  echo "  Winget (recommended, comes with Windows 10/11):"
  echo "    Already installed on Windows 10 version 1809+ and Windows 11"
  echo "    If missing, install from Microsoft Store: 'App Installer'"
  echo "    Then run: winget install FFmpeg"
  echo ""
  echo "  Chocolatey:"
  echo "    Run in PowerShell as Administrator:"
  echo '    Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString("https://community.chocolatey.org/install.ps1"))'
  echo "    Then run: choco install ffmpeg"
  echo ""
  echo "  Scoop:"
  echo "    Run in PowerShell:"
  echo '    Set-ExecutionPolicy RemoteSigned -Scope CurrentUser'
  echo '    irm get.scoop.sh | iex'
  echo "    Then run: scoop install ffmpeg"
  echo ""
  echo "Option 2 - Manual download and PATH setup:"
  echo "  1. Download from: https://ffmpeg.org/download.html#build-windows"
  echo "  2. Extract to a folder (e.g., C:\\ffmpeg)"
  echo "  3. Add the bin folder to your system PATH:"
  echo "     - Press Win+R, type 'sysdm.cpl', press Enter"
  echo "     - Click 'Environment Variables'"
  echo "     - Select 'Path' in System Variables, click 'Edit'"
  echo "     - Click 'New' and add your ffmpeg\\bin path"
  echo "     - Click OK to save and restart your terminal"
  echo ""
  echo "Option 3 - Use Windows Subsystem for Linux (WSL):"
  echo "  Install WSL and use Linux package managers"
  
  return 1
}