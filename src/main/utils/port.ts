import * as net from 'net';

const RESTRICTED_PORTS = [
  1, 7, 9, 11, 13, 15, 17, 19, 20, 21, 22, 23, 25, 37, 42, 43, 53, 69, 77, 79, 87, 101, 
  102, 103, 104, 109, 110, 111, 113, 115, 117, 119, 123, 135, 137, 138, 139, 143, 161, 
  162, 179, 389, 427, 465, 512, 513, 514, 515, 526, 530, 531, 532, 540, 548, 554, 556, 
  563, 587, 601, 636, 989, 990, 993, 995, 1719, 1720, 1723, 2049, 3659, 4045, 5060, 
  5061, 6000, 6566, 6665, 6666, 6667, 6668, 6669, 6697, 10080
];

/**
 * Finds an available port starting from the given port.
 * @param startPort The port to start searching from.
 * @returns A promise that resolves to an available port.
 */
export async function findAvailablePort(startPort: number): Promise<number> {
    const isPortAvailable = (port: number): Promise<boolean> => {
        if (RESTRICTED_PORTS.includes(port)) return Promise.resolve(false);
        
        return new Promise((resolve) => {
            const server = net.createServer();
            server.once('error', () => resolve(false));
            server.once('listening', () => {
                server.close();
                resolve(true);
            });
            // Binding to 0.0.0.0 checks availability across all network interfaces
            server.listen(port, '0.0.0.0');
        });
    };

    let port = startPort;
    while (port < startPort + 100) {
        if (await isPortAvailable(port)) return port;
        port++;
    }
    throw new Error(`Could not find an available port starting from ${startPort}`);
}
