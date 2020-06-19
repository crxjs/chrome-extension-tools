export function resolvePath<T>(object: Record<string, any>, path: string, defaultValue?: T) {
  return path.split('.').reduce((o, p) => (o ? o[p] : defaultValue), object) as T;
}
