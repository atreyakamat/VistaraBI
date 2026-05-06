const config = {
  plugins: {
    "@tailwindcss/postcss": {
      // Disable features that generate modern CSS color functions to avoid parser errors
      future: {
        // Use stable CSS features only
      },
    },
  },
};

export default config;
