import { app } from 'electron';
import path from 'path';
import os from 'os';

export class GuardrailService {
  private activeWorkspacePath: string | null = null;
  private readonly allowedSystemPaths: string[];
  private allowedTemporaryPaths: Set<string> = new Set();

  constructor(initialWorkspace?: string | null) {
    this.activeWorkspacePath = initialWorkspace ? path.resolve(initialWorkspace) : null;
    
    // Whitelist core app and system temp directories
    this.allowedSystemPaths = [
      path.resolve(app.getPath('userData')),
      path.resolve(app.getPath('downloads')),
      path.resolve(os.tmpdir()),
      // Resources path for templates/assets
      path.resolve(process.resourcesPath)
    ];

    console.log('[GuardrailService] Initialized with allowed system paths:', this.allowedSystemPaths);
  }

  public setActiveWorkspace(workspacePath: string | null) {
    if (workspacePath) {
      this.activeWorkspacePath = path.resolve(workspacePath);
      // When a workspace is set as active, we can clear temporary probes
      this.allowedTemporaryPaths.clear();
      console.log(`[GuardrailService] Active workspace updated and temp paths cleared: ${this.activeWorkspacePath}`);
    } else {
      this.activeWorkspacePath = null;
    }
  }

  /**
   * Temporarily allows access to a path (e.g., after a user selects it in a dialog).
   * This permits probing the directory before it is formally set as the active workspace.
   */
  public allowPathTemporarily(targetPath: string) {
    const resolved = path.resolve(targetPath);
    this.allowedTemporaryPaths.add(resolved);
    console.log(`[GuardrailService] Path temporarily allowed for probing: ${resolved}`);
  }

  /**
   * Validates if a path is within the allowed boundaries (Workspace, UserData, Temp).
   * Prevents directory traversal (..) by resolving and normalizing the path first.
   */
  public isAllowedPath(targetPath: string): boolean {
    if (!targetPath) return false;

    try {
      const resolvedTarget = path.resolve(targetPath);

      // 1. Check Workspace
      if (this.activeWorkspacePath && this.isPathInside(this.activeWorkspacePath, resolvedTarget)) {
        return true;
      }

      // 2. Check Whitelisted System Paths
      for (const allowedPath of this.allowedSystemPaths) {
        if (this.isPathInside(allowedPath, resolvedTarget)) {
          return true;
        }
      }

      // 3. Check Temporarily Allowed Paths
      for (const tempPath of this.allowedTemporaryPaths) {
        if (this.isPathInside(tempPath, resolvedTarget)) {
          return true;
        }
      }

      return false;
    } catch (err) {
      console.error('[GuardrailService] Path validation error:', err);
      return false;
    }
  }

  /**
   * Robust check if a path is inside (or equal to) another path.
   */
  private isPathInside(parent: string, child: string): boolean {
    if (parent === child) return true;
    const relative = path.relative(parent, child);
    return !relative.startsWith('..') && !path.isAbsolute(relative);
  }

  /**
   * Throws an error if the path is not allowed. 
   * Useful for wrapping IPC handlers.
   */
  public validate(targetPath: string) {
    if (!this.isAllowedPath(targetPath)) {
      console.error(`[GuardrailService] Access Denied: Unauthorized path access attempted -> ${targetPath}`);
      throw new Error(`Access Denied: Path is outside of allowed workspace or system boundaries.`);
    }
  }
}
