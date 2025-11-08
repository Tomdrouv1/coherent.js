/**
 * Desktop Runtime - For Electron and Tauri applications
 * Extends browser runtime with desktop-specific capabilities
 */

import { BrowserRuntime } from './browser.js';

export class DesktopRuntime extends BrowserRuntime {
  constructor(options = {}) {
    super({
      enableFileSystem: true,
      enableNativeAPIs: true,
      ...options
    });
    
    this.desktopAPI = null;
    this.isElectron = typeof window !== 'undefined' && !!window.require;
    this.isTauri = typeof window !== 'undefined' && !!window.__TAURI__;
  }

  async initialize() {
    await super.initialize();
    
    // Initialize desktop APIs
    if (this.isElectron) {
      this.initializeElectron();
    } else if (this.isTauri) {
      this.initializeTauri();
    }
  }

  initializeElectron() {
    try {
      // Access Electron APIs if available
      this.desktopAPI = {
        platform: 'electron',
        fs: window.require ? window.require('fs') : null,
        path: window.require ? window.require('path') : null,
        ipcRenderer: window.require ? window.require('electron').ipcRenderer : null
      };
    } catch (error) {
      console.warn('Failed to initialize Electron APIs:', error);
    }
  }

  async initializeTauri() {
    try {
      // Access Tauri APIs if available
      if (window.__TAURI__) {
        this.desktopAPI = {
          platform: 'tauri',
          fs: window.__TAURI__.fs,
          path: window.__TAURI__.path,
          invoke: window.__TAURI__.invoke
        };
      }
    } catch (error) {
      console.warn('Failed to initialize Tauri APIs:', error);
    }
  }

  // Desktop-specific methods
  async readFile(path) {
    if (this.desktopAPI?.fs) {
      return await this.desktopAPI.fs.readTextFile(path);
    }
    throw new Error('File system access not available');
  }

  async writeFile(path, content) {
    if (this.desktopAPI?.fs) {
      return await this.desktopAPI.fs.writeTextFile(path, content);
    }
    throw new Error('File system access not available');
  }

  async showDialog(options) {
    if (this.isElectron && this.desktopAPI?.ipcRenderer) {
      return await this.desktopAPI.ipcRenderer.invoke('show-dialog', options);
    } else if (this.isTauri && this.desktopAPI?.invoke) {
      return await this.desktopAPI.invoke('show_dialog', options);
    }
    // No fallback dialog available in desktop environment
    console.warn('Desktop dialog not available, rejecting by default');
    return Promise.resolve(false);
  }

  static createApp(options = {}) {
    const runtime = new DesktopRuntime(options);
    return runtime.createApp(options);
  }
}