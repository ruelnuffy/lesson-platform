/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        nav: "0 4px 20px -4px rgba(15, 23, 42, 0.06)",
        soft: "0 2px 8px -2px rgba(15, 23, 42, 0.05), 0 10px 28px -8px rgba(15, 23, 42, 0.08)",
        elevated:
          "0 4px 12px -2px rgba(15, 23, 42, 0.06), 0 22px 48px -12px rgba(15, 23, 42, 0.14)",
      },
    },
  },
  plugins: [],
};
