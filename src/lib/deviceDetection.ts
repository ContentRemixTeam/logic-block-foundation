export type DeviceType = 'ios' | 'android' | 'desktop' | 'unknown';
export type BrowserType = 'safari' | 'chrome' | 'firefox' | 'edge' | 'samsung' | 'other';

export interface DeviceInfo {
  device: DeviceType;
  browser: BrowserType;
  canInstall: boolean;
  installMessage: string;
}

export function detectDeviceAndBrowser(): DeviceInfo {
  const ua = navigator.userAgent.toLowerCase();
  
  // Detect device
  let device: DeviceType = 'unknown';
  if (/iphone|ipad|ipod/.test(ua)) {
    device = 'ios';
  } else if (/android/.test(ua)) {
    device = 'android';
  } else if (/windows|macintosh|linux/.test(ua) && !/mobile/.test(ua)) {
    device = 'desktop';
  }
  
  // Detect browser - order matters for accuracy
  let browser: BrowserType = 'other';
  if (/edg/.test(ua)) {
    browser = 'edge';
  } else if (/samsungbrowser/.test(ua)) {
    browser = 'samsung';
  } else if (/firefox/.test(ua)) {
    browser = 'firefox';
  } else if (/chrome|crios/.test(ua) && !/edg/.test(ua)) {
    browser = 'chrome';
  } else if (/safari/.test(ua) && !/chrome|crios/.test(ua)) {
    browser = 'safari';
  }
  
  // Determine if installation is possible
  let canInstall = false;
  let installMessage = '';
  
  if (device === 'ios') {
    if (browser === 'safari') {
      canInstall = true;
      installMessage = 'Ready to install! Follow the steps below.';
    } else {
      canInstall = false;
      installMessage = `You're using ${getBrowserName(browser)} on iPhone. iOS only allows app installation through Safari.`;
    }
  } else if (device === 'android') {
    if (browser === 'chrome' || browser === 'samsung' || browser === 'edge') {
      canInstall = true;
      installMessage = 'Ready to install! Follow the steps below.';
    } else {
      canInstall = false;
      installMessage = `You're using ${getBrowserName(browser)} on Android. For best results, please use Chrome.`;
    }
  } else if (device === 'desktop') {
    if (browser === 'chrome' || browser === 'edge') {
      canInstall = true;
      installMessage = 'Ready to install! Look for the install icon in your address bar.';
    } else if (browser === 'firefox' || browser === 'safari') {
      canInstall = false;
      installMessage = `${getBrowserName(browser)} doesn't support app installation. Please use Chrome or Edge.`;
    } else {
      canInstall = true;
      installMessage = 'You may be able to install - look for an install option in your browser.';
    }
  }
  
  return { device, browser, canInstall, installMessage };
}

export function getBrowserName(browser: BrowserType): string {
  const names: Record<BrowserType, string> = {
    safari: 'Safari',
    chrome: 'Chrome',
    firefox: 'Firefox',
    edge: 'Edge',
    samsung: 'Samsung Browser',
    other: 'your browser',
  };
  return names[browser];
}

export function getDeviceName(device: DeviceType): string {
  const names: Record<DeviceType, string> = {
    ios: 'iPhone/iPad',
    android: 'Android',
    desktop: 'Desktop',
    unknown: 'Device',
  };
  return names[device];
}

export function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true;
}

export function getCurrentUrl(): string {
  return window.location.href;
}
