/**
 * Barcode scanner using @zxing/browser@0.1.4 (loaded via CDN as window.ZXingBrowser).
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
   * Start continuous scanning. Resolves with the decoded ISBN string on first hit.
   * Rejects if the camera cannot be accessed or ZXing is unavailable.
   * @returns {Promise<string>}
   */
  start() {
    return new Promise((resolve, reject) => {
      const lib = window.ZXingBrowser;
      if (!lib || !lib.BrowserMultiFormatReader) {
        reject(new Error('ZXing library not loaded. Open the app via localhost or HTTPS.'));
        return;
      }

      this._reader = new lib.BrowserMultiFormatReader();
      this._stopped = false;

      // decodeFromVideoDeviceContinuously(deviceId, videoEl, callback)
      // deviceId = null → use default camera
      this._reader.decodeFromVideoDeviceContinuously(
        null,
        this.videoEl,
        (result, _err) => {
          if (this._stopped) return;
          if (result) {
            this.stop();
            resolve(result.getText());
          }
          // err fires on every frame without a barcode — expected, ignore it
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
