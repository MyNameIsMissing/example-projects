const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const imageProcessor = require('./utils/imageProcessor');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'temp'));
  },
  filename: (req, file, cb) => {
    const uniqueId = uuidv4();
    cb(null, `${uniqueId}_${file.originalname}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'image/png' || file.mimetype === 'image/jpeg') {
      cb(null, true);
    } else {
      cb(new Error('Only PNG and JPEG files are allowed'), false);
    }
  }
});

// Store processing status
const processingStatus = new Map();

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Upload endpoint
app.post('/api/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileId = req.file.filename.split('_')[0];
    const filePath = req.file.path;

    // Get image metadata
    const sharp = require('sharp');
    const metadata = await sharp(filePath).metadata();

    res.json({
      fileId: fileId,
      originalName: req.file.originalname,
      size: req.file.size,
      dimensions: {
        width: metadata.width,
        height: metadata.height
      },
      uploadPath: `/api/image/${fileId}/original`
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Serve original image
app.get('/api/image/:fileId/original', async (req, res) => {
  try {
    const fileId = req.params.fileId;
    const tempDir = path.join(__dirname, 'temp');
    const files = await fs.readdir(tempDir);
    const originalFile = files.find(file => file.startsWith(fileId));
    
    if (!originalFile) {
      return res.status(404).json({ error: 'File not found' });
    }

    const filePath = path.join(tempDir, originalFile);
    res.sendFile(filePath);
  } catch (error) {
    console.error('Error serving original image:', error);
    res.status(500).json({ error: 'Failed to serve image' });
  }
});

// Serve enhanced image
app.get('/api/image/:fileId/enhanced', async (req, res) => {
  try {
    const fileId = req.params.fileId;
    const enhancedPath = path.join(__dirname, 'temp', `${fileId}_enhanced.png`);
    
    try {
      await fs.access(enhancedPath);
      res.sendFile(enhancedPath);
    } catch {
      res.status(404).json({ error: 'Enhanced image not found' });
    }
  } catch (error) {
    console.error('Error serving enhanced image:', error);
    res.status(500).json({ error: 'Failed to serve enhanced image' });
  }
});

// Enhancement endpoint
app.post('/api/enhance/:fileId', async (req, res) => {
  try {
    const fileId = req.params.fileId;
    
    // Check if already processing
    if (processingStatus.get(fileId) === 'processing') {
      return res.status(409).json({ error: 'Image is already being processed' });
    }

    // Find original file
    const tempDir = path.join(__dirname, 'temp');
    const files = await fs.readdir(tempDir);
    const originalFile = files.find(file => file.startsWith(fileId) && !file.includes('enhanced'));
    
    if (!originalFile) {
      return res.status(404).json({ error: 'Original file not found' });
    }

    const inputPath = path.join(tempDir, originalFile);
    const outputPath = path.join(tempDir, `${fileId}_enhanced.png`);

    // Set processing status
    processingStatus.set(fileId, 'processing');

    // Start enhancement process
    imageProcessor.enhanceImage(inputPath, outputPath)
      .then(() => {
        processingStatus.set(fileId, 'completed');
        console.log(`Enhancement completed for ${fileId}`);
      })
      .catch((error) => {
        processingStatus.set(fileId, 'failed');
        console.error(`Enhancement failed for ${fileId}:`, error);
      });

    res.json({ 
      message: 'Enhancement started',
      fileId: fileId,
      status: 'processing'
    });

  } catch (error) {
    console.error('Enhancement error:', error);
    res.status(500).json({ error: 'Failed to start enhancement' });
  }
});

// Status endpoint
app.get('/api/status/:fileId', (req, res) => {
  const fileId = req.params.fileId;
  const status = processingStatus.get(fileId) || 'not_found';
  
  res.json({ 
    fileId: fileId,
    status: status 
  });
});

// Download endpoint
app.get('/api/download/:fileId', async (req, res) => {
  try {
    const fileId = req.params.fileId;
    const enhancedPath = path.join(__dirname, 'temp', `${fileId}_enhanced.png`);
    
    try {
      await fs.access(enhancedPath);
      res.download(enhancedPath, `enhanced_document_${fileId}.png`);
    } catch {
      res.status(404).json({ error: 'Enhanced image not available for download' });
    }
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Failed to download file' });
  }
});

// Cleanup endpoint (optional - for removing old files)
app.delete('/api/cleanup/:fileId', async (req, res) => {
  try {
    const fileId = req.params.fileId;
    const tempDir = path.join(__dirname, 'temp');
    const files = await fs.readdir(tempDir);
    
    const filesToDelete = files.filter(file => file.startsWith(fileId));
    
    for (const file of filesToDelete) {
      await fs.unlink(path.join(tempDir, file));
    }
    
    processingStatus.delete(fileId);
    
    res.json({ message: 'Files cleaned up successfully' });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ error: 'Failed to cleanup files' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
    }
  }
  
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Document Enhancer server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
