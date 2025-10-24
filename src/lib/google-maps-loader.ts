// Google Maps API Loader Utility
// This utility prevents multiple script loads and provides a centralized way to load Google Maps

interface GoogleMapsLoaderOptions {
  apiKey: string;
  libraries?: string[];
  callback?: () => void;
}

class GoogleMapsLoader {
  private static instance: GoogleMapsLoader;
  private isLoaded = false;
  private isLoading = false;
  private loadPromise: Promise<void> | null = null;
  private callbacks: (() => void)[] = [];

  private constructor() {}

  static getInstance(): GoogleMapsLoader {
    if (!GoogleMapsLoader.instance) {
      GoogleMapsLoader.instance = new GoogleMapsLoader();
    }
    return GoogleMapsLoader.instance;
  }

  async load(options: GoogleMapsLoaderOptions): Promise<void> {
    // If already loaded, execute callback immediately
    if (this.isLoaded && window.google && window.google.maps) {
      if (options.callback) {
        options.callback();
      }
      return Promise.resolve();
    }

    // If currently loading, wait for it to complete
    if (this.isLoading && this.loadPromise) {
      return this.loadPromise.then(() => {
        if (options.callback) {
          options.callback();
        }
      });
    }

    // Start loading
    this.isLoading = true;
    this.loadPromise = this.loadScript(options);
    
    return this.loadPromise;
  }

  private loadScript(options: GoogleMapsLoaderOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('🗺️ GoogleMapsLoader: Starting script loading process');
      
      // Check if script already exists
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript) {
        console.log('🗺️ GoogleMapsLoader: Existing script found, waiting for load');
        // Script exists, wait for it to load
        this.waitForGoogleMaps(resolve, reject);
        return;
      }

      // Create unique callback name
      const callbackName = `googleMapsCallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log('🗺️ GoogleMapsLoader: Created callback name:', callbackName);
      
      // Set up global callback
      window[callbackName] = () => {
        console.log('🗺️ GoogleMapsLoader: Callback executed - Google Maps loaded');
        this.isLoaded = true;
        this.isLoading = false;
        
        // Execute all pending callbacks
        this.callbacks.forEach(cb => cb());
        this.callbacks = [];
        
        // Clean up callback
        delete window[callbackName];
        
        resolve();
      };

      // Add callback to pending list
      if (options.callback) {
        this.callbacks.push(options.callback);
        console.log('🗺️ GoogleMapsLoader: Added callback to pending list');
      }

      // Create and load script
      const script = document.createElement('script');
      const libraries = options.libraries ? options.libraries.join(',') : '';
      const scriptUrl = `https://maps.googleapis.com/maps/api/js?key=${options.apiKey}&libraries=${libraries}&callback=${callbackName}`;
      script.src = scriptUrl;
      script.async = true;
      script.defer = true;

      console.log('🗺️ GoogleMapsLoader: Script URL:', scriptUrl);
      console.log('🗺️ GoogleMapsLoader: Adding script to document head');

      script.onload = () => {
        console.log('🗺️ GoogleMapsLoader: Script loaded successfully');
        console.log('🗺️ GoogleMapsLoader: window.google after load:', !!window.google);
        console.log('🗺️ GoogleMapsLoader: window.google.maps after load:', !!(window.google && window.google.maps));
      };

      script.onerror = (error) => {
        console.error('🗺️ GoogleMapsLoader: Script loading error:', error);
        console.error('🗺️ GoogleMapsLoader: Script URL that failed:', scriptUrl);
        this.isLoading = false;
        delete window[callbackName];
        reject(new Error('Failed to load Google Maps API'));
      };

      document.head.appendChild(script);
      console.log('🗺️ GoogleMapsLoader: Script appended to document head');
    });
  }

  private waitForGoogleMaps(resolve: () => void, reject: () => void): void {
    const checkLoaded = () => {
      if (window.google && window.google.maps) {
        this.isLoaded = true;
        this.isLoading = false;
        resolve();
      } else {
        setTimeout(checkLoaded, 100);
      }
    };
    checkLoaded();
  }

  isGoogleMapsLoaded(): boolean {
    return this.isLoaded && !!(window.google && window.google.maps);
  }
}

// Export singleton instance
export const googleMapsLoader = GoogleMapsLoader.getInstance();

// Helper function for easy usage
export const loadGoogleMaps = (apiKey: string, libraries: string[] = ['places'], callback?: () => void): Promise<void> => {
  return googleMapsLoader.load({ apiKey, libraries, callback });
};
