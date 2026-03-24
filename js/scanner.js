/**
 * Barcode scanner using ZXing (loaded via CDN in index.html as window.ZXingBrowser).
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
   * Start scanning. Resolves with the decoded ISBN string once a barcode is found.
   * Rejects if the camera cannot be accessed or ZXing is unavailable.
   * @returns {Promise<string>}
   */
  start() {
    return new Promise((resolve, reject) => {
      if (!window.ZXingBrowser) {
        reject(new Error('ZXing library not loaded'));
        return;
      }

      const hints = new Map();
      // Focus on 1D barcode formats used for ISBN
      const formats = [
        window.ZXingBrowser.BarcodeFormat?.EAN_13,
        window.ZXingBrowser.BarcodeFormat?.EAN_8,
        window.ZXingBrowser.BarcodeFormat?.CODE_128,
      ].filter(Boolean);

      if (formats.length) {
        hints.set(window.ZXingBrowser.DecodeHintType?.POSSIBLE_FORMATS, formats);
      }

      this._reader = new window.ZXingBrowser.BrowserMultiFormatReader(hints);
      this._stopped = false;

      this._reader.decodeFromVideoDevice(
        undefined, // use default camera
        this.videoEl,
        (result, err) => {
          if (this._stopped) return;
          if (result) {
            this.stop();
            resolve(result.getText());
          }
          // err is set on every frame that has no barcode — that's normal, ignore it
        }
      ).catch(reject);
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
