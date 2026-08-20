"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import Header from "@/components/header";
import { Loader2, AlertCircle } from "lucide-react";

export default function BuildProjectPage() {
  const router = useRouter();
  const { uuid, projectId } = useParams<{ uuid: string; projectId: string }>();
  const { user, loading: authLoading } = useAuth();
  const [error, setError] = useState("");
  const [loadingProject, setLoadingProject] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/signin");
      return;
    }

    // Load project from Supabase, get chatId, redirect to workspace
    async function loadProject() {
      try {
        const res = await fetch(`/api/projects/${projectId}`);
        if (res.status === 401) {
          router.replace("/signin");
          return;
        }
        if (res.status === 404) {
          setError("Project not found or access denied.");
          setLoadingProject(false);
          return;
        }
        if (!res.ok) {
          setError("Failed to load project. Please try again.");
          setLoadingProject(false);
          return;
        }
        const data = await res.json();
        const chatId = data.project.chat_id;
        if (!chatId) {
          setError("Project data is corrupted.");
          setLoadingProject(false);
          return;
        }
        // Redirect to the existing chat workspace
        router.replace(`/chats/${chatId}`);
      } catch {
        setError("Network error. Please try again.");
        setLoadingProject(false);
      }
    }

    loadProject();
  }, [authLoading, user, projectId, router]);

  return (
    <div className="relative flex grow flex-col">
      <Header />
      <div className="flex grow items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          {loadingProject && !error ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
              <p className="text-sm text-gray-500">Loading project workspace...</p>
            </>
          ) : error ? (
            <>
              <AlertCircle className="h-10 w-10 text-red-400" />
              <p className="text-sm text-red-600">{error}</p>
              <button
                onClick={() => router.push(`/${uuid}/my-apps`)}
                className="mt-2 text-sm font-medium text-indigo-600 hover:text-indigo-800"
              >
                Back to My Apps
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}