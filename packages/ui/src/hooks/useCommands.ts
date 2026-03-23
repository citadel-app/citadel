import { useEffect, useState } from 'react';
import { AppCommand } from '@citadel-app/core';
import { useCoreServices } from '../contexts/CoreServicesContext';

/**
 * Hook to retrieve and subscribe to the list of available commands.
 */
export function useCommands() {
    const { commandRegistry } = useCoreServices();
    const [commands, setCommands] = useState<AppCommand[]>(commandRegistry?.getCommands() || []);

    useEffect(() => {
        if (!commandRegistry) return;
        return commandRegistry.subscribe((updatedCommands) => {
            setCommands(updatedCommands);
        });
    }, [commandRegistry]);

    return {
        commands,
        executeCommand: (id: string, context?: any) => commandRegistry?.execute(id, context),
        searchCommands: (query: string) => commandRegistry?.search(query) || []
    };
}

/**
 * Hook to register a command within a component's lifecycle.
 */
export function useRegisterCommand(command: AppCommand | null) {
    const { commandRegistry } = useCoreServices();

    useEffect(() => {
        if (!command || !commandRegistry) return;
        return commandRegistry.register(command);
    }, [
        command?.id, 
        command?.name, 
        command?.description, 
        command?.category,
        command?.handler, // Note: If handler changes, it re-registers
        commandRegistry
    ]);
}
