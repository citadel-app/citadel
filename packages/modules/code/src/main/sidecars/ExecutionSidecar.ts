import { ISidecarConfig, AbstractDockerSidecar } from '@citadel-app/core';
import { spawn } from 'child_process';

export class ExecutionSidecar extends AbstractDockerSidecar {
    
    constructor() {
        const config: ISidecarConfig = {
            id: 'execution',
            type: 'daemon',
            containerName: 'codex-execution',
            image: 'ghcr.io/citadel-app/sidecar-execution:latest',
            ports: ['5051:5051']
        };
        super(config);
    }

    protected buildDockerRunArgs(): string[] {
        // Execution container needs access to the host's Docker socket to spawn sub-containers
        const dockerSocket = process.platform === 'win32' ? '//var/run/docker.sock:/var/run/docker.sock' : '/var/run/docker.sock:/var/run/docker.sock';
        this.config.volumes = [dockerSocket];
        
        return super.buildDockerRunArgs();
    }

    protected async onBeforeStart(): Promise<boolean> {
        console.log(`[Sidecar:execution] Pulling execution image ${this.config.image}...`);
        
        return new Promise<boolean>((resolve) => {
            const pullCmd = `${this.dockerPath} pull ${this.config.image}`;
            // We don't need a specific cwd anymore
            const pullChild = spawn(pullCmd, { shell: true });
            
            pullChild.stdout.on('data', (data) => console.log(`[Sidecar:execution:pull] ${data}`));
            pullChild.stderr.on('data', (data) => console.error(`[Sidecar:execution:pull] ${data}`));

            pullChild.on('close', (code) => {
                if (code !== 0) {
                    console.error(`[Sidecar:execution] Docker pull failed with code ${code}. Will attempt boot with cached image if available.`);
                    // We don't hard fail if pull fails (user might be offline but have image cached)
                    resolve(true);
                } else {
                    resolve(true);
                }
            });
        });
    }

    protected onClose(code: number | null): void {
        console.log(`[Sidecar:execution] Daemon naturally exited with code: ${code}`);
    }
}
