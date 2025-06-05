class DocumentEnhancer {
    constructor() {
        this.currentFileId = null;
        this.currentFile = null;
        this.pollInterval = null;
        
        this.initializeElements();
        this.attachEventListeners();
    }

    initializeElements() {
        // Upload elements
        this.uploadSection = document.getElementById('uploadSection');
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.browseLink = document.getElementById('browseLink');

        // Processing elements
        this.processingSection = document.getElementById('processingSection');
        this.originalImage = document.getElementById('originalImage');
        this.originalInfo = document.getElementById('originalInfo');
        this.enhanceBtn = document.getElementById('enhanceBtn');
        this.btnText = this.enhanceBtn.querySelector('.btn-text');
        this.btnLoader = this.enhanceBtn.querySelector('.btn-loader');
        this.statusMessage = document.getElementById('statusMessage');

        // Results elements
        this.resultsSection = document.getElementById('resultsSection');
        this.originalCompare = document.getElementById('originalCompare');
        this.originalCompareInfo = document.getElementById('originalCompareInfo');
        this.enhancedImage = document.getElementById('enhancedImage');
        this.enhancedInfo = document.getElementById('enhancedInfo');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.newImageBtn = document.getElementById('newImageBtn');

        // Error elements
        this.errorSection = document.getElementById('errorSection');
        this.errorText = document.getElementById('errorText');
        this.retryBtn = document.getElementById('retryBtn');
    }

    attachEventListeners() {
        // File input events
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        this.browseLink.addEventListener('click', () => this.fileInput.click());

        // Drag and drop events
        this.uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        this.uploadArea.addEventListener('drop', (e) => this.handleDrop(e));
        this.uploadArea.addEventListener('click', () => this.fileInput.click());

        // Enhancement button
        this.enhanceBtn.addEventListener('click', () => this.startEnhancement());

        // Action buttons
        this.downloadBtn.addEventListener('click', () => this.downloadEnhanced());
        this.newImageBtn.addEventListener('click', () => this.resetApp());
        this.retryBtn.addEventListener('click', () => this.resetApp());
    }

    handleDragOver(e) {
        e.preventDefault();
        this.uploadArea.classList.add('dragover');
    }

    handleDragLeave(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('dragover');
    }

    handleDrop(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.processFile(files[0]);
        }
    }

    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            this.processFile(file);
        }
    }

    async processFile(file) {
        // Validate file type
        if (!file.type.match(/^image\/(png|jpeg)$/)) {
            this.showError('Please select a PNG or JPEG image file.');
            return;
        }

        // Validate file size (10MB limit)
        if (file.size > 10 * 1024 * 1024) {
            this.showError('File size must be less than 10MB.');
            return;
        }

        this.currentFile = file;
        
        try {
            await this.uploadFile(file);
        } catch (error) {
            this.showError(`Upload failed: ${error.message}`);
        }
    }

    async uploadFile(file) {
        const formData = new FormData();
        formData.append('image', file);

        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Upload failed');
        }

        const result = await response.json();
        this.currentFileId = result.fileId;
        
        this.showProcessingSection(result);
    }

    showProcessingSection(uploadResult) {
        // Hide upload section
        this.uploadSection.style.display = 'none';
        
        // Show processing section
        this.processingSection.style.display = 'block';
        this.processingSection.classList.add('fade-in');
        
        // Set original image
        this.originalImage.src = uploadResult.uploadPath;
        this.originalImage.alt = uploadResult.originalName;
        
        // Set image info
        const { width, height } = uploadResult.dimensions;
        const sizeKB = Math.round(uploadResult.size / 1024);
        this.originalInfo.textContent = `${width} × ${height} pixels • ${sizeKB} KB`;
        
        // Reset enhancement button
        this.resetEnhanceButton();
    }

    async startEnhancement() {
        if (!this.currentFileId) {
            this.showError('No file selected for enhancement.');
            return;
        }

        // Disable button and show loading
        this.enhanceBtn.disabled = true;
        this.btnText.style.display = 'none';
        this.btnLoader.style.display = 'inline';
        
        this.showStatus('Starting enhancement...', 'processing');

        try {
            const response = await fetch(`/api/enhance/${this.currentFileId}`, {
                method: 'POST'
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Enhancement failed to start');
            }

            const result = await response.json();
            this.showStatus('Enhancement in progress... This may take a few minutes.', 'processing');
            
            // Start polling for status
            this.startStatusPolling();

        } catch (error) {
            this.showError(`Enhancement failed: ${error.message}`);
            this.resetEnhanceButton();
        }
    }

    startStatusPolling() {
        this.pollInterval = setInterval(async () => {
            try {
                const response = await fetch(`/api/status/${this.currentFileId}`);
                const result = await response.json();
                
                switch (result.status) {
                    case 'completed':
                        this.clearStatusPolling();
                        await this.showResults();
                        break;
                    case 'failed':
                        this.clearStatusPolling();
                        this.showError('Enhancement failed. Please try again.');
                        this.resetEnhanceButton();
                        break;
                    case 'processing':
                        // Continue polling
                        break;
                    default:
                        this.clearStatusPolling();
                        this.showError('Unknown status. Please try again.');
                        this.resetEnhanceButton();
                }
            } catch (error) {
                console.error('Status polling error:', error);
            }
        }, 2000); // Poll every 2 seconds
    }

    clearStatusPolling() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
    }

    async showResults() {
        try {
            // Hide processing section
            this.processingSection.style.display = 'none';
            
            // Show results section
            this.resultsSection.style.display = 'block';
            this.resultsSection.classList.add('fade-in');
            
            // Set original image in comparison
            this.originalCompare.src = this.originalImage.src;
            this.originalCompareInfo.textContent = this.originalInfo.textContent;
            
            // Set enhanced image
            const enhancedPath = `/api/image/${this.currentFileId}/enhanced`;
            this.enhancedImage.src = enhancedPath;
            
            // Get enhanced image info (estimate 4x dimensions)
            const originalDimensions = this.originalInfo.textContent.match(/(\d+) × (\d+)/);
            if (originalDimensions) {
                const originalWidth = parseInt(originalDimensions[1]);
                const originalHeight = parseInt(originalDimensions[2]);
                const enhancedWidth = originalWidth * 4;
                const enhancedHeight = originalHeight * 4;
                this.enhancedInfo.textContent = `${enhancedWidth} × ${enhancedHeight} pixels • Enhanced`;
            }
            
            this.showStatus('Enhancement completed successfully!', 'success');
            
        } catch (error) {
            this.showError(`Failed to display results: ${error.message}`);
        }
    }

    async downloadEnhanced() {
        if (!this.currentFileId) {
            this.showError('No enhanced image available for download.');
            return;
        }

        try {
            const downloadUrl = `/api/download/${this.currentFileId}`;
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = `enhanced_document_${this.currentFileId}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Call cleanup after download is initiated
            this.cleanupFiles(this.currentFileId);
        } catch (error) {
            this.showError(`Download failed: ${error.message}`);
        }
    }

    async cleanupFiles(fileId) {
        if (!fileId) return;
        try {
            await fetch(`/api/cleanup/${fileId}`, { method: 'DELETE' });
            console.log(`Cleanup request sent for fileId: ${fileId}`);
        } catch (error) {
            console.error(`Failed to send cleanup request for ${fileId}:`, error);
            // Non-critical, so don't show error to user, just log it
        }
    }

    resetApp() {
        // Call cleanup for the current file before resetting
        if (this.currentFileId) {
            this.cleanupFiles(this.currentFileId);
        }

        // Clear current state
        this.currentFileId = null;
        this.currentFile = null;
        this.clearStatusPolling();
        
        // Reset file input
        this.fileInput.value = '';
        
        // Hide all sections except upload
        this.processingSection.style.display = 'none';
        this.resultsSection.style.display = 'none';
        this.errorSection.style.display = 'none';
        
        // Show upload section
        this.uploadSection.style.display = 'block';
        this.uploadSection.classList.add('fade-in');
        
        // Reset button states
        this.resetEnhanceButton();
        
        // Clear status
        this.clearStatus();
    }

    resetEnhanceButton() {
        this.enhanceBtn.disabled = false;
        this.btnText.style.display = 'inline';
        this.btnLoader.style.display = 'none';
    }

    showStatus(message, type = '') {
        this.statusMessage.textContent = message;
        this.statusMessage.className = `status-message ${type}`;
        this.statusMessage.style.display = 'block';
    }

    clearStatus() {
        this.statusMessage.style.display = 'none';
        this.statusMessage.textContent = '';
        this.statusMessage.className = 'status-message';
    }

    showError(message) {
        this.errorText.textContent = message;
        
        // Hide other sections
        this.uploadSection.style.display = 'none';
        this.processingSection.style.display = 'none';
        this.resultsSection.style.display = 'none';
        
        // Show error section
        this.errorSection.style.display = 'block';
        this.errorSection.classList.add('fade-in');
        
        // Clear polling
        this.clearStatusPolling();
        
        console.error('Document Enhancer Error:', message);
    }

    // Utility method to format file size
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new DocumentEnhancer();
});

// Handle page unload to cleanup polling
window.addEventListener('beforeunload', () => {
    if (window.documentEnhancer && window.documentEnhancer.pollInterval) {
        clearInterval(window.documentEnhancer.pollInterval);
    }
});
