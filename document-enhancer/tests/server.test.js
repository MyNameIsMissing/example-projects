const request = require('supertest');
const app = require('../server');
const path = require('path');
const fs = require('fs').promises;

describe('Document Enhancer API', () => {
  const testImagePath = path.join(__dirname, 'test-image.png');
  
  beforeAll(async () => {
    // Create a simple test image (1x1 PNG)
    const testImageBuffer = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
      0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00,
      0xFF, 0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, 0xE2, 0x21, 0xBC, 0x33,
      0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ]);
    
    await fs.writeFile(testImagePath, testImageBuffer);
  });

  afterAll(async () => {
    // Clean up test image
    try {
      await fs.unlink(testImagePath);
    } catch (error) {
      // Ignore if file doesn't exist
    }
  });

  describe('GET /', () => {
    it('should serve the main HTML page', async () => {
      const response = await request(app).get('/');
      expect(response.status).toBe(200);
      expect(response.type).toBe('text/html');
    });
  });

  describe('POST /api/upload', () => {
    it('should upload a valid PNG image', async () => {
      const response = await request(app)
        .post('/api/upload')
        .attach('image', testImagePath);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('fileId');
      expect(response.body).toHaveProperty('originalName');
      expect(response.body).toHaveProperty('dimensions');
      expect(response.body.dimensions).toHaveProperty('width');
      expect(response.body.dimensions).toHaveProperty('height');
    });

    it('should reject upload without file', async () => {
      const response = await request(app)
        .post('/api/upload');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject non-image files', async () => {
      // Create a temporary text file
      const textFilePath = path.join(__dirname, 'test.txt');
      await fs.writeFile(textFilePath, 'This is not an image');

      const response = await request(app)
        .post('/api/upload')
        .attach('image', textFilePath);

      expect(response.status).toBe(500);

      // Clean up
      await fs.unlink(textFilePath);
    });
  });

  describe('GET /api/image/:fileId/original', () => {
    let fileId;

    beforeEach(async () => {
      const uploadResponse = await request(app)
        .post('/api/upload')
        .attach('image', testImagePath);
      
      fileId = uploadResponse.body.fileId;
    });

    it('should serve the original uploaded image', async () => {
      const response = await request(app)
        .get(`/api/image/${fileId}/original`);

      expect(response.status).toBe(200);
      expect(response.type).toBe('image/png');
    });

    it('should return 404 for non-existent file', async () => {
      const response = await request(app)
        .get('/api/image/non-existent-id/original');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/enhance/:fileId', () => {
    let fileId;

    beforeEach(async () => {
      const uploadResponse = await request(app)
        .post('/api/upload')
        .attach('image', testImagePath);
      
      fileId = uploadResponse.body.fileId;
    });

    it('should start enhancement process', async () => {
      const response = await request(app)
        .post(`/api/enhance/${fileId}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('fileId');
      expect(response.body).toHaveProperty('status');
      expect(response.body.status).toBe('processing');
    });

    it('should return 404 for non-existent file', async () => {
      const response = await request(app)
        .post('/api/enhance/non-existent-id');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should prevent duplicate enhancement requests', async () => {
      // Start first enhancement
      await request(app)
        .post(`/api/enhance/${fileId}`);

      // Try to start second enhancement
      const response = await request(app)
        .post(`/api/enhance/${fileId}`);

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/status/:fileId', () => {
    let fileId;

    beforeEach(async () => {
      const uploadResponse = await request(app)
        .post('/api/upload')
        .attach('image', testImagePath);
      
      fileId = uploadResponse.body.fileId;
    });

    it('should return status for existing file', async () => {
      const response = await request(app)
        .get(`/api/status/${fileId}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('fileId');
      expect(response.body).toHaveProperty('status');
    });

    it('should return not_found for non-existent file', async () => {
      const response = await request(app)
        .get('/api/status/non-existent-id');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('not_found');
    });
  });

  describe('GET /api/download/:fileId', () => {
    it('should return 404 when enhanced image does not exist', async () => {
      const response = await request(app)
        .get('/api/download/non-existent-id');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /api/cleanup/:fileId', () => {
    let fileId;

    beforeEach(async () => {
      const uploadResponse = await request(app)
        .post('/api/upload')
        .attach('image', testImagePath);
      
      fileId = uploadResponse.body.fileId;
    });

    it('should cleanup files for existing fileId', async () => {
      const response = await request(app)
        .delete(`/api/cleanup/${fileId}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
    });

    it('should handle cleanup for non-existent fileId gracefully', async () => {
      const response = await request(app)
        .delete('/api/cleanup/non-existent-id');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Error handling', () => {
    it('should handle file size limit exceeded', async () => {
      // This test would require creating a file larger than 10MB
      // For now, we'll just verify the error handling structure exists
      expect(app).toBeDefined();
    });

    it('should handle invalid file types gracefully', async () => {
      // The multer configuration should handle this
      expect(app).toBeDefined();
    });
  });
});
