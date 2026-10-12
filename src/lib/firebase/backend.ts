/**
 * Type-checking entry only. At runtime Metro picks backend.native.ts on
 * Android/iOS and backend.web.ts on web (platform-specific extensions win).
 */
export { backend } from './backend.web';
