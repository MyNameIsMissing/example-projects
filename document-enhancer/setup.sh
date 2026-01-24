#!/bin/bash

# Document Enhancer Setup Script
echo "Setting up Document Enhancer..."

# Install system dependencies for OpenCV / Python build
echo "Installing system dependencies..."
sudo apt-get update
# Ubuntu 24.04 replaces libgl1-mesa-glx with libgl1 (no install candidate)
if apt-cache policy libgl1-mesa-glx 2>/dev/null | awk '/Candidate:/ {print $2}' | grep -vq '(none)'; then
  sudo apt-get install -y libgl1-mesa-glx libglib2.0-0 libsm6 libxext6 libxrender-dev libgomp1 git libbz2-dev
else
  sudo apt-get install -y libgl1 libglib2.0-0 libsm6 libxext6 libxrender-dev libgomp1 git libbz2-dev
fi

# Install Node.js dependencies
echo "Installing Node.js dependencies..."
npm install

# Create local Python 3.10 venv (prefers pyenv, falls back to python3.10)
echo "Setting up Python 3.10 virtual environment..."
if command -v pyenv >/dev/null 2>&1; then
  pyenv install -s 3.10.14
  pyenv local 3.10.14
  PYTHON_BIN="$(pyenv which python)"
else
  PYTHON_BIN="$(command -v python3.10)"
fi

if [ -z "$PYTHON_BIN" ]; then
  echo "Python 3.10 not found."
  echo "Recommended (no system change):"
  echo "  curl https://pyenv.run | bash"
  echo "  # restart shell, then:"
  echo "  pyenv install 3.10.14"
  echo "  pyenv local 3.10.14"
  echo "Then re-run: ./setup.sh"
  echo "See README.md for details."
  exit 1
fi

"$PYTHON_BIN" -m venv .venv
source .venv/bin/activate

# Install Python dependencies into the venv
echo "Installing Python dependencies..."
pip install --upgrade pip
# Constrain numpy/opencv to keep torch 1.13.x compatible
pip install -c constraints.txt numpy
pip install -c constraints.txt torch==1.13.1 torchvision==0.14.1 torchaudio==0.13.1 --index-url https://download.pytorch.org/whl/cpu
pip install -c constraints.txt pillow opencv-python
# Real-ESRGAN stack sometimes builds from source; install deps first and avoid build isolation.
pip install -c constraints.txt basicsr facexlib gfpgan
pip install -c constraints.txt --no-build-isolation realesrgan

echo "Setup complete! You can now run the application with: npm start"
