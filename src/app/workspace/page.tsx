"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const API_URL =  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8080";

type Workspace = {
  id: number;
  name: string;
  createdAt: string;
};

export default function WorkspacesPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspaceName, setWorkspaceName] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadWorkspaces = async () => {
    const token = window.localStorage.getItem("token");

    if (!token) {
      window.location.replace("/login");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/workspaces`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (response.status === 401) {
        window.localStorage.removeItem("token");
        window.location.replace("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(`Failed to load workspaces: ${response.status}`);
      }

      const data: Workspace[] = await response.json();
      setWorkspaces(data);
    } catch (error) {
      console.error("Workspace loading error:", error);
      setErrorMessage(
        "Unable to load workspaces. Please make sure the backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadWorkspaces();
  }, []);

  const createWorkspace = async () => {
    const token = window.localStorage.getItem("token");

    if (!token) {
      window.location.replace("/login");
      return;
    }

    if (!workspaceName.trim()) {
      setErrorMessage("Workspace name is required.");
      return;
    }

    setCreating(true);
    setErrorMessage("");

    try {
      const response = await fetch(`${API_URL}/api/workspaces`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          name: workspaceName.trim(),
        }),
      });

      if (response.status === 401) {
        window.localStorage.removeItem("token");
        window.location.replace("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(
          `Failed to create workspace: ${response.status}`
        );
      }

      setWorkspaceName("");
      await loadWorkspaces();
    } catch (error) {
      console.error("Workspace creation error:", error);
      setErrorMessage("Unable to create workspace. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-blue-100 px-6 py-10">
      <div className="mx-auto max-w-5xl">

        {/* Header */}
        <div className="mb-8">
          <p className="mb-2 text-sm font-bold uppercase tracking-[0.22em] text-blue-600">
            Project Manager
          </p>

          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                My Workspaces
              </h1>

              <p className="mt-2 text-slate-500">
                Create and manage your project workspaces.
              </p>
            </div>

            <Link
              href="/dashboard"
              className="group inline-flex w-fit items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:-translate-x-0.5 hover:border-blue-300 hover:text-blue-600 hover:shadow-md"
            >
              <span className="text-lg transition-transform duration-200 group-hover:-translate-x-1">
                ←
              </span>
              Dashboard
            </Link>
          </div>
        </div>

        {/* Create Workspace */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg sm:p-7">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Create Workspace
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Set up a workspace for your projects and team.
            </p>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={workspaceName}
              onChange={(event) =>
                setWorkspaceName(event.target.value)
              }
              placeholder="Enter workspace name"
              disabled={creating}
              className="flex-1 rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
            />

            <button
              onClick={createWorkspace}
              disabled={creating}
              className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg disabled:cursor-not-allowed disabled:bg-blue-300 disabled:hover:translate-y-0"
            >
              {creating ? "Creating..." : "Create Workspace"}
            </button>
          </div>
        </section>

        {/* Error */}
        {errorMessage && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {errorMessage}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Loading workspaces...
            </p>
          </div>
        )}

        {/* Empty State */}
        {!loading &&
          !errorMessage &&
          workspaces.length === 0 && (
            <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
              <h2 className="text-lg font-bold text-slate-800">
                No workspaces yet
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Create your first workspace to get started.
              </p>
            </div>
          )}

        {/* Workspace List */}
        {!loading && workspaces.length > 0 && (
          <section className="mt-8">

            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">
                Your Workspaces
              </h2>

              <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-600">
                {workspaces.length}
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {workspaces.map((workspace) => (
                <div
                  key={workspace.id}
                  className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg"
                >
                  <div className="flex items-start justify-between gap-4">

                    <div>
                      <h2 className="text-xl font-bold text-slate-900">
                        {workspace.name}
                      </h2>

                      <p className="mt-2 text-sm text-slate-500">
                        Workspace ID: {workspace.id}
                      </p>
                    </div>

                    <div className="rounded-xl bg-blue-50 px-3 py-2 text-lg">
                      📁
                    </div>
                  </div>

                  {workspace.createdAt && (
                    <div className="mt-5 border-t border-slate-100 pt-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Created
                      </p>

                      <p className="mt-1 text-sm text-slate-600">
                        {new Date(
                          workspace.createdAt
                        ).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>

          </section>
        )}

      </div>
    </main>
  );
}

