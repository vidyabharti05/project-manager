import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-white to-blue-100 px-6">
      <section className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-xl sm:p-14">

        <p className="mb-4 text-sm font-bold uppercase tracking-[0.25em] text-blue-600">
          Project Manager
        </p>

        <h1 className="mb-5 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
          Manage Your Projects Smarter
        </h1>

        <p className="mx-auto mb-9 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
          Organize tasks, manage projects, collaborate with your team,
          and work more efficiently.
        </p>

        <div className="flex flex-col justify-center gap-4 sm:flex-row">

          <Link
            href="/login"
            className="rounded-xl border border-slate-300 bg-white px-7 py-3.5 font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md"
          >
            Login
          </Link>

          <Link
            href="/register"
            className="rounded-xl bg-blue-600 px-7 py-3.5 font-semibold text-white shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg"
          >
            Register
          </Link>

        </div>

      </section>
    </main>
  );
}

