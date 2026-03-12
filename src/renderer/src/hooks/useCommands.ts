import { useEffect, useState } from 'react';
import { AppCommand } from '@shared';
import { commandRegistry } from '../commands/CommandRegistry';

/**
 * Hook to retrieve and subscribe to the list of available commands.
 */
export function useCommands() {
    const [commands, setCommands] = useState<AppCommand[]>(commandRegistry.getCommands());

    useEffect(() => {
        return commandRegistry.subscribe((updatedCommands) => {
            setCommands(updatedCommands);
        });
    }, []);

    return {
        commands,
        executeCommand: (id: string, context?: any) => commandRegistry.execute(id, context),
        searchCommands: (query: string) => commandRegistry.search(query)
    };
}

/**
 * Hook to register a command within a component's lifecycle.
 */
export function useRegisterCommand(command: AppCommand | null) {
    useEffect(() => {
        if (!command) return;
        return commandRegistry.register(command);
    }, [
        command?.id, 
        command?.name, 
        command?.description, 
        command?.category,
        command?.handler // Note: If handler changes, it re-registers
    ]);
}
