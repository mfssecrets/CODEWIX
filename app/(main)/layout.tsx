import Providers from "@/app/(main)/providers";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/components/auth-provider";

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Providers>
      <AuthProvider>
        <body className="flex min-h-full flex-col bg-gray-100 text-gray-900 antialiased">
          {children}
          <Toaster />
        </body>
      </AuthProvider>
    </Providers>
  );
}
