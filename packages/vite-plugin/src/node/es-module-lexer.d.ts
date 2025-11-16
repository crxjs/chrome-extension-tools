// es-module-lexer types are not resolved correctly with moduleResolution: bundler
// Re-exporting the types manually
declare module 'es-module-lexer' {
  export interface ImportSpecifier {
    readonly n: string | undefined;
    readonly s: number;
    readonly e: number;
    readonly ss: number;
    readonly se: number;
    readonly d: number;
    readonly a: number;
  }

  export const init: Promise<void>;

  export function parse(
    source: string,
    name?: string
  ): readonly [
    imports: ReadonlyArray<ImportSpecifier>,
    exports: ReadonlyArray<string>,
    facade: boolean
  ];
}
