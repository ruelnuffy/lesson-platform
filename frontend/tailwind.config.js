/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', "ui-sans-serif", "system-ui", "-apple-system", "sans-serif"],
        mono: ['"Inter"', "ui-sans-serif", "system-ui", "-apple-system", "sans-serif"],
      },
      backgroundImage: {
        "dot-grid": "radial-gradient(rgba(37, 99, 235, 0.16) 1px, transparent 1px)",
      },
      boxShadow: {
        nav: "0 4px 20px -4px rgba(15, 23, 42, 0.08)",
        pill: "0 4px 16px -2px rgba(15, 23, 42, 0.12), 0 12px 32px -4px rgba(15, 23, 42, 0.14)",
        soft: "0 2px 8px -2px rgba(15, 23, 42, 0.05), 0 10px 28px -8px rgba(15, 23, 42, 0.08)",
        elevated:
          "0 4px 12px -2px rgba(15, 23, 42, 0.08), 0 22px 48px -12px rgba(15, 23, 42, 0.16)",
      },
    },
  },
  plugins: [],
};
