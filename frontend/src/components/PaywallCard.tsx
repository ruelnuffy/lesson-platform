import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { apiFetch, formatNaira, resolveMediaUrl, type CoursePublic } from "../lib/api";
import { useAuth } from "../lib/auth";

interface CourseDetailPublic extends CoursePublic {
  syllabus: Array<{
    id: number;
    day_number: number;
    title: string;
    release_date: string;
    is_released: boolean;
  }>;
}

export function PaywallCard({ title = "Unlock Your Daily Lessons" }: { title?: string }) {
  const { user } = useAuth();
  const firstName = user?.name?.split(" ")[0] || "there";

  const { data: courses = [] } = useQuery({
    queryKey: ["courses"],
    queryFn: () => apiFetch<CoursePublic[]>("/api/courses"),
  });

  const primary = courses[0];

  const { data: courseDetail } = useQuery({
    queryKey: ["courses", primary?.id],
    queryFn: () => apiFetch<CourseDetailPublic>(`/api/courses/${primary!.id}`),
    enabled: Boolean(primary?.id),
  });

  return (
    <div className="w-full px-4 sm:px-8 py-8 space-y-8">
      {/* Greeting Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
            Learning Dashboard
          </p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight">
            Welcome, {firstName}
          </h1>
          <p className="mt-1 text-sm text-zinc-600">{title}</p>
        </div>
        <span className="inline-flex items-center gap-1.5 self-start sm:self-auto px-3.5 py-1.5 rounded-full bg-white text-xs font-semibold text-zinc-600 shadow-soft">
          <Lock className="w-3.5 h-3.5 text-blue-600" />
          Enrollment Required
        </span>
      </div>

      {/* Main Enrollment Hero Card */}
      {primary ? (
        <div className="bg-white rounded-3xl shadow-elevated overflow-hidden grid lg:grid-cols-12">
          <div className="lg:col-span-5 bg-sky-50 min-h-[240px]">
            <img
              src={resolveMediaUrl(primary.image_url)}
              alt={primary.title}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="lg:col-span-7 p-7 sm:p-10 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                    Full Cohort Access
                  </span>
                  <h2 className="mt-1.5 text-2xl font-extrabold text-zinc-900 tracking-tight">
                    {primary.title}
                  </h2>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-2xl sm:text-3xl font-extrabold text-blue-600">
                    {formatNaira(primary.price_kobo)}
                  </span>
                  <span className="block text-xs text-zinc-500 mt-0.5">One-time payment</span>
                </div>
              </div>

              <p className="mt-3 text-sm text-zinc-600 leading-relaxed">
                {primary.description}
              </p>

              <div className="mt-6 grid sm:grid-cols-2 gap-3 text-sm text-zinc-700">
                <div className="flex items-center gap-2.5 bg-[#F7F7F5] rounded-xl px-3.5 py-2.5">
                  <BookOpen className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>{primary.total_lessons} scheduled daily lessons</span>
                </div>
                <div className="flex items-center gap-2.5 bg-[#F7F7F5] rounded-xl px-3.5 py-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Server-graded quizzes</span>
                </div>
                <div className="flex items-center gap-2.5 bg-[#F7F7F5] rounded-xl px-3.5 py-2.5">
                  <Mail className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>06:30 WAT daily emails</span>
                </div>
                <div className="flex items-center gap-2.5 bg-[#F7F7F5] rounded-xl px-3.5 py-2.5">
                  <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Unlimited quiz retakes</span>
                </div>
              </div>
            </div>

            <div className="mt-7 flex flex-col sm:flex-row sm:items-center gap-4">
              <Link
                to={`/checkout?courseId=${primary.id}`}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-500 shadow-soft transition-colors"
              >
                Enroll &amp; Pay with Paystack
                <ArrowRight className="w-4 h-4" />
              </Link>
              <span className="inline-flex items-center gap-1.5 text-xs text-zinc-500">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                Verified server-side · Instant unlock
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-soft p-10 text-center text-sm text-zinc-500">
          No active courses are available for enrollment yet.
        </div>
      )}

      {/* Locked Curriculum Preview (titles & dates only, never lesson content) */}
      {courseDetail && courseDetail.syllabus.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-extrabold text-zinc-900 tracking-tight">
                What You&apos;ll Unlock ({courseDetail.syllabus.length} Days)
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Enroll above to unlock lesson content, embedded videos, and daily quizzes.
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            {courseDetail.syllabus.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl p-4 shadow-soft flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#F7F7F5] text-zinc-500 flex items-center justify-center font-bold text-xs shrink-0">
                    D{item.day_number}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-zinc-900 text-sm truncate">
                      {item.title}
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Scheduled {item.release_date}
                    </p>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-lg bg-[#F7F7F5] text-zinc-400 flex items-center justify-center shrink-0">
                  <Lock className="w-3.5 h-3.5" />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
