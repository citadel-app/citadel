import { spawn, ChildProcess, exec } from 'child_process';
import { promisify } from 'util';
import { ISidecar, ISidecarConfig, SidecarStatus } from './types';

const execAsyncRaw = promisify(exec);
const execAsync = (cmd: string, options: any = {}) => {
    return Promise.race([
        execAsyncRaw(cmd, options),
        new Promise((_, reject) => 
            setTimeout(() => reject(new Error(`Command timed out: ${cmd}`)), 10000)
        )
    ]) as Promise<{ stdout: string, stderr: string }>;
};

export abstract class AbstractDockerSidecar implements ISidecar {
    public readonly config: ISidecarConfig;
    public status: SidecarStatus = 'stopped';
    protected process?: ChildProcess;
    protected dockerPath: string = 'docker';

    constructor(config: ISidecarConfig) {
        this.config = config;
    }

    public async isRuntimeActive(): Promise<boolean> {
        try {
            const { stdout } = await execAsync(`${this.dockerPath} inspect -f "{{.State.Running}}" ${this.config.containerName}`);
            return stdout.trim() === 'true';
        } catch {
            return false;
        }
    }

    public async start(): Promise<boolean> {
        if (this.status === 'running') return true;
        this.status = 'starting';

        try {
            // 1. Check if running already
            const isRunning = await this.isRuntimeActive();
            if (isRunning) {
                console.log(`[Sidecar:${this.config.id}] Already running.`);
                this.status = 'running';
                return true;
            }

            // 2. Custom pre-start hook (e.g. downloading models)
            const canStart = await this.onBeforeStart();
            if (!canStart) {
                this.status = 'error';
                return false;
            }

            // 3. Remove existing container if it exists (prevents stale images/volumes)
            try {
                await execAsync(`${this.dockerPath} inspect --type=container ${this.config.containerName}`);
                console.log(`[Sidecar:${this.config.id}] Removing stale container...`);
                await execAsync(`${this.dockerPath} rm -f ${this.config.containerName}`);
            } catch {
                // Ignore, container doesn't exist
            }

            // 4. Build custom Docker command
            const args = this.buildDockerRunArgs();
            console.log(`[Sidecar:${this.config.id}] Executing: docker ${args.join(' ')}`);
            
            this.process = spawn(this.dockerPath, args);
            this.setupProcessHandlers();
            this.status = 'running';
            return true;

        } catch (error) {
            console.error(`[Sidecar:${this.config.id}] Failed to start:`, error);
            this.status = 'error';
            return false;
        }
    }

    public async stop(): Promise<boolean> {
        if (this.status === 'stopped') return true;
        this.status = 'stopping';

        try {
            console.log(`[Sidecar:${this.config.id}] Stopping container...`);
            await execAsync(`${this.dockerPath} stop ${this.config.containerName}`);
            this.status = 'stopped';
            
            // Allow concrete classes to clean up (like `docker rm` for REPLs)
            await this.onAfterStop();
            
            return true;
        } catch (e: any) {
            if (e.stderr?.includes('No such container') || e.message?.includes('No such container')) {
                this.status = 'stopped';
                return true;
            }
            console.error(`[Sidecar:${this.config.id}] Error stopping:`, e);
            this.status = 'error';
            return false;
        }
    }

    public sendInput(data: string): void {
        if (this.process && this.process.stdin && this.config.type === 'repl') {
            this.process.stdin.write(data);
        } else {
            console.warn(`[Sidecar:${this.config.id}] Cannot send input, process dead or not a REPL.`);
        }
    }

    protected setupProcessHandlers(): void {
        if (!this.process) return;

        this.process.stdout?.on('data', (data) => this.onStdout(data.toString()));
        this.process.stderr?.on('data', (data) => this.onStderr(data.toString()));

        this.process.on('close', (code) => {
            if (code !== 0 && code !== null) {
                 console.error(`[Sidecar:${this.config.id}] Exited with code ${code}`);
                 this.status = 'error';
            } else {
                 this.status = 'stopped';
            }
            this.process = undefined;
            this.onClose(code);
        });
    }

    /**
     * Build the arguments array for `docker run`.
     */
    protected buildDockerRunArgs(): string[] {
        const args = ['run', '--name', this.config.containerName];

        if (this.config.type === 'repl') {
            args.push('-i'); // Interactive
            args.push('--rm'); // Remove on exit
        }

        // Labels
        args.push('--label', 'managed-by=codex');
        args.push('--label', `service-id=${this.config.id}`);
        if (this.config.labels) {
            Object.entries(this.config.labels).forEach(([k, v]) => {
                args.push('--label', `${k}=${v}`);
            });
        }

        // Ports
        if (this.config.ports) {
            this.config.ports.forEach(port => {
                args.push('-p', port);
            });
        }

        // Volumes
        if (this.config.volumes) {
            this.config.volumes.forEach(vol => {
                args.push('-v', vol);
            });
        }

        args.push(this.config.image);

        if (this.config.command) {
            args.push(...this.config.command);
        }

        return args;
    }

    // Hooks for concrete implementations
    protected async onBeforeStart(): Promise<boolean> { return true; }
    protected async onAfterStop(): Promise<void> {}
    protected onStdout(data: string): void { console.log(`[${this.config.id}] ${data.trim()}`); }
    protected onStderr(data: string): void { console.error(`[${this.config.id}] ERR: ${data.trim()}`); }
    protected onClose(_code: number | null): void {}
}
