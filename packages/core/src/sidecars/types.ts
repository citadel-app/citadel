export type SidecarStatus = 'starting' | 'running' | 'stopping' | 'stopped' | 'error';
export type SidecarType = 'daemon' | 'repl';

export interface ISidecarConfig {
    id: string;
    type: SidecarType;
    image: string;
    containerName: string;
    volumes?: string[];
    ports?: string[];
    environment?: Record<string, string>;
    labels?: Record<string, string>;
    command?: string[];
    timeoutSeconds?: number;
}

export interface ISidecar {
    readonly config: ISidecarConfig;
    readonly status: SidecarStatus;

    /**
     * Boot up the sidecar container
     */
    start(): Promise<boolean>;

    /**
     * Stop the sidecar container gracefully
     */
    stop(): Promise<boolean>;

    /**
     * Send standard input to a REPL sidecar
     */
    sendInput?(data: string): void;

    /**
     * Check if the container is physically running in the background engine
     */
    isRuntimeActive(): Promise<boolean>;
}
