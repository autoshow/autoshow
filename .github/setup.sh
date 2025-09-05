#!/usr/bin/env bash

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
LOGFILE="setup-${TIMESTAMP}.log"
exec > >(tee -a "$LOGFILE") 2>&1

cleanup_log() {
  local status=$?
  if [ "$status" -eq 0 ]; then
    rm -f "$LOGFILE"
  else
    echo ""
    echo "ERROR: Script failed (exit code $status)."
    echo "Logs have been saved in: $LOGFILE"
  fi
  exit $status
}
trap cleanup_log EXIT

set -euo pipefail

detect_os() {
  local p="[setup/detect_os]"
  echo "$p Detecting operating system..." >&2
  
  case "$OSTYPE" in
    darwin*)
      echo "$p Detected: macOS" >&2
      echo "macos"
      ;;
    linux*)
      echo "$p Detected: Linux" >&2
      echo "linux"
      ;;
    msys*|mingw*|cygwin*)
      echo "$p Detected: Windows (Git Bash/MSYS2/Cygwin)" >&2
      echo "windows"
      ;;
    *)
      echo "$p Unknown OS: $OSTYPE" >&2
      echo "unknown"
      ;;
  esac
}

command_exists() {
  command -v "$1" &>/dev/null
}

detect_linux_distro() {
  local p="[setup/detect_linux_distro]"
  echo "$p Detecting Linux distribution..." >&2
  
  if [ -f /etc/os-release ]; then
    . /etc/os-release
    echo "$p Distribution: $ID" >&2
    echo "$ID"
  elif command_exists lsb_release; then
    local distro=$(lsb_release -si | tr '[:upper:]' '[:lower:]')
    echo "$p Distribution: $distro" >&2
    echo "$distro"
  else
    echo "$p Cannot detect Linux distribution" >&2
    echo "unknown"
  fi
}

install_ffmpeg_macos() {
  local p="[setup/install_ffmpeg_macos]"
  echo "$p Installing ffmpeg on macOS..."
  
  if command_exists ffmpeg; then
    echo "$p ffmpeg is already installed and available in PATH."
    return 0
  fi
  
  echo "$p Attempting Homebrew installation..."
  if command_exists brew; then
    if brew list --formula | grep -qx "ffmpeg"; then
      echo "$p ffmpeg is already installed via Homebrew."
      return 0
    else
      echo "$p Installing ffmpeg via Homebrew..."
      if brew install ffmpeg &>/dev/null; then
        echo "$p ffmpeg installed successfully via Homebrew"
        return 0
      else
        echo "$p Homebrew installation failed, trying fallbacks..."
      fi
    fi
  else
    echo "$p Homebrew not found, trying fallbacks..."
  fi
  
  echo "$p Attempting MacPorts installation..."
  if command_exists port; then
    if port installed | grep -q "ffmpeg"; then
      echo "$p ffmpeg is already installed via MacPorts."
      return 0
    else
      echo "$p Installing ffmpeg via MacPorts..."
      if sudo port install ffmpeg &>/dev/null; then
        echo "$p ffmpeg installed successfully via MacPorts"
        return 0
      else
        echo "$p MacPorts installation failed, trying direct download..."
      fi
    fi
  else
    echo "$p MacPorts not found, trying direct download..."
  fi
  
  echo "$p Attempting direct binary download..."
  local ffmpeg_dir="$HOME/ffmpeg"
  local ffmpeg_bin="$ffmpeg_dir/ffmpeg"
  
  if [ ! -d "$ffmpeg_dir" ]; then
    mkdir -p "$ffmpeg_dir"
  fi
  
  if [ ! -f "$ffmpeg_bin" ]; then
    echo "$p Downloading ffmpeg binary..."
    if curl -L "https://evermeet.cx/ffmpeg/getrelease/zip" -o "/tmp/ffmpeg.zip" &>/dev/null; then
      if command_exists unzip && unzip -q "/tmp/ffmpeg.zip" -d "$ffmpeg_dir" &>/dev/null; then
        chmod +x "$ffmpeg_bin"
        echo "$p ffmpeg downloaded to $ffmpeg_bin"
        
        if [[ ":$PATH:" != *":$ffmpeg_dir:"* ]]; then
          echo "export PATH=\"$ffmpeg_dir:\$PATH\"" >> "$HOME/.zshrc"
          echo "export PATH=\"$ffmpeg_dir:\$PATH\"" >> "$HOME/.bash_profile"
          export PATH="$ffmpeg_dir:$PATH"
          echo "$p Added $ffmpeg_dir to PATH in shell configuration files"
        fi
        
        if command_exists ffmpeg; then
          echo "$p ffmpeg installed successfully via direct download"
          return 0
        fi
      fi
    fi
  fi
  
  echo "$p All installation methods failed. Manual installation required:"
  echo ""
  echo "Option 1 - Install Homebrew (recommended):"
  echo '  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"'
  echo "  Then run: brew install ffmpeg"
  echo ""
  echo "Option 2 - Install MacPorts:"
  echo "  Visit: https://www.macports.org/install.php"
  echo "  Then run: sudo port install ffmpeg"
  echo ""
  echo "Option 3 - Direct download:"
  echo "  Download from: https://evermeet.cx/ffmpeg/"
  echo "  Extract and add to your PATH"
  echo ""
  echo "Option 4 - Compile from source:"
  echo "  Visit: https://trac.ffmpeg.org/wiki/CompilationGuide/macOS"
  
  return 1
}

install_ffmpeg_linux() {
  local p="[setup/install_ffmpeg_linux]"
  echo "$p Installing ffmpeg on Linux..."
  
  if command_exists ffmpeg; then
    echo "$p ffmpeg is already installed and available in PATH."
    return 0
  fi
  
  local distro=$(detect_linux_distro)
  
  echo "$p Attempting native package manager installation..."
  case "$distro" in
    ubuntu|debian)
      if command_exists apt-get; then
        echo "$p Using apt package manager..."
        if dpkg -l | grep -q "^ii  ffmpeg "; then
          echo "$p ffmpeg is already installed via apt."
          return 0
        else
          echo "$p Installing ffmpeg via apt..."
          if sudo apt-get update &>/dev/null && sudo apt-get install -y ffmpeg &>/dev/null; then
            echo "$p ffmpeg installed successfully via apt"
            return 0
          else
            echo "$p apt installation failed, trying fallbacks..."
          fi
        fi
      fi
      ;;
    fedora|rhel|centos)
      if command_exists dnf; then
        echo "$p Using dnf package manager..."
        if dnf list installed ffmpeg &>/dev/null; then
          echo "$p ffmpeg is already installed via dnf."
          return 0
        else
          echo "$p Installing ffmpeg via dnf..."
          if sudo dnf install -y ffmpeg &>/dev/null; then
            echo "$p ffmpeg installed successfully via dnf"
            return 0
          else
            echo "$p dnf installation failed, trying fallbacks..."
          fi
        fi
      elif command_exists yum; then
        echo "$p Using yum package manager..."
        if yum list installed ffmpeg &>/dev/null; then
          echo "$p ffmpeg is already installed via yum."
          return 0
        else
          echo "$p Installing ffmpeg via yum..."
          if sudo yum install -y ffmpeg &>/dev/null; then
            echo "$p ffmpeg installed successfully via yum"
            return 0
          else
            echo "$p yum installation failed, trying fallbacks..."
          fi
        fi
      fi
      ;;
    arch|manjaro)
      if command_exists pacman; then
        echo "$p Using pacman package manager..."
        if pacman -Qi ffmpeg &>/dev/null; then
          echo "$p ffmpeg is already installed via pacman."
          return 0
        else
          echo "$p Installing ffmpeg via pacman..."
          if sudo pacman -S --noconfirm ffmpeg &>/dev/null; then
            echo "$p ffmpeg installed successfully via pacman"
            return 0
          else
            echo "$p pacman installation failed, trying fallbacks..."
          fi
        fi
      fi
      ;;
  esac
  
  echo "$p Attempting Homebrew for Linux installation..."
  if command_exists brew; then
    if brew list --formula | grep -qx "ffmpeg"; then
      echo "$p ffmpeg is already installed via Homebrew."
      return 0
    else
      echo "$p Installing ffmpeg via Homebrew..."
      if brew install ffmpeg &>/dev/null; then
        echo "$p ffmpeg installed successfully via Homebrew"
        return 0
      else
        echo "$p Homebrew installation failed, trying Snap..."
      fi
    fi
  else
    echo "$p Homebrew not found, trying Snap..."
  fi
  
  echo "$p Attempting Snap installation..."
  if command_exists snap; then
    if snap list | grep -q "ffmpeg"; then
      echo "$p ffmpeg is already installed via Snap."
      return 0
    else
      echo "$p Installing ffmpeg via Snap..."
      if sudo snap install ffmpeg &>/dev/null; then
        echo "$p ffmpeg installed successfully via Snap"
        return 0
      else
        echo "$p Snap installation failed, trying Flatpak..."
      fi
    fi
  else
    echo "$p Snap not found, trying Flatpak..."
  fi
  
  echo "$p Attempting Flatpak installation..."
  if command_exists flatpak; then
    if flatpak list | grep -q "org.freedesktop.Platform.ffmpeg"; then
      echo "$p ffmpeg is already installed via Flatpak."
      return 0
    else
      echo "$p Installing ffmpeg via Flatpak..."
      if flatpak install -y flathub org.freedesktop.Platform.ffmpeg-full &>/dev/null; then
        echo "$p ffmpeg installed successfully via Flatpak"
        return 0
      else
        echo "$p Flatpak installation failed, trying direct download..."
      fi
    fi
  else
    echo "$p Flatpak not found, trying direct download..."
  fi
  
  echo "$p Attempting direct binary download..."
  local ffmpeg_dir="$HOME/ffmpeg"
  local ffmpeg_bin="$ffmpeg_dir/ffmpeg"
  
  if [ ! -d "$ffmpeg_dir" ]; then
    mkdir -p "$ffmpeg_dir"
  fi
  
  if [ ! -f "$ffmpeg_bin" ]; then
    echo "$p Downloading ffmpeg binary..."
    local arch=$(uname -m)
    local download_url=""
    
    case "$arch" in
      x86_64)
        download_url="https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz"
        ;;
      aarch64|arm64)
        download_url="https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-arm64-static.tar.xz"
        ;;
      *)
        echo "$p Unsupported architecture: $arch"
        ;;
    esac
    
    if [ -n "$download_url" ]; then
      if curl -L "$download_url" -o "/tmp/ffmpeg.tar.xz" &>/dev/null; then
        if command_exists tar && tar -xf "/tmp/ffmpeg.tar.xz" -C "/tmp" &>/dev/null; then
          local extracted_dir=$(find /tmp -name "ffmpeg-*-static" -type d | head -1)
          if [ -n "$extracted_dir" ] && [ -f "$extracted_dir/ffmpeg" ]; then
            cp "$extracted_dir/ffmpeg" "$ffmpeg_bin"
            chmod +x "$ffmpeg_bin"
            echo "$p ffmpeg downloaded to $ffmpeg_bin"
            
            if [[ ":$PATH:" != *":$ffmpeg_dir:"* ]]; then
              echo "export PATH=\"$ffmpeg_dir:\$PATH\"" >> "$HOME/.bashrc"
              echo "export PATH=\"$ffmpeg_dir:\$PATH\"" >> "$HOME/.zshrc"
              export PATH="$ffmpeg_dir:$PATH"
              echo "$p Added $ffmpeg_dir to PATH in shell configuration files"
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
  echo "Option 1 - Use your distribution's package manager:"
  echo "  Ubuntu/Debian: sudo apt-get update && sudo apt-get install ffmpeg"
  echo "  Fedora/RHEL:   sudo dnf install ffmpeg"
  echo "  Arch/Manjaro:  sudo pacman -S ffmpeg"
  echo ""
  echo "Option 2 - Install Homebrew for Linux:"
  echo '  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"'
  echo "  Then run: brew install ffmpeg"
  echo ""
  echo "Option 3 - Install via Snap:"
  echo "  sudo snap install ffmpeg"
  echo ""
  echo "Option 4 - Install via Flatpak:"
  echo "  flatpak install flathub org.freedesktop.Platform.ffmpeg-full"
  echo ""
  echo "Option 5 - Download static binary:"
  echo "  Visit: https://johnvansickle.com/ffmpeg/"
  echo ""
  echo "Option 6 - Compile from source:"
  echo "  Visit: https://trac.ffmpeg.org/wiki/CompilationGuide"
  
  return 1
}

install_ffmpeg_windows() {
  local p="[setup/install_ffmpeg_windows]"
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

setup_env_file() {
  local p="[setup/setup_env_file]"
  echo "$p Setting up environment file..."
  
  if [ -f ".env" ]; then
    echo "$p .env file already exists, skipping copy."
  else
    if [ -f ".env.example" ]; then
      echo "$p Creating .env from .env.example..."
      cp .env.example .env
      echo "$p .env file created successfully"
    else
      echo "$p WARNING: .env.example not found, skipping .env creation"
    fi
  fi
  
  if [ -f ".env" ]; then
    echo "$p Loading environment variables from .env..."
    set -a
    source .env
    set +a
  fi
}

install_npm_dependencies() {
  local p="[setup/install_npm_dependencies]"
  echo "$p Installing npm dependencies..."
  
  if ! command_exists npm; then
    echo "$p ERROR: npm not found!"
    echo ""
    echo "Please install Node.js and npm first:"
    echo "  Visit: https://nodejs.org/en/download/"
    echo "  Or use a version manager like nvm, fnm, or volta"
    echo ""
    echo "Then re-run this setup script."
    return 1
  fi
  
  if [ ! -f "package.json" ]; then
    echo "$p WARNING: package.json not found, skipping npm install"
    return 0
  fi
  
  npm install || {
    echo "$p Failed to install npm dependencies"
    echo "Try running manually: npm install"
    return 1
  }
  
  echo "$p npm dependencies installed successfully"
}

main() {
  local p="[setup/main]"
  echo "$p Starting cross-platform setup script..."
  
  local os=$(detect_os)
  
  setup_env_file || {
    echo "$p Environment setup failed, continuing anyway..."
  }
  
  install_npm_dependencies || {
    echo "$p npm installation failed"
    exit 1
  }
  
  case "$os" in
    macos)
      install_ffmpeg_macos || {
        echo "$p ffmpeg installation failed on macOS"
        exit 1
      }
      ;;
    linux)
      install_ffmpeg_linux || {
        echo "$p ffmpeg installation failed on Linux"
        exit 1
      }
      ;;
    windows)
      install_ffmpeg_windows || {
        echo "$p ffmpeg installation failed on Windows"
        exit 1
      }
      ;;
    *)
      echo "$p ERROR: Unsupported operating system: $os"
      echo ""
      echo "This script supports:"
      echo "  - macOS (with Homebrew, MacPorts, or direct download)"
      echo "  - Linux (native package managers, Homebrew, Snap, Flatpak, or direct download)"
      echo "  - Windows (winget, Chocolatey, Scoop, or direct download)"
      echo ""
      echo "Please install ffmpeg manually for your system:"
      echo "  Visit: https://ffmpeg.org/download.html"
      exit 1
      ;;
  esac
  
  echo ""
  echo "$p Setup completed successfully!"
  echo "$p You can now run your CLI commands or start your server:"
  echo "$p   npm run dev"
}

main