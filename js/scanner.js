/**
 * Barcode scanner using @zxing/browser@0.1.5 (loaded via CDN as window.ZXingBrowser).
 *
 * Usage:
 *   const scanner = new BarcodeScanner(videoElement);
 *   const isbn = await scanner.start();   // resolves when a barcode is decoded
 *   scanner.stop();
 */
export class BarcodeScanner {
  /** @param {HTMLVideoElement} videoEl */
  constructor(videoEl) {
    this.videoEl = videoEl;
    this._reader = null;
    this._stopped = false;
  }

  /**
   * Start continuous scanning. Resolves with the decoded string on first hit.
   * @returns {Promise<string>}
   */
  start() {
    return new Promise((resolve, reject) => {
      const lib = window.ZXingBrowser;
      console.log('[Scanner] window.ZXingBrowser:', lib);
      console.log('[Scanner] BrowserMultiFormatReader:', lib?.BrowserMultiFormatReader);
      if (!lib || !lib.BrowserMultiFormatReader) {
        reject(new Error('ZXing library not loaded. Open the app via localhost or HTTPS.'));
        return;
      }

      this._reader = new lib.BrowserMultiFormatReader();
      this._stopped = false;

      // null deviceId = use default (back) camera
      this._reader.decodeFromInputVideoDeviceContinuously(
        null,
        this.videoEl,
        (result, _err) => {
          if (this._stopped) return;
          if (result) {
            this.stop();
            resolve(result.getText());
          }
          // _err fires on every frame without a barcode — expected, ignore
        }
      );
    });
  }

  /**
   * Stop the camera and release resources.
   */
  stop() {
    this._stopped = true;
    if (this._reader) {
      this._reader.reset();
      this._reader = null;
    }
  }
}
