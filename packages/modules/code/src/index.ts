export * from './renderer';
// We don't export main here directly if it conflicts or if typescript resolution in frontend 
// prefers avoiding importing electron code. Usually frontend imports from `@citadel-app/code/renderer` 
// if defined this way, or we just export renderer here since that's what App.tsx imports.
