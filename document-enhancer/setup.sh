#!/bin/bash

# Document Enhancer Setup Script
echo "Setting up Document Enhancer..."

# Install system dependencies for OpenCV
echo "Installing system dependencies..."
sudo apt-get update
sudo apt-get install -y libgl1-mesa-glx libglib2.0-0 libsm6 libxext6 libxrender-dev libgomp1

# Install Node.js dependencies
echo "Installing Node.js dependencies..."
npm install

# Install Python dependencies
echo "Installing Python dependencies..."
pip3 install realesrgan opencv-python pillow
pip3 install numpy==1.24.4
pip3 install torch==1.13.1 torchvision==0.14.1 torchaudio==0.13.1 --index-url https://download.pytorch.org/whl/cpu

echo "Setup complete! You can now run the application with: npm start"
