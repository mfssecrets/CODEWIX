"use client";

import { use } from "react";
import { useAuth } from "@/components/auth-provider";
import Spinner from "@/components/spinner";
import Home from "../page";

export default function UserHomePage({
  params,
}: {
  params: Promise<{ uuid: string }>;
}) {
  const { uuid } = use(params);
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
    }

  if (!user || user.id !== uuid) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Spinner />
          <p className="mt-4 text-sm text-gray-500">Verifying access...</p>
        </div>
      </div>
    );
  }

  // Render the same homepage — Header will show user's name via AuthProvider
  return <Home />;
}

export const runtime = "edge";
