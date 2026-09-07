"use client";

import {
  useState,
  type FormEvent,
} from "react";

import Link from "next/link";

const API_URL = "http://localhost:8080";

type LoginResponse = {
  token?: string;
  accessToken?: string;
  message?: string;
  error?: string;
};

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleLogin = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    const cleanUsername = username.trim();

    if (!cleanUsername || !password) {
      setErrorMessage(
        "Username and password are required."
      );
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      console.log(
        "Sending login request to:",
        `${API_URL}/api/auth/login`
      );

      const response = await fetch(
        `${API_URL}/api/auth/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            username: cleanUsername,
            password,
          }),
        }
      );

      const responseText = await response.text();

      let data: LoginResponse = {};

      if (responseText.trim()) {
        try {
          data = JSON.parse(responseText);
        } catch {
          data = {
            message: responseText,
          };
        }
      }

      console.log("Login status:", response.status);
      console.log("Login response:", data);

      if (!response.ok) {
        throw new Error(
          data.message ||
            data.error ||
            `Login failed: ${response.status}`
        );
      }

      const token =
        data.token || data.accessToken;

      if (!token) {
        throw new Error(
          "JWT token was not received from the server."
        );
      }

      window.localStorage.setItem(
        "token",
        token
      );

      window.localStorage.setItem(
        "username",
        cleanUsername
      );

      window.location.replace("/dashboard");
    } catch (error) {
      console.error("Login error:", error);

      if (
        error instanceof TypeError &&
        error.message === "Failed to fetch"
      ) {
        setErrorMessage(
          "Unable to connect to the backend. Please make sure the server is running."
        );
      } else if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(
          "Login failed. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-white to-blue-100 px-6 py-12">

      <div className="w-full max-w-md">

        {/* Login Card */}
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl sm:p-10">

          {/* Header */}
          <div className="mb-8 text-center">

            <p className="mb-3 text-sm font-bold uppercase tracking-[0.22em] text-blue-600">
              Project Manager
            </p>

            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
              Welcome Back
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Sign in to access your project dashboard
            </p>

          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {errorMessage}
            </div>
          )}

          {/* Login Form */}
          <form
            onSubmit={handleLogin}
            className="space-y-5"
          >

            {/* Username */}
            <div>
              <label
                htmlFor="username"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Username
              </label>

              <input
                id="username"
                name="username"
                type="text"
                value={username}
                onChange={(event) =>
                  setUsername(event.target.value)
                }
                placeholder="Enter your username"
                required
                autoComplete="username"
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Password
              </label>

              <input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                placeholder="Enter your password"
                required
                autoComplete="current-password"
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-blue-600 px-4 py-3.5 font-semibold text-white shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg disabled:cursor-not-allowed disabled:bg-blue-300 disabled:hover:translate-y-0 disabled:hover:shadow-md"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>

          </form>

          {/* Register */}
          <p className="mt-7 text-center text-sm text-slate-500">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="font-semibold text-blue-600 transition hover:text-blue-700 hover:underline"
            >
              Create an account
            </Link>
          </p>

        </div>

        {/* Footer */}
        <p className="mt-5 text-center text-xs text-slate-400">
          Secure project management workspace
        </p>

      </div>
    </main>
  );
}

