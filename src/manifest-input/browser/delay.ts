
export function delay<T>(ms: string) {
  return (x: T) => new Promise<T>((resolve) => {
    setTimeout(resolve, parseInt(ms), x);
  });
}
