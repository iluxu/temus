declare module "culori" {
  export type Color = unknown;
  export type HslColor = {
    h?: number | null;
    s?: number | null;
    l?: number | null;
  };

  export function parse(value: string): Color | null;
  export function converter(mode: string): (color: Color) => HslColor | null;
}
