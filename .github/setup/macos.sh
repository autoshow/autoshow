#!/usr/bin/env bash

install_ffmpeg_macos() {
  local p="[setup/macos/install_ffmpeg]"
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