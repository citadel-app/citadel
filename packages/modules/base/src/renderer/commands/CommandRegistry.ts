import { AppCommand } from '@citadel-app/core';
import { hostApi as __hostApi } from '../host-services';

type CommandListener = (commands: AppCommand[]) => void;

class CommandRegistry {
    private commands: Map<string, AppCommand> = new Map();
    private listeners: Set<CommandListener> = new Set();

    /**
     * Registers a new command. If a command with the same ID exists, it will be overwritten.
     */
    register(command: AppCommand): () => void {
        this.commands.set(command.id, command);
        this.notifyListeners();
        this.syncWithMain();
        
        // Return unregister function
        return () => this.unregister(command.id);
    }

    /**
     * Unregisters a command by ID.
     */
    unregister(id: string) {
        if (this.commands.delete(id)) {
            this.notifyListeners();
            this.syncWithMain();
        }
    }

    /**
     * Executes a command by ID.
     */
    async execute(id: string, context?: any): Promise<void> {
        const command = this.commands.get(id);
        if (!command) {
            console.error(`[CommandRegistry] Command not found: ${id}`);
            return;
        }

        try {
            // Handle navigation if target is specified
            if (command.navigationTarget) {
                // This assumes we have access to navigation, or the handler manages it.
                // However, common pattern is to navigate BEFORE execution if it's a UI command.
                console.log(`[CommandRegistry] Navigating to ${command.navigationTarget} for command ${id}`);
                // We'll rely on the handler to navigate for now, or we can emit an event.
            }
            await command.handler(context);
        } catch (error) {
            console.error(`[CommandRegistry] Error executing command ${id}:`, error);
        }
    }

    /**
     * Returns a command by ID.
     */
    getCommand(id: string): AppCommand | undefined {
        return this.commands.get(id);
    }

    /**
     * Returns all registered commands.
     */
    getCommands(): AppCommand[] {
        return Array.from(this.commands.values());
    }

    /**
     * Searches for commands matching a query.
     */
    search(query: string): AppCommand[] {
        if (!query) return this.getCommands();
        const lowerQuery = query.toLowerCase();
        return this.getCommands().filter(cmd => 
            cmd.name.toLowerCase().includes(lowerQuery) || 
            cmd.description?.toLowerCase().includes(lowerQuery) ||
            cmd.category?.toLowerCase().includes(lowerQuery) ||
            cmd.synonyms?.some(syn => syn.toLowerCase().includes(lowerQuery))
        );
    }

    /**
     * Subscribe to changes in the command list.
     */
    subscribe(listener: CommandListener): () => void {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    private notifyListeners() {
        const commands = this.getCommands();
        this.listeners.forEach(listener => listener(commands));
    }

    private syncWithMain() {
        const commandDefinitions = this.getCommands().map(cmd => ({
            id: cmd.id,
            name: cmd.name,
            description: cmd.description,
            category: cmd.category,
            shortcut: cmd.shortcut
        }));
        
        // __hostApi.commands.sync(commandDefinitions);
        // We'll use the low-level IPC for now if the specific API doesn't exist yet
        try {
            window.electron.ipcRenderer.send('command:sync-to-main', commandDefinitions);
        } catch (e) {
            console.warn('[CommandRegistry] Failed to sync with main process:', e);
        }
    }
}

// Singleton instance
export const commandRegistry = new CommandRegistry();
