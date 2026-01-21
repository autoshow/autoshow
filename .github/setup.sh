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

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SETUP_DIR="$SCRIPT_DIR/setup"

command_exists() {
  command -v "$1" &>/dev/null
}

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

install_dependencies() {
  local p="[setup/install_dependencies]"
  echo "$p Installing dependencies..."
  
  if [ ! -f "package.json" ]; then
    echo "$p WARNING: package.json not found, skipping dependency install"
    return 0
  fi
  
  local pkg_manager=""
  local install_cmd=""
  
  if command_exists bun; then
    pkg_manager="bun"
    install_cmd="bun install"
    echo "$p Using bun package manager"
  elif command_exists npm; then
    pkg_manager="npm"
    install_cmd="npm install"
    echo "$p Using npm package manager (bun not found)"
  else
    echo "$p ERROR: No package manager found!"
    echo ""
    echo "Please install bun (recommended) or npm:"
    echo "  bun:  Visit https://bun.sh or run: curl -fsSL https://bun.sh/install | bash"
    echo "  npm:  Visit https://nodejs.org/en/download/"
    echo "  Or use a version manager like nvm, fnm, or volta"
    echo ""
    echo "Then re-run this setup script."
    return 1
  fi
  
  $install_cmd || {
    echo "$p Failed to install dependencies with $pkg_manager"
    echo "Try running manually: $install_cmd"
    return 1
  }
  
  echo "$p Dependencies installed successfully using $pkg_manager"
}

source_os_modules() {
  local p="[setup/source_os_modules]"
  local os="$1"
  
  case "$os" in
    macos)
      if [ -f "$SETUP_DIR/macos.sh" ]; then
        echo "$p Sourcing macOS module..." >&2
        source "$SETUP_DIR/macos.sh"
      else
        echo "$p ERROR: macOS module not found at $SETUP_DIR/macos.sh" >&2
        return 1
      fi
      ;;
    linux)
      if [ -f "$SETUP_DIR/linux.sh" ]; then
        echo "$p Sourcing Linux module..." >&2
        source "$SETUP_DIR/linux.sh"
      else
        echo "$p ERROR: Linux module not found at $SETUP_DIR/linux.sh" >&2
        return 1
      fi
      ;;
    windows)
      if [ -f "$SETUP_DIR/windows.sh" ]; then
        echo "$p Sourcing Windows module..." >&2
        source "$SETUP_DIR/windows.sh"
      else
        echo "$p ERROR: Windows module not found at $SETUP_DIR/windows.sh" >&2
        return 1
      fi
      ;;
    *)
      echo "$p ERROR: Unknown OS module: $os" >&2
      return 1
      ;;
  esac
}

main() {
  local p="[setup/main]"
  echo "$p Starting cross-platform setup script..."
  
  local os=$(detect_os)
  
  setup_env_file || {
    echo "$p Environment setup failed, continuing anyway..."
  }
  
  install_dependencies || {
    echo "$p Dependency installation failed"
    exit 1
  }
  
  case "$os" in
    macos|linux|windows)
      source_os_modules "$os" || {
        echo "$p Failed to source $os module"
        exit 1
      }
      
      install_ffmpeg_"$os" || {
        echo "$p ffmpeg installation failed on $os"
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