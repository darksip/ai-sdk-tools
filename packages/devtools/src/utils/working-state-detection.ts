/**
 * Working state detection utilities
 */

// Check if store package is available
export function isStorePackageAvailable(): boolean {
  try {
    require("@fondation-io/store");
    return true;
  } catch {
    return false;
  }
}
