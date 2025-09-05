#!/usr/bin/env bash

detect_linux_distro() {
  local p="[setup/linux/detect_distro]"
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

install_ffmpeg_linux() {
  local p="[setup/linux/install_ffmpeg]"
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