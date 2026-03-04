export interface ThemeVariables {
    primary: string;
    primaryForeground: string;
    primaryRgb: string;
}

export interface ThemeDefinition {
    id: string;
    name: string;
    light: ThemeVariables;
    dark: ThemeVariables;
}

export const THEMES: ThemeDefinition[] = [
    {
        id: 'vscode',
        name: 'VS Code Blue',
        light: {
            primary: '222.2 47.4% 11.2%',
            primaryForeground: '210 40% 98%',
            primaryRgb: '15, 23, 42'
        },
        dark: {
            primary: '212 100% 48%',
            primaryForeground: '0 0% 100%',
            primaryRgb: '0, 122, 204'
        }
    },
    {
        id: 'amethyst',
        name: 'Amethyst Purple',
        light: {
            primary: '262 83% 58%',
            primaryForeground: '0 0% 100%',
            primaryRgb: '139, 92, 246'
        },
        dark: {
            primary: '262 83% 58%',
            primaryForeground: '0 0% 100%',
            primaryRgb: '139, 92, 246'
        }
    },
    {
        id: 'emerald',
        name: 'Emerald Green',
        light: {
            primary: '142 70% 45%',
            primaryForeground: '0 0% 100%',
            primaryRgb: '16, 185, 129'
        },
        dark: {
            primary: '142 70% 45%',
            primaryForeground: '0 0% 100%',
            primaryRgb: '16, 185, 129'
        }
    },
    {
        id: 'rose',
        name: 'Rose Pink',
        light: {
            primary: '346 77% 49%',
            primaryForeground: '0 0% 100%',
            primaryRgb: '244, 63, 94'
        },
        dark: {
            primary: '346 77% 49%',
            primaryForeground: '0 0% 100%',
            primaryRgb: '244, 63, 94'
        }
    },
    {
        id: 'amber',
        name: 'Amber Gold',
        light: {
            primary: '38 92% 50%',
            primaryForeground: '0 0% 100%',
            primaryRgb: '245, 158, 11'
        },
        dark: {
            primary: '38 92% 50%',
            primaryForeground: '0 0% 100%',
            primaryRgb: '245, 158, 11'
        }
    }
];

export const getThemeById = (id: string) => THEMES.find(t => t.id === id) || THEMES[0];
