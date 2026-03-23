import { createContext, useContext } from 'react';
import type { CoreServices } from '@citadel-app/core';

/**
 * React context for CoreServices.
 * 
 * The app shell populates this via CoreServicesBridge in App.tsx.
 * Modules consume it via useCoreServices() — never importing
 * from @renderer/context/* directly.
 */
export const CoreServicesContext = createContext<CoreServices | null>(null);

/**
 * Hook for modules to access core services (vaultPath, config, settings, toast).
 * 
 * @example
 * ```tsx
 * import { useCoreServices } from '@citadel-app/ui';
 * 
 * const MyModuleProvider = ({ children }) => {
 *   const { vaultPath, settings, toast } = useCoreServices();
 *   // ...
 * };
 * ```
 */
export const useCoreServices = (): CoreServices => {
    const ctx = useContext(CoreServicesContext);
    if (!ctx) {
        throw new Error(
            'useCoreServices must be used within a CoreServicesProvider. ' +
            'Ensure CoreServicesBridge is mounted in App.tsx.'
        );
    }
    return ctx;
};
