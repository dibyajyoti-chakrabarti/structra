// Window events that connect the API layer, the backend gate and the auth context.
export const BACKEND_READY = 'structra:backend-ready';
export const BACKEND_UNAVAILABLE = 'structra:backend-unavailable';

export function emit(name) {
  if (typeof window !== 'undefined' && typeof CustomEvent === 'function') {
    window.dispatchEvent(new CustomEvent(name));
  }
}
