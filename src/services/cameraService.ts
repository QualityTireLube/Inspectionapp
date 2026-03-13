import { BrowserMultiFormatReader } from '@zxing/browser';

interface CameraServiceState {
  currentStream: MediaStream | null;
  currentDeviceId: string | null;
  availableCameras: MediaDeviceInfo[];
  currentCameraIndex: number;
  isInitialized: boolean;
}

class CameraService {
  private state: CameraServiceState = {
    currentStream: null,
    currentDeviceId: null,
    availableCameras: [],
    currentCameraIndex: 0,
    isInitialized: false
  };

  private listeners: Set<(state: CameraServiceState) => void> = new Set();

  async initialize(): Promise<void> {
    try {
      // Get available cameras
      const cameras = await BrowserMultiFormatReader.listVideoInputDevices();
      this.state.availableCameras = cameras;
      this.state.isInitialized = true;
      this.notifyListeners();
      
      console.log('📷 CameraService initialized with', cameras.length, 'cameras');
    } catch (error) {
      console.error('❌ CameraService initialization failed:', error);
      throw error;
    }
  }

  async getCameraStream(deviceId?: string): Promise<MediaStream> {
    try {
      // If we already have a stream for the requested device, return it
      if (this.state.currentStream && this.state.currentDeviceId === deviceId) {
        return this.state.currentStream;
      }

      // Stop existing stream if different device
      if (this.state.currentStream && this.state.currentDeviceId !== deviceId) {
        this.stopCurrentStream();
      }

      // Determine which camera to use
      let targetDeviceId = deviceId;
      if (!targetDeviceId && this.state.availableCameras.length > 0) {
        // Try to find back camera
        const backCamera = this.state.availableCameras.find(camera => 
          camera.label && (
            camera.label.toLowerCase().includes('back') || 
            camera.label.toLowerCase().includes('environment') ||
            camera.label.toLowerCase().includes('rear')
          )
        );
        
        if (backCamera) {
          targetDeviceId = backCamera.deviceId;
          console.log('📷 Using back camera:', backCamera.label);
        } else {
          targetDeviceId = this.state.availableCameras[0].deviceId;
          console.log('📷 Using first camera:', this.state.availableCameras[0].label || 'Unknown');
        }
      }

      // Get camera stream
      const constraints = {
        video: {
          deviceId: targetDeviceId ? { exact: targetDeviceId } : undefined,
          width: { ideal: 1920, min: 640 },
          height: { ideal: 1080, min: 480 },
          focusMode: 'continuous',
          exposureMode: 'continuous',
          whiteBalanceMode: 'continuous'
        }
      };

      console.log('🎥 Requesting camera stream with constraints:', constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      this.state.currentStream = stream;
      this.state.currentDeviceId = targetDeviceId || null;
      this.state.currentCameraIndex = this.state.availableCameras.findIndex(cam => cam.deviceId === targetDeviceId);
      
      this.notifyListeners();
      console.log('✅ Camera stream obtained successfully');
      
      return stream;
    } catch (error) {
      console.error('❌ Failed to get camera stream:', error);
      throw error;
    }
  }

  async switchCamera(): Promise<MediaStream> {
    if (this.state.availableCameras.length <= 1) {
      throw new Error('No other cameras available');
    }

    // Calculate next camera index
    const nextIndex = (this.state.currentCameraIndex + 1) % this.state.availableCameras.length;
    const nextCamera = this.state.availableCameras[nextIndex];
    
    console.log('📷 Switching to camera:', nextCamera.label || 'Unknown');
    
    // Get stream for the new camera
    return await this.getCameraStream(nextCamera.deviceId);
  }

  getCurrentState(): CameraServiceState {
    return { ...this.state };
  }

  getAvailableCameras(): MediaDeviceInfo[] {
    return [...this.state.availableCameras];
  }

  getCurrentCameraIndex(): number {
    return this.state.currentCameraIndex;
  }

  stopCurrentStream(): void {
    if (this.state.currentStream) {
      this.state.currentStream.getTracks().forEach(track => track.stop());
      this.state.currentStream = null;
      this.state.currentDeviceId = null;
      this.notifyListeners();
      console.log('📷 Camera stream stopped');
    }
  }

  addListener(callback: (state: CameraServiceState) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(): void {
    this.listeners.forEach(callback => callback({ ...this.state }));
  }

  destroy(): void {
    this.stopCurrentStream();
    this.listeners.clear();
    this.state = {
      currentStream: null,
      currentDeviceId: null,
      availableCameras: [],
      currentCameraIndex: 0,
      isInitialized: false
    };
  }
}

// Export singleton instance
export const cameraService = new CameraService();
export default cameraService; 