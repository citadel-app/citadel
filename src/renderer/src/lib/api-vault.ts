/**
 * API Vault — Security boundary for the Electron IPC bridge.
 *
 * This module MUST be imported before any module code loads.
 * It captures `window.citadel` into a private reference, then removes
 * it from the global scope so that modules cannot access it directly.
 *
 * Host code imports `__hostApi` from this file for full IPC access.
 * Modules receive a scoped proxy via `onRendererActivate(registrar, api)`.
 */

// Capture the real API before anything else runs using the one-time claim
const claimFn = (window as any).claimCitadelApi;
const capturedApi = typeof claimFn === 'function' ? claimFn() : undefined;

if (!capturedApi) {
    console.error('[api-vault] claimCitadelApi was not found or API was already claimed!');
}

// Seal the window.citadel property so no one can mistakenly use it
try {
    Object.defineProperty(window, 'citadel', {
        get() {
            if (process.env.NODE_ENV === 'development') {
                console.warn('[Security] Direct window.citadel access blocked. Use __hostApi or CoreServices.');
            }
            return undefined;
        },
        set() {
            // Silently prevent reassignment
        },
        configurable: false,
    });
} catch (e) {
    // If it was somehow already non-configurable, ignore
}

/**
 * The real Electron API bridge.
 * Only import this from host-internal code (src/renderer/src/*).
 * NEVER export from a public package (@citadel-app/core, @citadel-app/ui, etc.).
 */
export const __hostApi = capturedApi as any;
