export const domain = process.env.NEXT_PUBLIC_DOMAIN
  ? process.env.NEXT_PUBLIC_DOMAIN
  : process.env.CF_PAGES_URL
    ? process.env.CF_PAGES_URL
    : process.env.NEXT_PUBLIC_DEVELOPMENT_URL
      ? process.env.NEXT_PUBLIC_DEVELOPMENT_URL
      : "http://localhost:3000";
