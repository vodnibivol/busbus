window.fp = (function () {
  const data = {
    UserAgent: navigator.userAgent,
    // ScreenResolution: `${screen.width}x${screen.height}`,
    // AvailableScreenResolution: `${screen.availWidth}x${screen.availHeight}`,
    ColorDepth: screen.colorDepth,
    PixelRatio: window.devicePixelRatio,
    TimezoneOffset: new Date().getTimezoneOffset(),
    SessionStorage: !!window.sessionStorage,
    LocalStorage: !!window.localStorage,
    IndexedDB: !!window.indexedDB,
    CookiesEnabled: navigator.cookieEnabled,
    TouchSupport: 'ontouchstart' in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0,
    languages: navigator.languages,
    // DoNotTrack: navigator.doNotTrack || navigator.msDoNotTrack || window.doNotTrack || 'unknown',
    HardwareConcurrency: navigator.hardwareConcurrency,
    Platform: navigator.platform,
    Plugins: [...navigator.plugins].map((plugin) => plugin.name),
    PdfViewerEnabled: navigator.pdfViewerEnabled,
    ForcedColors: window.matchMedia('(forced-colors)').matches,
  };

  async function generate() {
    const hex = await digest(JSON.stringify(data));
    window.deviceFingerprint = hex;
    return hex;
  }

  async function digest(string) {
    const hash = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(string));
    const hexDigest = [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
    return hexDigest;
  }

  return {
    data,
    generate,
  };
})();
