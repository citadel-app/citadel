/// <reference types="vite/client" />

declare module '*.liquid?raw' {
    const content: string;
    export default content;
}

