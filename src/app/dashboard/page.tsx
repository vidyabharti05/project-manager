
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";

import Link from "next/link";

const API_URL = "http://localhost:8080";

type TaskForm = {
  title: string;
  description: string;
  priority: string;
  status: string;
  dueDate: string;
  projectId: number | null;
};

type Project = {
  id: number;
  name: string | null;
  description: string | null;
};

type BackendTask = {
  id: number;
  title: string | null;
  description: string | null;
  priority: string | null;
  status: string | null;
  dueDate: string | null;
  project?: {
    id: number;
    name: string | null;
  } | null;
};

type CountValue =
  | number
  | string
  | {
      count?: number | string;
    };

const EMPTY_TASK_FORM: TaskForm = {
  title: "",
  description: "",
  priority: "Medium",
  status: "TODO",
  dueDate: "",
  projectId: null,
};

const toSafeString = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback;

const toSafeNumber = (value: unknown, fallback = 0): number => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
};

const normalizeTask = (task: BackendTask): BackendTask => ({
  ...task,
  title: task.title ?? "",
  description: task.description ?? "",
  priority: task.priority ?? "Medium",
  status: task.status ?? "TODO",
  dueDate: task.dueDate ?? "",
  project: task.project
    ? {
        ...task.project,
        name: task.project.name ?? "",
      }
    : null,
});

const normalizeProject = (project: Project): Project => ({
  ...project,
  name: project.name ?? "",
  description: project.description ?? "",
});

export default function DashboardPage() {
  const [username, setUsername] = useState("User");

  const [tasks, setTasks] = useState<BackendTask[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  /* ---------------- PROTECT DASHBOARD ---------------- */

    useEffect(() => {
      const token = window.localStorage.getItem("token");

      if (!token) {
        window.location.replace("/login");
      }
    }, []);

  

  const [selectedProject, setSelectedProject] =
    useState<Project | null>(null);

  const [projectTasks, setProjectTasks] = useState<BackendTask[]>([]);

  const [form, setForm] = useState<TaskForm>(EMPTY_TASK_FORM);

  const [editingId, setEditingId] = useState<number | null>(null);

  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");

  const [editingProjectId, setEditingProjectId] =
    useState<number | null>(null);

  const [projectCount, setProjectCount] = useState(0);
  const [taskCount, setTaskCount] = useState(0);
  const [activeTaskCount, setActiveTaskCount] = useState(0);
  const [completedTaskCount, setCompletedTaskCount] = useState(0);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [projectFilter, setProjectFilter] = useState("ALL");

  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  /* ---------------- AUTH ---------------- */

  const authFetch = useCallback(
    async (
      endpoint: string,
      options: RequestInit = {}
    ): Promise<Response> => {
      if (typeof window === "undefined") {
        throw new Error("AUTH_REQUIRED");
      }

      const token = window.localStorage.getItem("token");

      if (!token) {
        window.location.replace("/login");
        throw new Error("AUTH_REQUIRED");
      }

      const headers = new Headers(options.headers);

      headers.set("Authorization", `Bearer ${token}`);

      if (options.body) {
        headers.set("Content-Type", "application/json");
      }

      let response: Response;

      try {
        response = await fetch(`${API_URL}${endpoint}`, {
          ...options,
          headers,
        });
      } catch (error) {
        console.error("Backend connection error:", error);
        throw new Error("BACKEND_CONNECTION_ERROR");
      }

      if (response.status === 401) {
        window.localStorage.removeItem("token");
        window.location.replace("/login");
        throw new Error("AUTH_REQUIRED");
      }

      return response;
    },
    []
  );

  const handleLogout = () => {
    window.localStorage.removeItem("token");
    window.location.replace("/login");
  };

  /* ---------------- LOAD USERNAME ---------------- */

  useEffect(() => {
    const savedUsername =
      window.localStorage.getItem("username");

    if (savedUsername) {
      setUsername(savedUsername);
    }
  }, []);

  /* ---------------- LOAD TASKS ---------------- */

  const loadTasks = useCallback(async () => {
    try {
      const response = await authFetch("/api/tasks");

      if (!response.ok) {
        throw new Error(`Failed to load tasks: ${response.status}`);
      }

      const data: unknown = await response.json();

      const taskList = Array.isArray(data) ? data : [];

      setTasks(
        taskList.map((task) =>
          normalizeTask(task as BackendTask)
        )
      );
    } catch (error) {
      console.error("Failed to load tasks:", error);

      if (
        error instanceof Error &&
        error.message === "BACKEND_CONNECTION_ERROR"
      ) {
        setErrorMessage(
          "Backend connection failed. Make sure Spring Boot is running on port 8080."
        );
      } else if (
        error instanceof Error &&
        error.message === "AUTH_REQUIRED"
      ) {
        setErrorMessage(
          "Your session has expired. Please login again."
        );
      } else {
        setErrorMessage("Failed to load tasks.");
      }
    }
  }, [authFetch]);

  /* ---------------- LOAD PROJECTS ---------------- */

  const loadProjects = useCallback(async () => {
    try {
      const response = await authFetch("/api/projects");

      if (!response.ok) {
        throw new Error(
          `Failed to load projects: ${response.status}`
        );
      }

      const data: unknown = await response.json();

      const projectList = Array.isArray(data) ? data : [];

      setProjects(
        projectList.map((project) =>
          normalizeProject(project as Project)
        )
      );
    } catch (error) {
      console.error("Failed to load projects:", error);
      setErrorMessage("Failed to load projects.");
    }
  }, [authFetch]);

  /* ---------------- COUNTS ---------------- */

  const parseCount = async (
    response: Response
  ): Promise<number> => {
    const text = await response.text();

    if (!text.trim()) {
      return 0;
    }

    try {
      const data: CountValue = JSON.parse(text);

      if (
        typeof data === "number" ||
        typeof data === "string"
      ) {
        return toSafeNumber(data);
      }

      if (
        typeof data === "object" &&
        data !== null &&
        "count" in data
      ) {
        return toSafeNumber(data.count);
      }

      return 0;
    } catch {
      return toSafeNumber(text);
    }
  };

  const loadStats = useCallback(async () => {
    try {
      const responses = await Promise.all([
        authFetch("/api/projects/count"),
        authFetch("/api/tasks/count"),
        authFetch("/api/tasks/active-count"),
        authFetch("/api/tasks/completed-count"),
      ]);

      if (responses.some((response) => !response.ok)) {
        throw new Error("Failed to load statistics");
      }

      const [
        totalProjects,
        totalTasks,
        activeTasks,
        completedTasks,
      ] = await Promise.all(responses.map(parseCount));

      setProjectCount(totalProjects);
      setTaskCount(totalTasks);
      setActiveTaskCount(activeTasks);
      setCompletedTaskCount(completedTasks);
    } catch (error) {
      console.error("Failed to load statistics:", error);
      setErrorMessage(
        "Failed to load dashboard statistics."
      );
    }
  }, [authFetch]);

  /* ---------------- INITIAL LOAD ---------------- */

  useEffect(() => {
    let mounted = true;

    const loadAllData = async () => {
      setPageLoading(true);

      await Promise.all([
        loadTasks(),
        loadProjects(),
        loadStats(),
      ]);

      if (mounted) {
        setPageLoading(false);
      }
    };

    void loadAllData();

    return () => {
      mounted = false;
    };
  }, [loadTasks, loadProjects, loadStats]);

  /* ---------------- TASK FORM ---------------- */

  const handleChange = (
    event: ChangeEvent<
      HTMLInputElement |
        HTMLTextAreaElement |
        HTMLSelectElement
    >
  ) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]:
        name === "projectId"
          ? value === ""
            ? null
            : Number(value)
          : value,
    }));
  };

  const handleEdit = (task: BackendTask) => {
    setEditingId(task.id);

    setForm({
      title: task.title ?? "",
      description: task.description ?? "",
      priority: task.priority ?? "Medium",
      status: task.status ?? "TODO",
      dueDate: task.dueDate ?? "",
      projectId: task.project?.id ?? null,
    });

    setErrorMessage("");
    setSuccessMessage("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setForm(EMPTY_TASK_FORM);
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!form.title.trim()) {
      setErrorMessage("Task title is required.");
      return;
    }

    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    const isEditing = editingId !== null;

    try {
      const endpoint = isEditing
        ? `/api/tasks/${editingId}`
        : "/api/tasks";

      const response = await authFetch(endpoint, {
        method: isEditing ? "PUT" : "POST",
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim(),
          priority: form.priority,
          status: form.status,
          dueDate: form.dueDate || null,
          projectId: form.projectId,
        }),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(
          message || `Failed to save task: ${response.status}`
        );
      }

      setForm(EMPTY_TASK_FORM);
      setEditingId(null);

      await Promise.all([
        loadTasks(),
        loadStats(),
      ]);

      setSuccessMessage(
        isEditing
          ? "Task updated successfully."
          : "Task created successfully."
      );
    } catch (error) {
      console.error("Failed to save task:", error);

      setErrorMessage(
        isEditing
          ? "Failed to update task."
          : "Failed to create task."
      );
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- DELETE TASK ---------------- */

  const deleteTask = async (id: number) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this task?"
    );

    if (!confirmed) return;

    try {
      setErrorMessage("");
      setSuccessMessage("");

      const response = await authFetch(
        `/api/tasks/${id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Delete failed");
      }

      await Promise.all([
        loadTasks(),
        loadStats(),
      ]);

      setSuccessMessage(
        "Task deleted successfully."
      );
    } catch (error) {
      console.error(error);
      setErrorMessage("Failed to delete task.");
    }
  };

  /* ---------------- PROJECT FORM ---------------- */

  const handleProjectSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!projectName.trim()) {
      setErrorMessage("Project name is required.");
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");

    const isEditing = editingProjectId !== null;

    try {
      const endpoint = isEditing
        ? `/api/projects/${editingProjectId}`
        : "/api/projects";

      const response = await authFetch(endpoint, {
        method: isEditing ? "PUT" : "POST",
        body: JSON.stringify({
          name: projectName.trim(),
          description: projectDescription.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error("Project save failed");
      }

      setProjectName("");
      setProjectDescription("");
      setEditingProjectId(null);

      await Promise.all([
        loadProjects(),
        loadStats(),
      ]);

      setSuccessMessage(
        isEditing
          ? "Project updated successfully."
          : "Project created successfully."
      );
    } catch (error) {
      console.error(error);

      setErrorMessage(
        isEditing
          ? "Failed to update project."
          : "Failed to create project."
      );
    }
  };

  const handleProjectEdit = (project: Project) => {
    setEditingProjectId(project.id);
    setProjectName(project.name ?? "");
    setProjectDescription(project.description ?? "");

    document
      .getElementById("project-form")
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
  };

  const handleProjectCancel = () => {
    setEditingProjectId(null);
    setProjectName("");
    setProjectDescription("");
  };

  /* ---------------- DELETE PROJECT ---------------- */

  const deleteProject = async (id: number) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this project?"
    );

    if (!confirmed) return;

    try {
      const response = await authFetch(
        `/api/projects/${id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Delete failed");
      }

      if (selectedProject?.id === id) {
        setSelectedProject(null);
        setProjectTasks([]);
      }

      await Promise.all([
        loadProjects(),
        loadTasks(),
        loadStats(),
      ]);

      setSuccessMessage(
        "Project deleted successfully."
      );
    } catch (error) {
      console.error(error);
      setErrorMessage("Failed to delete project.");
    }
  };

  /* ---------------- PROJECT TASKS ---------------- */

  const viewProjectTasks = async (
    project: Project
  ) => {
    try {
      setErrorMessage("");

      const response = await authFetch(
        `/api/projects/${project.id}/tasks`
      );

      if (!response.ok) {
        throw new Error("Failed to load project tasks");
      }

      const data: unknown = await response.json();

      const taskList = Array.isArray(data) ? data : [];

      setSelectedProject(project);

      setProjectTasks(
        taskList.map((task) =>
          normalizeTask(task as BackendTask)
        )
      );
    } catch (error) {
      console.error(error);
      setErrorMessage(
        "Failed to load project tasks."
      );
    }
  };

  /* ---------------- FILTERS ---------------- */

  const filteredTasks = useMemo(() => {
    const search = searchTerm
      .toLowerCase()
      .trim();

    return tasks.filter((task) => {
      const title = toSafeString(task.title);
      const description = toSafeString(
        task.description
      );

      const matchesSearch =
        title.toLowerCase().includes(search) ||
        description.toLowerCase().includes(search);

      const matchesStatus =
        statusFilter === "ALL" ||
        task.status === statusFilter;

      const matchesPriority =
        priorityFilter === "ALL" ||
        task.priority === priorityFilter;

      const projectId =
        task.project?.id ?? null;

      const matchesProject =
        projectFilter === "ALL" ||
        projectId === Number(projectFilter);

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPriority &&
        matchesProject
      );
    });
  }, [
    tasks,
    searchTerm,
    statusFilter,
    priorityFilter,
    projectFilter,
  ]);

  /* ---------------- DATE ANALYSIS ---------------- */

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdueTasks = tasks.filter((task) => {
    if (
      !task.dueDate ||
      task.status === "COMPLETED"
    ) {
      return false;
    }

    const dueDate = new Date(task.dueDate);
    dueDate.setHours(0, 0, 0, 0);

    return dueDate < today;
  });

  const dueTodayTasks = tasks.filter((task) => {
    if (
      !task.dueDate ||
      task.status === "COMPLETED"
    ) {
      return false;
    }

    const dueDate = new Date(task.dueDate);
    dueDate.setHours(0, 0, 0, 0);

    return (
      dueDate.getTime() === today.getTime()
    );
  });

  /* ---------------- LOADING ---------------- */

  if (pageLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

          <p className="font-medium text-slate-600">
            Loading dashboard...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl">

        {/* HEADER */}

        <header className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">

            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-blue-600">
                Project Manager
              </p>

              <h1 className="mt-2 text-3xl font-bold text-slate-900">
                Dashboard
              </h1>
              <Link
                href="/workspace"
                className="group inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition-all duration-200 hover:text-blue-600"
              >
                <span className="text-lg transition-transform duration-200 group-hover:-translate-x-1">
                    ←
                  </span>

               Workspace
              </Link>

              <p className="mt-2 text-slate-500">
                Welcome back,{" "}
                <span className="font-semibold text-slate-800">
                  {username}
                </span>
              </p>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Logout
            </button>

          </div>
        </header>

        {/* MESSAGES */}

        {successMessage && (
          <div className="mb-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-700">
            ✓ {successMessage}
          </div>
        )}

        {errorMessage && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            ⚠ {errorMessage}
          </div>
        )}

        {/* STATS */}

        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Total Projects
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-900">
              {projectCount}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Your projects
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Total Tasks
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-900">
              {taskCount}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              All tasks
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Active Tasks
            </p>

            <p className="mt-2 text-3xl font-bold text-blue-600">
              {activeTaskCount}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              To do + in progress
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Completed
            </p>

            <p className="mt-2 text-3xl font-bold text-green-600">
              {completedTaskCount}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Finished tasks
            </p>
          </div>

        </section>

        {/* DEADLINE SUMMARY */}

        <section className="mb-8 grid gap-4 sm:grid-cols-2">

          <div className="rounded-2xl border border-red-100 bg-red-50 p-5">
            <p className="text-sm font-semibold text-red-600">
              Overdue Tasks
            </p>

            <p className="mt-2 text-3xl font-bold text-red-700">
              {overdueTasks.length}
            </p>

            <p className="mt-1 text-sm text-red-500">
              Tasks that need your attention
            </p>
          </div>

          <div className="rounded-2xl border border-yellow-100 bg-yellow-50 p-5">
            <p className="text-sm font-semibold text-yellow-700">
              Due Today
            </p>

            <p className="mt-2 text-3xl font-bold text-yellow-800">
              {dueTodayTasks.length}
            </p>

            <p className="mt-1 text-sm text-yellow-600">
              Tasks due today
            </p>
          </div>

        </section>

        {/* CREATE TASK */}

        <section className="mb-8 rounded-2xl bg-white p-6 shadow-sm">

          <h2 className="mb-5 text-xl font-bold text-slate-900">
            {editingId !== null
              ? "Edit Task"
              : "Create New Task"}
          </h2>

          <form
            onSubmit={handleSubmit}
            className="grid gap-4 sm:grid-cols-2"
          >

            <div>
              <label className="text-sm font-semibold text-slate-700">
                Task Title
              </label>

              <input
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="Design homepage"
                required
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700">
                Priority
              </label>

              <select
                name="priority"
                value={form.priority}
                onChange={handleChange}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700">
                Status
              </label>

              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900"
              >
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">
                  In Progress
                </option>
                <option value="COMPLETED">
                  Completed
                </option>
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700">
                Due Date
              </label>

              <input
                name="dueDate"
                type="date"
                value={form.dueDate}
                onChange={handleChange}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700">
                Project
              </label>

              <select
                name="projectId"
                value={form.projectId ?? ""}
                onChange={handleChange}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900"
              >
                <option value="">
                  No Project
                </option>

                {projects.map((project) => (
                  <option
                    key={project.id}
                    value={project.id}
                  >
                    {project.name ||
                      "Unnamed Project"}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="text-sm font-semibold text-slate-700">
                Description
              </label>

              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={3}
                placeholder="Add task details..."
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900"
              />
            </div>

            <div className="flex justify-end gap-3 sm:col-span-2">

              {editingId !== null && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="rounded-lg bg-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-300"
                >
                  Cancel
                </button>
              )}

              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                {loading
                  ? "Saving..."
                  : editingId !== null
                  ? "Update Task"
                  : "Create Task"}
              </button>

            </div>

          </form>
        </section>

        {/* TASKS */}

        <section className="mb-8 rounded-2xl bg-white p-6 shadow-sm">

          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">

            <div>
              <h2 className="text-xl font-bold text-slate-900">
                My Tasks
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Manage and track your tasks
              </p>
            </div>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">
              {filteredTasks.length} tasks
            </span>

          </div>

          {/* FILTERS */}

          <div className="mb-6 grid gap-3 md:grid-cols-4">

            <input
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(event.target.value)
              }
              className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500"
            />

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
              className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900"
            >
              <option value="ALL">
                All Status
              </option>
              <option value="TODO">
                To Do
              </option>
              <option value="IN_PROGRESS">
                In Progress
              </option>
              <option value="COMPLETED">
                Completed
              </option>
            </select>

            <select
              value={priorityFilter}
              onChange={(event) =>
                setPriorityFilter(event.target.value)
              }
              className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900"
            >
              <option value="ALL">
                All Priority
              </option>
              <option value="Low">Low</option>
              <option value="Medium">
                Medium
              </option>
              <option value="High">High</option>
            </select>

            <select
              value={projectFilter}
              onChange={(event) =>
                setProjectFilter(event.target.value)
              }
              className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900"
            >
              <option value="ALL">
                All Projects
              </option>

              {projects.map((project) => (
                <option
                  key={project.id}
                  value={project.id}
                >
                  {project.name ||
                    "Unnamed Project"}
                </option>
              ))}
            </select>

          </div>

          {filteredTasks.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center">
              <p className="text-lg font-semibold text-slate-700">
                No tasks found
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Create a task or change your filters.
              </p>
            </div>
          ) : (
            <div className="space-y-3">

              {filteredTasks.map((task) => (
                <div
                  key={task.id}
                  className="rounded-xl border border-slate-200 p-4 transition hover:shadow-sm"
                >

                  <div className="flex flex-wrap items-start justify-between gap-4">

                    <div className="min-w-0">
                      <h3 className="font-semibold text-slate-900">
                        {task.title ||
                          "Untitled Task"}
                      </h3>

                      <p className="mt-1 text-sm text-slate-600">
                        {task.description ||
                          "No description added."}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">

                      <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                        {task.priority ||
                          "Medium"}
                      </span>

                      <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                        {task.status ||
                          "TODO"}
                      </span>

                      {task.project && (
                        <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700">
                          {task.project.name ||
                            "Project"}
                        </span>
                      )}

                    </div>

                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">

                    <p className="text-xs text-slate-500">
                      Due:{" "}
                      {task.dueDate ||
                        "No due date"}
                    </p>

                    <div className="flex gap-2">

                      <button
                        type="button"
                        onClick={() =>
                          handleEdit(task)
                        }
                        className="rounded-lg bg-yellow-100 px-3 py-1.5 text-xs font-semibold text-yellow-700 hover:bg-yellow-200"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          void deleteTask(task.id)
                        }
                        className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-200"
                      >
                        Delete
                      </button>

                    </div>

                  </div>

                </div>
              ))}

            </div>
          )}

        </section>

        {/* PROJECT FORM */}

        <section
          id="project-form"
          className="mb-8 rounded-2xl bg-white p-6 shadow-sm"
        >

          <h2 className="mb-5 text-xl font-bold text-slate-900">
            {editingProjectId !== null
              ? "Edit Project"
              : "Create New Project"}
          </h2>

          <form
            onSubmit={handleProjectSubmit}
            className="space-y-4"
          >

            <div>
              <label className="text-sm font-semibold text-slate-700">
                Project Name
              </label>

              <input
                value={projectName}
                onChange={(event) =>
                  setProjectName(event.target.value)
                }
                placeholder=" Project Manager"
                required
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700">
                Description
              </label>

              <textarea
                value={projectDescription}
                onChange={(event) =>
                  setProjectDescription(
                    event.target.value
                  )
                }
                placeholder="Describe your project..."
                rows={3}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900"
              />
            </div>

            <div className="flex justify-end gap-3">

              {editingProjectId !== null && (
                <button
                  type="button"
                  onClick={handleProjectCancel}
                  className="rounded-lg bg-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700"
                >
                  Cancel
                </button>
              )}

              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                {editingProjectId !== null
                  ? "Update Project"
                  : "Create Project"}
              </button>

            </div>

          </form>
        </section>

        {/* PROJECTS */}

        <section className="mb-8 rounded-2xl bg-white p-6 shadow-sm">

          <div className="mb-5">
            <h2 className="text-xl font-bold text-slate-900">
              My Projects
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Organize your work into projects
            </p>
          </div>

          {projects.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
              <p className="font-semibold text-slate-700">
                No projects available
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Create your first project above.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">

              {projects.map((project) => (
                <div
                  key={project.id}
                  className="rounded-xl border border-slate-200 p-5 transition hover:shadow-md"
                >

                  <div className="flex items-start justify-between gap-3">

                    <div>
                      <h3 className="font-bold text-slate-900">
                        {project.name ||
                          "Unnamed Project"}
                      </h3>

                      <p className="mt-2 text-sm text-slate-600">
                        {project.description ||
                          "No description added."}
                      </p>
                    </div>

                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">

                    <button
                      type="button"
                      onClick={() =>
                        void viewProjectTasks(project)
                      }
                      className="rounded-lg bg-blue-100 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-200"
                    >
                      View Tasks
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleProjectEdit(project)
                      }
                      className="rounded-lg bg-yellow-100 px-3 py-1.5 text-xs font-semibold text-yellow-700 hover:bg-yellow-200"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        void deleteProject(project.id)
                      }
                      className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-200"
                    >
                      Delete
                    </button>

                  </div>

                </div>
              ))}

            </div>
          )}

        </section>

        {/* PROJECT TASKS */}

        {selectedProject && (
          <section className="mb-8 rounded-2xl bg-white p-6 shadow-sm">

            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">

              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">
                  Project Tasks
                </p>

                <h2 className="mt-1 text-xl font-bold text-slate-900">
                  {selectedProject.name ||
                    "Unnamed Project"}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedProject(null);
                  setProjectTasks([]);
                }}
                className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-300"
              >
                Close
              </button>

            </div>

            {projectTasks.length === 0 ? (
              <p className="text-sm text-slate-500">
                No tasks available for this project.
              </p>
            ) : (
              <div className="space-y-3">

                {projectTasks.map((task) => (
                  <div
                    key={task.id}
                    className="rounded-xl border border-slate-200 p-4"
                  >

                    <div className="flex flex-wrap items-center justify-between gap-3">

                      <h3 className="font-semibold text-slate-900">
                        {task.title ||
                          "Untitled Task"}
                      </h3>

                      <div className="flex gap-2">

                        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs text-blue-700">
                          {task.priority ||
                            "Medium"}
                        </span>

                        <span className="rounded-full bg-green-100 px-3 py-1 text-xs text-green-700">
                          {task.status ||
                            "TODO"}
                        </span>

                      </div>

                    </div>

                    <p className="mt-2 text-sm text-slate-600">
                      {task.description ||
                        "No description added."}
                    </p>

                    <p className="mt-2 text-xs text-slate-500">
                      Due:{" "}
                      {task.dueDate ||
                        "No due date"}
                    </p>

                  </div>
                ))}

              </div>
            )}

          </section>
        )}

      {/* RECENT ACTIVITY */}


      <section className="rounded-2xl bg-white p-6 shadow-sm">

          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Recent Activity
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Your latest project and task activity
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-4">

            {/* Recent Projects */}
            {projects.slice(-3).reverse().map((project) => (
              <div
                key={`project-${project.id}`}
                className="flex items-center gap-4 rounded-lg border border-slate-100 p-4"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                  📁
                </div>

                <div>
                  <p className="font-semibold text-slate-800">
                    Project: {project.name}
                  </p>

                  <p className="text-sm text-slate-500">
                    Project is available in your workspace
                  </p>
                </div>
              </div>
            ))}

            {/* Recent Tasks */}
            {tasks.slice(-5).reverse().map((task) => (
              <div
                key={`task-${task.id}`}
                className="flex items-center gap-4 rounded-lg border border-slate-100 p-4"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-600">
                  ✓
                </div>

                <div>
                  <p className="font-semibold text-slate-800">
                    Task: {task.title}
                  </p>

                  <p className="text-sm text-slate-500">
                    Status: {task.status}
                  </p>
                </div>
              </div>
            ))}

            {projects.length === 0 && tasks.length === 0 && (
              <p className="py-6 text-center text-sm text-slate-500">
                No recent activity yet.
              </p>
          )}

         </div>

      </section>



      </div>
    </main>
  );
}
