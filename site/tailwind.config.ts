import type { Config } from "tailwindcss";
import { shadcnTailwindPreset } from "@codex-theme/shadcn";

const config: Config = {
  presets: [shadcnTailwindPreset],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {}
  },
  plugins: []
};

export default config;
