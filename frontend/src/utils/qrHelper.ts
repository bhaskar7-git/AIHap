/**
 * Helper to get the base URL for QR codes.
 * Uses window.location.origin (e.g. http://localhost:5173) so scanning or clicking
 * the QR code routes directly to localhost.
 */
export const getScannableBaseUrl = (): string => {
  return window.location.origin;
};
