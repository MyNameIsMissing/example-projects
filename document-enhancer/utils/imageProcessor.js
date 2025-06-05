const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

class ImageProcessor {
  constructor() {
    this.modelPath = path.join(__dirname, '..', 'models');
  }

  /**
   * Check if Real-ESRGAN is installed and available
   */
  async checkRealESRGAN() {
    return new Promise((resolve) => {
      const process = spawn('python3', ['-c', 'import realesrgan; print("OK")']);
      
      process.on('close', (code) => {
        resolve(code === 0);
      });
      
      process.on('error', () => {
        resolve(false);
      });
    });
  }

  /**
   * Install Real-ESRGAN if not available
   */
  async installRealESRGAN() {
    console.log('Installing Real-ESRGAN...');
    
    return new Promise((resolve, reject) => {
      const installProcess = spawn('pip3', ['install', 'realesrgan', 'opencv-python', 'pillow'], {
        stdio: 'inherit'
      });
      
      installProcess.on('close', (code) => {
        if (code === 0) {
          console.log('Real-ESRGAN installed successfully');
          resolve();
        } else {
          reject(new Error(`Installation failed with code ${code}`));
        }
      });
      
      installProcess.on('error', (error) => {
        reject(new Error(`Installation error: ${error.message}`));
      });
    });
  }

  /**
   * Enhance image using Real-ESRGAN
   */
  async enhanceImage(inputPath, outputPath) {
    try {
      // Check if Real-ESRGAN is available
      const isAvailable = await this.checkRealESRGAN();
      if (!isAvailable) {
        console.log('Real-ESRGAN not found, attempting to install...');
        await this.installRealESRGAN();
      }

      // Verify input file exists
      try {
        await fs.access(inputPath);
      } catch {
        throw new Error(`Input file not found: ${inputPath}`);
      }

      console.log(`Starting enhancement: ${inputPath} -> ${outputPath}`);

      // Create Python script for Real-ESRGAN processing
      const pythonScript = `
import sys
import os
from realesrgan import RealESRGANer
from basicsr.archs.rrdbnet_arch import RRDBNet
import cv2

def enhance_image(input_path, output_path):
    try:
        # Initialize the model
        model = RRDBNet(num_in_ch=3, num_out_ch=3, num_feat=64, num_block=23, num_grow_ch=32, scale=4)
        
        # Create upsampler
        upsampler = RealESRGANer(
            scale=4,
            model_path='https://github.com/xinntao/Real-ESRGAN/releases/download/v0.1.0/RealESRGAN_x4plus.pth',
            model=model,
            tile=0,
            tile_pad=10,
            pre_pad=0,
            half=False
        )
        
        # Read input image
        img = cv2.imread(input_path, cv2.IMREAD_COLOR)
        if img is None:
            raise Exception(f"Could not read image: {input_path}")
        
        print(f"Input image shape: {img.shape}")
        
        # Enhance the image
        output, _ = upsampler.enhance(img, outscale=4)
        
        print(f"Output image shape: {output.shape}")
        
        # Save the enhanced image
        cv2.imwrite(output_path, output)
        
        print(f"Enhanced image saved to: {output_path}")
        return True
        
    except Exception as e:
        print(f"Error during enhancement: {str(e)}")
        return False

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python script.py <input_path> <output_path>")
        sys.exit(1)
    
    input_path = sys.argv[1]
    output_path = sys.argv[2]
    
    success = enhance_image(input_path, output_path)
    sys.exit(0 if success else 1)
`;

      // Write temporary Python script
      const tempScriptPath = path.join(__dirname, '..', 'temp', 'enhance_script.py');
      await fs.writeFile(tempScriptPath, pythonScript);

      // Execute the Python script
      return new Promise((resolve, reject) => {
        const enhanceProcess = spawn('python3', [tempScriptPath, inputPath, outputPath]);
        
        let stdout = '';
        let stderr = '';
        
        enhanceProcess.stdout.on('data', (data) => {
          stdout += data.toString();
          console.log('Enhancement output:', data.toString().trim());
        });
        
        enhanceProcess.stderr.on('data', (data) => {
          stderr += data.toString();
          console.error('Enhancement error:', data.toString().trim());
        });
        
        enhanceProcess.on('close', async (code) => {
          // Clean up temporary script
          try {
            await fs.unlink(tempScriptPath);
          } catch (e) {
            console.warn('Could not delete temporary script:', e.message);
          }
          
          if (code === 0) {
            // Verify output file was created
            try {
              await fs.access(outputPath);
              console.log(`Enhancement completed successfully: ${outputPath}`);
              resolve();
            } catch {
              reject(new Error('Enhancement completed but output file not found'));
            }
          } else {
            reject(new Error(`Enhancement failed with code ${code}. Error: ${stderr}`));
          }
        });
        
        enhanceProcess.on('error', (error) => {
          reject(new Error(`Failed to start enhancement process: ${error.message}`));
        });
      });

    } catch (error) {
      console.error('Enhancement error:', error);
      throw error;
    }
  }

  /**
   * Get image metadata using Sharp
   */
  async getImageMetadata(imagePath) {
    const sharp = require('sharp');
    try {
      const metadata = await sharp(imagePath).metadata();
      return {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: metadata.size
      };
    } catch (error) {
      throw new Error(`Failed to get image metadata: ${error.message}`);
    }
  }
}

module.exports = new ImageProcessor();
