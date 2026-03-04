import { spawn, ChildProcess, exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { is } from '@electron-toolkit/utils';
import { AppSettingsService } from './AppSettingsService';

const execAsync = promisify(exec);

type ServiceType = 'execution' | 'tts';

interface ServiceStatus {
    name: ServiceType;
    status: 'running' | 'stopped' | 'error';
    pid?: number;
    error?: string;
}

export class BackendServiceManager {
    private processes: Map<ServiceType, ChildProcess> = new Map();
    private dockerPath: string = 'docker';
    private settings: AppSettingsService;
    private scriptPaths: Record<string, string>;
    private isDockerAvailable: boolean | null = null;

    constructor(settings: AppSettingsService) {
        this.settings = settings;
        // Scripts directory where Dockerfiles are located
        const srcDir = is.dev 
            ? path.join(process.cwd(), 'src/python') 
            : path.join(process.resourcesPath, 'tts-service', 'src', 'python'); 

        this.scriptPaths = {
            execution: srcDir,
            tts: srcDir
        };

        this.checkDocker();
    }

    private async checkDocker() {
        try {
            await execAsync(`${this.dockerPath} --version`);
            this.isDockerAvailable = true;
            console.log('[BackendServiceManager] Docker is available.');
        } catch (e) {
            this.isDockerAvailable = false;
            console.error('[BackendServiceManager] Docker is NOT available. Backend services will fail to start.');
        }
    }

    async start(service: ServiceType): Promise<boolean> {
        // Wait for checkDocker to complete if it hasn't yet
        if (this.isDockerAvailable === null) {
            await this.checkDocker();
        }

        if (this.isDockerAvailable === false) return false;
        
        if (this.processes.has(service)) {
            console.log(`[BackendServiceManager] Service ${service} is already running (tracked).`);
            return true;
        }

        const containerName = `codex-${service}`;

        // Check if container already running via docker inspect
        try {
            await execAsync(`${this.dockerPath} inspect ${containerName}`);
            // If inspect succeeds, check if running
            const { stdout } = await execAsync(`${this.dockerPath} inspect -f "{{.State.Running}}" ${containerName}`);
            const isRunning = stdout.trim() === 'true';
            
            if (isRunning) {
               console.log(`[BackendServiceManager] Container ${containerName} is already running.`);
               return true;
            } else {
               // Exists but stopped, we can just start it
               console.log(`[BackendServiceManager] Container ${containerName} exists but is stopped. Starting...`);
               const startCmd = `${this.dockerPath} start -a ${containerName}`;
               const startChild = spawn(startCmd, { shell: true });
               
               startChild.stdout?.on('data', (data) => console.log(`[${service.toUpperCase()}] ${data}`));
               startChild.stderr?.on('data', (data) => console.error(`[${service.toUpperCase()}] ${data}`));
               
               startChild.on('close', (code) => {
                   if (code !== 0 && code !== null) {
                       console.error(`[BackendServiceManager] ${service} start failed with code ${code}`);
                   }
                   this.processes.delete(service);
               });

               this.processes.set(service, startChild);
               return true;
            }
        } catch (e) {
            // Doesn't exist, proceed to build/run
        }
        
        const imageName = `codex-${service}`;
        const dockerfile = service === 'execution' ? 'Dockerfile.execution' : 'Dockerfile.tts';
        
        console.log(`[BackendServiceManager] Building image ${imageName}...`);

        const contextDir = this.scriptPaths[service];
        const buildCmd = `${this.dockerPath} build -t ${imageName} -f ${dockerfile} .`;
        const ttsDataPath = this.settings.getSetting('ttsDataPath');
        const ttsVolume = ttsDataPath ? `-v "${ttsDataPath}":/app/.tts_cache` : '';

        const runCmd = service === 'execution' 
            ? `${this.dockerPath} run -p 5051:5051 --name ${containerName} --label managed-by=codex --label role=backend-service --label service-name=${service} -v //var/run/docker.sock:/var/run/docker.sock ${imageName}`
            : `${this.dockerPath} run -p 5050:5050 ${ttsVolume} --name ${containerName} --label managed-by=codex --label role=backend-service --label service-name=${service} ${imageName}`;

        const fullCmd = `${buildCmd} && ${runCmd}`;
        
        console.log(`[BackendServiceManager] Executing: ${fullCmd}`);

        const child = spawn(fullCmd, {
            cwd: contextDir,
            shell: true,
            detached: false
        });

        child.stdout?.on('data', (data) => console.log(`[${service.toUpperCase()}] ${data}`));
        child.stderr?.on('data', (data) => console.error(`[${service.toUpperCase()}] ${data}`));
        
        child.on('close', (code) => {
            if (code !== 0 && code !== null) {
                 console.error(`[BackendServiceManager] ${service} exited with code ${code}`);
            }
            this.processes.delete(service);
        });

        this.processes.set(service, child);
        return true;
    }

    async stop(service: ServiceType): Promise<boolean> {
        const containerName = `codex-${service}`;
        console.log(`[BackendServiceManager] Stopping container ${containerName}...`);
        try {
            await execAsync(`${this.dockerPath} stop ${containerName}`);
            return true;
        } catch (e) {
            console.error(`[BackendServiceManager] Error stopping ${service}:`, e);
            return false;
        }
    }

    stopAll() {
        this.stop('execution');
        this.stop('tts');
    }

    getStatus(service: ServiceType): ServiceStatus {
       const isTracked = this.processes.has(service);
       return {
           name: service,
           status: isTracked ? 'running' : 'stopped'
       };
    }
}
