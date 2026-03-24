/**
 * Barcode scanner using html5-qrcode@2.3.8
 * (loaded via CDN in index.html — exposes window.Html5Qrcode)
 *
 * Usage:
 *   const scanner = new BarcodeScanner('scanner-view');
 *   const isbn = await scanner.start();
 *   scanner.stop();
 */
export class BarcodeScanner {
  /** @param {string} containerId - ID of the div to render the camera into */
  constructor(containerId) {
    this.containerId = containerId;
    this._scanner = null;
  }

  /**
   * Start scanning. Resolves with the decoded barcode string on first hit.
   * @returns {Promise<string>}
   */
  start() {
    return new Promise((resolve, reject) => {
      if (!window.Html5Qrcode) {
        reject(new Error('Html5Qrcode library not loaded.'));
        return;
      }

      this._scanner = new window.Html5Qrcode(this.containerId);

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 150 }, // wide box suits barcodes
        aspectRatio: 1.5,
        formatsToSupport: [
          window.Html5QrcodeSupportedFormats?.EAN_13,
          window.Html5QrcodeSupportedFormats?.EAN_8,
          window.Html5QrcodeSupportedFormats?.CODE_128,
        ].filter(v => v !== undefined),
      };

      this._scanner
        .start(
          { facingMode: 'environment' }, // rear camera
          config,
          (decodedText) => {
            this.stop();
            resolve(decodedText);
          }
        )
        .catch(reject);
    });
  }

  /**
   * Stop the camera and release resources.
   */
  async stop() {
    if (this._scanner) {
      try {
        await this._scanner.stop();
        this._scanner.clear();
      } catch {
        // already stopped — ignore
      }
      this._scanner = null;
    }
  }
}
