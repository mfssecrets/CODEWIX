"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import Header from "@/components/header";
import {
  Loader2,
  FolderOpen,
  ChevronLeft,
  ChevronRight,
  Eye,
  AlertCircle,
  LayoutGrid,
} from "lucide-react";
import Link from "next/link";

interface Project {
  id: string;
  chat_id: string;
  name: string;
  type: string;
  created_at: string;
  updated_at: string;
}

interface Pagination {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function MyAppsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { uuid } = useParams<{ uuid: string }>();
  const { user, loading: authLoading } = useAuth();

  const [projects, setProjects] = useState<Project[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [navigating, setNavigating] = useState(false);

  const currentPage = parseInt(searchParams.get("page") || "1", 10);

  const fetchProjects = useCallback(async (page: number) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/projects?page=${page}`);
      if (res.status === 401) {
        router.replace("/signin");
        return;
      }
      if (!res.ok) {
        setError("Failed to load your projects. Please try again.");
        return;
      }
      const data = await res.json();
      setProjects(data.projects ?? []);
      setPagination(data.pagination ?? null);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/signin");
      return;
    }
    if (user.id !== uuid) {
      router.replace(`/${user.id}/my-apps`);
      return;
    }
    fetchProjects(currentPage);
  }, [authLoading, user, uuid, currentPage, fetchProjects, router]);

  const handlePageChange = (newPage: number) => {
    router.push(`/${uuid}/my-apps?page=${newPage}`);
  };

  const handleView = (project: Project) => {
    setNavigating(true);
    router.push(`/${uuid}/build/${project.id}`);
  };

  if (authLoading || (loading && projects.length === 0 && !error)) {
    return (
      <div className="relative flex grow flex-col">
        <Header />
        <div className="flex grow items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            <p className="text-sm text-gray-500">Loading your apps...</p>
          </div>
        </div>
      </div>
    );
  }

  if (navigating) {
    return (
      <div className="relative flex grow flex-col">
        <Header />
        <div className="flex grow items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            <p className="text-sm text-gray-500">Opening project...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex grow flex-col">
      <Header />

      <div className="mx-auto w-full max-w-4xl px-4 py-8 lg:px-8">
        {/* Breadcrumb / Back */}
        <div className="mb-6 flex items-center gap-2 text-sm">
          <Link
            href={`/${uuid}`}
            className="text-indigo-500 transition-colors hover:text-indigo-700"
          >
            Home
          </Link>
          <span className="text-gray-400">/</span>
          <span className="font-medium text-gray-700">My Apps</span>
        </div>

        {/* Title */}
        <div className="mb-6 flex items-center gap-3">
          <LayoutGrid className="h-6 w-6 text-indigo-600" />
          <h1 className="text-2xl font-bold text-gray-900">My Apps</h1>
          {pagination && (
            <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
              {pagination.totalCount} project{pagination.totalCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
            <p className="text-sm text-red-600">{error}</p>
            <button
              onClick={() => fetchProjects(currentPage)}
              className="ml-auto text-sm font-medium text-red-600 hover:text-red-800"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && projects.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-16">
            <FolderOpen className="mb-4 h-16 w-16 text-gray-300" />
            <h2 className="text-lg font-semibold text-gray-700">No apps yet</h2>
            <p className="mt-1 max-w-sm text-center text-sm text-gray-500">
              Create your first website or web app with CodeWix.
            </p>
            <Link
              href={`/${uuid}`}
              className="mt-6 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
            >
              Create Your First App
            </Link>
          </div>
        )}

        {/* Projects Table */}
        {!loading && !error && projects.length > 0 && (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm md:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Type
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                      View
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {projects.map((project) => (
                    <tr key={project.id} className="transition-colors hover:bg-gray-50">
                      <td className="whitespace-nowrap px-4 py-3.5 text-sm text-gray-600">
                        {formatDate(project.created_at)}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-sm font-medium text-gray-900">
                          {project.name}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            project.type === "Web App"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {project.type}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => handleView(project)}
                          disabled={navigating}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="space-y-3 md:hidden">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {project.name}
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 font-medium ${
                          project.type === "Web App"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {project.type}
                      </span>
                      <span>{formatDate(project.created_at)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleView(project)}
                    disabled={navigating}
                    className="ml-3 shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    View
                  </button>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={!pagination.hasPrevPage || loading}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Prev
                </button>
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      disabled={loading}
                      className={`min-w-[36px] rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
                        page === currentPage
                          ? "bg-indigo-600 text-white"
                          : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {page}
                    </button>
                  )
                )}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={!pagination.hasNextPage || loading}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        )}

        {/* Loading overlay for pagination changes */}
        {loading && projects.length > 0 && (
          <div className="mt-4 flex items-center justify-center gap-2 py-8">
            <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
            <p className="text-sm text-gray-500">Loading...</p>
          </div>
        )}
      </div>
    </div>
  );
}
