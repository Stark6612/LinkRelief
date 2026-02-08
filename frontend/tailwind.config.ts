import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                background: "var(--background)",
                foreground: "var(--foreground)",
                safety: {
                    500: '#f97316', // Orange
                    600: '#ea580c',
                },
                dark: {
                    800: '#1f2937',
                    900: '#111827',
                }
            },
        },
    },
    plugins: [],
};
export default config;
