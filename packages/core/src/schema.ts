import { z } from "zod";
import { THEME_TOKEN_KEYS } from "./tokens";

const tokenShape: Record<string, z.ZodTypeAny> = Object.fromEntries(
  THEME_TOKEN_KEYS.map((key) => [key, z.string().min(1)])
);

export const themeTokensSchema = z.object(tokenShape).strict();

export const themeSchema = z
  .object({
    name: z.string().min(1),
    author: z.string().min(1),
    modes: z.object({
      light: themeTokensSchema,
      dark: themeTokensSchema
    }),
    palette: z.array(z.string().min(1)).optional(),
    description: z.string().min(1).optional()
  })
  .strict();

export type Theme = z.infer<typeof themeSchema>;

export function validateTheme(data: unknown): Theme {
  return themeSchema.parse(data);
}
