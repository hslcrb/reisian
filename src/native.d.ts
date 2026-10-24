import type { NativeBridge } from './core/types';
declare global { interface Window { reisian?: NativeBridge; } }
export {};
