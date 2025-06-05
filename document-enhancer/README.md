# Document Enhancer

AI-powered document image enhancement application using Real-ESRGAN for upscaling and improving the readability of blurry document images.

## Features

- **Drag & Drop Upload**: Modern file upload interface with drag-and-drop support
- **AI Enhancement**: Uses Real-ESRGAN x4plus model for high-quality image upscaling
- **Side-by-Side Comparison**: View original vs enhanced images
- **Download Enhanced**: Save improved images locally
- **Real-time Progress**: Visual feedback during processing
- **Responsive Design**: Works on desktop and mobile devices

## Technology Stack

- **Backend**: Node.js + Express
- **AI Model**: Real-ESRGAN (Python integration)
- **Frontend**: Vanilla HTML/CSS/JavaScript
- **Image Processing**: Sharp.js for metadata and Python for AI enhancement
- **File Handling**: Multer for uploads

## Prerequisites

- Node.js (v14 or higher)
- Python 3.x
- pip (Python package manager)

## Installation

1.  **Clone or navigate to the project directory**:
    ```bash
    cd document-enhancer
    ```

2.  **Run the Setup Script (Recommended for first-time setup)**:
    A setup script `setup.sh` is provided to help install system dependencies (like those for OpenCV) and all necessary Python packages with specific compatible versions.
    To use it:
    ```bash
    chmod +x setup.sh
    ./setup.sh
    ```
    This script typically only needs to be run once. It handles:
    - System dependencies (e.g., `libgl1-mesa-glx`)
    - Node.js dependencies (`npm install`)
    - Python packages (`realesrgan`, `opencv-python`, `pillow`, `numpy==1.24.4`, `torch==1.13.1`, `torchvision==0.14.1`, `torchaudio==0.13.1`)

3.  **Manual Installation (Alternative)**:
    If you prefer to install dependencies manually:

    a.  **Install Node.js Dependencies**:
        ```bash
        npm install
        ```

    b.  **Install System Dependencies for OpenCV (if not already present)**:
        On Debian/Ubuntu-based systems:
        ```bash
        sudo apt-get update
        sudo apt-get install -y libgl1-mesa-glx libglib2.0-0 libsm6 libxext6 libxrender-dev libgomp1
        ```

    c.  **Install Python Dependencies**:
        Ensure you have Python 3.x and pip installed.
        ```bash
        pip3 install realesrgan opencv-python pillow
        pip3 install numpy==1.24.4
        pip3 install torch==1.13.1 torchvision==0.14.1 torchaudio==0.13.1 --index-url https://download.pytorch.org/whl/cpu
        ```

    *Note on Python Dependencies*: The application's `imageProcessor.js` will attempt to auto-install `realesrgan`, `opencv-python`, and `pillow` if it detects they are missing. However, for `torch`, `torchvision`, `torchaudio`, and `numpy`, it's best to ensure the specific versions listed above (and included in `setup.sh`) are installed for compatibility.

## Usage

1. **Start the server**:
   ```bash
   npm start
   ```

2. **Open your browser** and navigate to:
   ```
   http://localhost:3001
   ```

3. **Upload a document image**:
   - Drag and drop a PNG or JPEG file onto the upload area
   - Or click "browse files" to select an image
   - Supported formats: PNG, JPEG
   - Maximum file size: 10MB

4. **Enhance the image**:
   - Click the "Enhance Image" button
   - Wait for processing to complete (may take 1-3 minutes)
   - View the side-by-side comparison

5. **Download the result**:
   - Click "Download Enhanced Image" to save the improved version
   - The enhanced image will be 4x larger with improved clarity

## API Endpoints

- `POST /api/upload` - Upload an image file
- `POST /api/enhance/:fileId` - Start enhancement process
- `GET /api/status/:fileId` - Check enhancement status
- `GET /api/image/:fileId/original` - Serve original image
- `GET /api/image/:fileId/enhanced` - Serve enhanced image
- `GET /api/download/:fileId` - Download enhanced image
- `DELETE /api/cleanup/:fileId` - Clean up temporary files

## Development

### Running Tests

```bash
npm test
```

### Development Mode

```bash
npm run dev
```

### Linting

```bash
npm run lint
npm run lint:fix
```

## How It Works

1. **Upload**: Images are uploaded and stored temporarily with unique IDs
2. **Processing**: Real-ESRGAN Python script is executed via subprocess
3. **Enhancement**: The AI model upscales the image 4x while preserving text clarity
4. **Results**: Enhanced images are served alongside originals for comparison
5. **Cleanup**: Temporary files are managed automatically

## Model Information

This application uses the **Real-ESRGAN x4plus** model, which is specifically designed for:
- 4x upscaling of low-quality images
- Preserving text and document details
- Reducing blur and noise
- Enhancing overall image clarity

The model is approximately 67MB and will be downloaded automatically on first use.

## File Structure

```
document-enhancer/
├── package.json          # Node.js dependencies and scripts
├── server.js             # Express server and API routes
├── README.md             # This file
├── public/               # Frontend files
│   ├── index.html        # Main HTML page
│   ├── style.css         # Styling
│   └── script.js         # Frontend JavaScript
├── utils/                # Backend utilities
│   └── imageProcessor.js # AI processing logic
├── temp/                 # Temporary file storage
├── models/               # AI model storage (auto-created)
└── tests/                # Unit tests
    └── server.test.js    # API tests
```

## Troubleshooting

### Python Dependencies
If you encounter issues with Python dependencies:
```bash
pip3 install --upgrade realesrgan opencv-python pillow
```

### Memory Issues
For large images or limited memory:
- Ensure you have at least 4GB RAM available
- Close other applications during processing
- Consider using smaller input images

### Processing Timeout
If enhancement takes too long:
- Check your internet connection (model download)
- Verify Python dependencies are installed
- Check server logs for error messages

## Performance Notes

- **First Run**: May take longer due to model download (~67MB)
- **Processing Time**: 1-3 minutes depending on image size and hardware
- **Memory Usage**: ~2-4GB during processing
- **Input Size**: Optimized for 400x400 to 800x800 pixel images

## Contributing

This Document Enhancer application is an experimental project, primarily developed for learning and testing AI image enhancement techniques within the `example-projects` repository. 

As such, contributions are not being accepted at this time. The project serves as a demonstration and may not be actively maintained or suitable for production use.

## License

MIT License - see LICENSE file for details.

## Acknowledgments

- [Real-ESRGAN](https://github.com/xinntao/Real-ESRGAN) for the AI enhancement model
- [Sharp](https://sharp.pixelplumbing.com/) for image processing
- [Express](https://expressjs.com/) for the web framework
