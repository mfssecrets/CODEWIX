import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CodeWix – Authentication",
  description: "Sign in or create your CodeWix account.",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="flex min-h-full flex-col items-center justify-center bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] text-gray-100 antialiased">
        {children}
      </body>
    </html>
  );
}
