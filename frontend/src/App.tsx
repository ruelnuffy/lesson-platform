import { useQuery } from "@tanstack/react-query";
import { Route, Routes } from "react-router-dom";
import { apiFetch } from "./lib/api";

interface HealthResponse {
  status: string;
  app: string;
}

function HomePlaceholder() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["health"],
    queryFn: () => apiFetch<HealthResponse>("/health"),
  });

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
        <span className="inline-block px-3 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-700 bg-indigo-50 rounded-full">
          Phase 1 Scaffold
        </span>
        <h1 className="mt-4 text-3xl font-bold text-slate-900">
          Daily Lessons
        </h1>
        <p className="mt-2 text-slate-600">
          Full-stack daily learning platform with scheduled lessons, quizzes,
          and Paystack checkout.
        </p>
        <div className="mt-6 text-sm">
          {isLoading && <span className="text-slate-500">Checking API...</span>}
          {isError && (
            <span className="text-rose-600 font-medium">
              API unreachable
            </span>
          )}
          {data && (
            <span className="text-emerald-700 font-medium">
              API connected ({data.status})
            </span>
          )}
        </div>
      </div>
    </main>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="*" element={<HomePlaceholder />} />
    </Routes>
  );
}
