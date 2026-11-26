import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Clock,
  Mail,
  MessageSquarePlus,
  ShieldCheck,
  Star,
} from "lucide-react";
import { ApiError, apiFetch, formatNaira, resolveMediaUrl, type CoursePublic } from "../lib/api";
import { useAuth } from "../lib/auth";

interface ReviewItem {
  id: number;
  user_name: string;
  role_label: string;
  rating: number;
  comment: string;
  created_at: string;
}

const FAQS = [
  {
    q: "What time do new lessons unlock each day?",
    a: "Every scheduled lesson unlocks at midnight in Africa/Lagos (WAT), and we send a friendly morning reminder email at 06:30 WAT with a direct link to today's lesson.",
  },
  {
    q: "What happens if I miss a day?",
    a: "No stress—once a lesson's release date passes, it stays unlocked in your dashboard forever so you can catch up whenever it fits your schedule.",
  },
  {
    q: "Can I retake quizzes to improve my score?",
    a: "Yes! Quizzes are graded securely on our server and you can retake them as many times as you like. We save every attempt and display both your best and latest scores.",
  },
  {
    q: "How does payment work?",
    a: "Checkout is powered by Paystack. Once your payment is verified server-side, your enrollment activates immediately with zero manual waiting.",
  },
];

export function LandingPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [roleLabel, setRoleLabel] = useState("");
  const [comment, setComment] = useState("");

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ["courses"],
    queryFn: () => apiFetch<CoursePublic[]>("/api/courses"),
  });

  const { data: reviews = [] } = useQuery<ReviewItem[]>({
    queryKey: ["reviews"],
    queryFn: () => apiFetch<ReviewItem[]>("/api/reviews"),
  });

  const submitReview = useMutation<ReviewItem, ApiError>({
    mutationFn: () =>
      apiFetch<ReviewItem>("/api/reviews", {
        method: "POST",
        body: JSON.stringify({
          rating,
          role_label: roleLabel,
          comment,
        }),
      }),
    onSuccess: () => {
      setComment("");
      setRoleLabel("");
      setRating(5);
      setShowReviewForm(false);
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
    },
  });

  const handleReviewSubmit = (e: FormEvent) => {
    e.preventDefault();
    submitReview.mutate();
  };

  return (
    <div className="relative overflow-hidden">
      {/* Hero */}
      <section className="relative bg-white shadow-soft">
        <div className="absolute inset-0 bg-dot-grid bg-[length:24px_24px] opacity-50 pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-32 pb-20 lg:pt-40 lg:pb-32 grid lg:grid-cols-12 gap-14 lg:gap-16 items-center">
          <div className="lg:col-span-6">
            <h1 className="text-5xl sm:text-6xl lg:text-[64px] font-extrabold text-zinc-900 tracking-tight leading-[1.04]">
              Build real engineering mastery,{" "}
              <span className="text-blue-600">one morning at a time.</span>
            </h1>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              {user ? (
                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-500 shadow-soft transition-colors"
                >
                  Go to Dashboard
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <>
                  <Link
                    to="/register"
                    className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-500 shadow-soft transition-colors"
                  >
                    Start Learning
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white text-zinc-800 font-semibold shadow-elevated hover:bg-[#F7F7F5] transition-all"
                  >
                    Sign in
                  </Link>
                </>
              )}
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-medium text-zinc-500">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-sky-500" />
                Focused daily video lessons
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-blue-600" />
                Morning email reminders
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Secure Paystack checkout
              </span>
            </div>
          </div>

          {/* Right Hero Image */}
          <div className="lg:col-span-6">
            <div className="rounded-3xl overflow-hidden shadow-elevated bg-white">
              <img
                src="/images/hero-learning.jpg"
                alt="Learner enjoying a bright morning lesson at a sunlit desk"
                className="w-full h-[320px] sm:h-[380px] object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-24 lg:py-28">
        <div className="max-w-xl mb-12">
          <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
            How It Works
          </p>
          <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight">
            A simple daily rhythm that actually sticks
          </h2>
        </div>

        <div className="grid sm:grid-cols-3 gap-7">
          {[
            {
              step: "01",
              title: "Enroll once via Paystack",
              desc: "Instant server-verified activation with a single transparent payment.",
            },
            {
              step: "02",
              title: "Unlock at 06:30 WAT",
              desc: "A fresh lesson drops each morning with a reminder email straight to your inbox.",
            },
            {
              step: "03",
              title: "Quiz, explain & streak",
              desc: "Take server-graded quizzes, read detailed explanations, and track your best score.",
            },
          ].map((item) => (
            <div
              key={item.step}
              className="bg-white rounded-2xl p-6 shadow-soft hover:shadow-elevated transition-shadow"
            >
              <span className="text-xs font-bold text-blue-600 bg-sky-50 px-2.5 py-1 rounded-md">
                {item.step}
              </span>
              <h3 className="mt-4 font-bold text-zinc-900">{item.title}</h3>
              <p className="mt-1.5 text-sm text-zinc-600 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Available Courses */}
      <section id="courses" className="max-w-7xl mx-auto px-4 sm:px-6 pb-24 lg:pb-28 scroll-mt-20">
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
              Curriculum
            </p>
            <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight">
              Available Courses
            </h2>
          </div>
        </div>

        {isLoading ? (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="h-80 bg-white rounded-3xl shadow-soft animate-pulse" />
          </div>
        ) : courses.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-soft p-10 text-center text-zinc-500">
            No active courses published yet.
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2">
            {courses.map((course) => (
              <div
                key={course.id}
                className="bg-white rounded-3xl overflow-hidden shadow-soft hover:shadow-elevated transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-48 overflow-hidden bg-sky-50">
                    <img
                      src={resolveMediaUrl(course.image_url)}
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute top-4 left-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 backdrop-blur-sm text-zinc-800 text-xs font-bold shadow-sm">
                      <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                      {course.total_lessons} Daily Lessons
                    </span>
                  </div>

                  <div className="p-7 pb-0">
                    <div className="flex items-start justify-between gap-4">
                      <h3 className="text-xl font-bold text-zinc-900 tracking-tight">
                        {course.title}
                      </h3>
                      <span className="text-2xl font-extrabold text-blue-600 tracking-tight shrink-0">
                        {formatNaira(course.price_kobo)}
                      </span>
                    </div>
                    <p className="mt-2.5 text-sm text-zinc-600 leading-relaxed">
                      {course.description}
                    </p>
                  </div>
                </div>

                <div className="p-7 pt-6 flex items-center justify-between gap-4">
                  <span className="text-xs text-zinc-500 font-medium">
                    Quizzes + email reminders included
                  </span>
                  <Link
                    to={user ? `/checkout?courseId=${course.id}` : "/register"}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-500 text-sm shadow-sm transition-colors shrink-0"
                  >
                    {user ? "Enroll Now" : "Register"}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* About Us */}
      <section id="about" className="max-w-7xl mx-auto px-4 sm:px-6 py-20 lg:py-28 scroll-mt-20">
        <div className="bg-white rounded-3xl shadow-soft p-8 sm:p-14 grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
              About Us
            </p>
            <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight">
              Built for people who want real progress, not endless playlists
            </h2>
            <p className="mt-4 text-zinc-600 leading-relaxed">
              Most online courses sit unfinished because they dump dozens of hours on you all at
              once. We created <strong>Daily Lessons</strong> around a simpler idea: one clear,
              practical lesson every morning followed by a short quiz that verifies what you
              actually retained.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-zinc-700">
              {[
                "Written by practicing engineers focused on real-world production skills",
                "Paced intentionally in Africa/Lagos time so you build a steady morning routine",
                "Active recall built in—every lesson ends with instant explanations",
              ].map((point) => (
                <li key={point} className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-5 grid grid-cols-2 gap-4">
            <div className="bg-[#F7F7F5] rounded-2xl p-6 shadow-soft">
              <p className="text-3xl font-extrabold text-blue-600">Video</p>
              <p className="mt-1 text-xs font-semibold text-zinc-600">
                Focused daily video lessons
              </p>
            </div>
            <div className="bg-[#F7F7F5] rounded-2xl p-6 shadow-soft">
              <p className="text-3xl font-extrabold text-blue-600">06:30</p>
              <p className="mt-1 text-xs font-semibold text-zinc-600">
                WAT morning email drop
              </p>
            </div>
            <div className="bg-[#F7F7F5] rounded-2xl p-6 shadow-soft">
              <p className="text-3xl font-extrabold text-blue-600">100%</p>
              <p className="mt-1 text-xs font-semibold text-zinc-600">
                Server-graded quizzes
              </p>
            </div>
            <div className="bg-[#F7F7F5] rounded-2xl p-6 shadow-soft">
              <p className="text-3xl font-extrabold text-blue-600">∞</p>
              <p className="mt-1 text-xs font-semibold text-zinc-600">
                Unlimited quiz retakes
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Learner Reviews */}
      <section id="reviews" className="max-w-7xl mx-auto px-4 sm:px-6 pb-24 lg:pb-28 scroll-mt-20">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
              Learner Reviews
            </p>
            <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight">
              What learners are saying
            </h2>
          </div>

          <button
            type="button"
            onClick={() => setShowReviewForm((prev) => !prev)}
            className="inline-flex items-center gap-2 self-start sm:self-auto px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-500 shadow-soft transition-colors"
          >
            <MessageSquarePlus className="w-4 h-4" />
            {showReviewForm ? "Close Form" : "Add a Review"}
          </button>
        </div>

        {/* Add Review Form */}
        {showReviewForm && (
          <div className="mb-8 bg-white rounded-3xl p-6 sm:p-8 shadow-elevated max-w-2xl">
            {user ? (
              <form onSubmit={handleReviewSubmit} className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-zinc-900">Share your experience</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Posting as <strong className="text-zinc-800">{user.name}</strong>
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 mb-2">
                    Your Rating
                  </label>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className="p-1 rounded-lg hover:bg-amber-50 transition-colors"
                        aria-label={`Rate ${star} stars`}
                      >
                        <Star
                          className={`w-6 h-6 ${
                            star <= rating
                              ? "text-amber-400 fill-amber-400"
                              : "text-zinc-300"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600">
                    Role / Location (optional)
                  </label>
                  <input
                    type="text"
                    maxLength={120}
                    placeholder="e.g. Software Engineer, Lagos"
                    value={roleLabel}
                    onChange={(e) => setRoleLabel(e.target.value)}
                    className="mt-1.5 w-full rounded-xl bg-zinc-100/80 px-3.5 py-2.5 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:shadow-soft transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600">
                    Your Review
                  </label>
                  <textarea
                    required
                    minLength={5}
                    maxLength={600}
                    rows={3}
                    placeholder="What did you enjoy about the daily lessons?"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="mt-1.5 w-full rounded-xl bg-zinc-100/80 px-3.5 py-2.5 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:shadow-soft transition"
                  />
                </div>

                {submitReview.error && (
                  <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-sm flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{submitReview.error.message}</span>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={submitReview.isPending}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-500 disabled:opacity-50 shadow-sm transition-colors"
                  >
                    {submitReview.isPending ? "Submitting..." : "Submit Review"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowReviewForm(false)}
                    className="px-4 py-2.5 rounded-xl bg-zinc-100 text-zinc-700 text-sm font-semibold hover:bg-zinc-200/80 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center py-4">
                <h3 className="text-lg font-bold text-zinc-900">Sign in to leave a review</h3>
                <p className="mt-1.5 text-sm text-zinc-600">
                  Only verified learners with an account can post reviews.
                </p>
                <div className="mt-5 flex items-center justify-center gap-3">
                  <Link
                    to="/login"
                    className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-500 shadow-sm transition-colors"
                  >
                    Sign in
                  </Link>
                  <Link
                    to="/register"
                    className="px-5 py-2.5 rounded-xl bg-zinc-100 text-zinc-800 text-sm font-semibold hover:bg-zinc-200/80 transition-colors"
                  >
                    Create Account
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Reviews Grid or Coming Soon State */}
        {reviews.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center shadow-soft">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-sky-50 text-blue-600">
              <Star className="w-6 h-6" />
            </div>
            <h3 className="mt-4 text-xl font-extrabold text-zinc-900">
              Reviews Coming Soon
            </h3>
            <p className="mt-2 text-sm text-zinc-600 max-w-md mx-auto">
              We&apos;re collecting authentic feedback from our first cohort of learners. Have
              you started a course? Be the first to share your thoughts.
            </p>
            {!showReviewForm && (
              <button
                type="button"
                onClick={() => setShowReviewForm(true)}
                className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-500 shadow-sm transition-colors"
              >
                <MessageSquarePlus className="w-4 h-4" />
                Write the First Review
              </button>
            )}
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {reviews.map((r) => (
              <div
                key={r.id}
                className="bg-white rounded-2xl p-6 shadow-soft flex flex-col justify-between"
              >
                <div>
                  <div className="flex gap-1 text-amber-400">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        className={`w-4 h-4 ${
                          n <= r.rating ? "fill-amber-400 text-amber-400" : "text-zinc-200"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="mt-4 text-sm text-zinc-700 leading-relaxed">
                    &ldquo;{r.comment}&rdquo;
                  </p>
                </div>
                <div className="mt-6">
                  <p className="text-sm font-bold text-zinc-900">{r.user_name}</p>
                  {r.role_label && <p className="text-xs text-zinc-500">{r.role_label}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* FAQ */}
      <section id="faq" className="max-w-3xl mx-auto px-4 sm:px-6 pb-24 lg:pb-28 scroll-mt-20">
        <div className="text-center mb-10">
          <p className="text-xs font-bold uppercase tracking-wider text-blue-600">FAQ</p>
          <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-3">
          {FAQS.map((item, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div key={item.q} className="bg-white rounded-2xl shadow-soft overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between gap-4 font-bold text-zinc-900 text-sm sm:text-base"
                >
                  <span>{item.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-zinc-500 shrink-0 transition-transform ${
                      isOpen ? "rotate-180 text-blue-600" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-6 pb-5 text-sm text-zinc-600 leading-relaxed">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-28 lg:pb-32">
        <div className="bg-blue-600 rounded-3xl p-10 sm:p-16 text-center text-white shadow-elevated">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Ready to start your morning learning habit?
          </h2>
          <p className="mt-3 text-blue-100 max-w-xl mx-auto text-sm sm:text-base">
            Create your account in seconds, enroll via Paystack, and unlock your first lesson
            today.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link
              to={user ? "/dashboard" : "/register"}
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white text-blue-600 font-bold hover:bg-blue-50 shadow-soft transition-colors"
            >
              {user ? "Open Dashboard" : "Create Free Account"}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white shadow-nav py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-8 text-sm">
          <div>
            <p className="font-extrabold text-blue-600 text-lg">Daily Lessons</p>
            <p className="mt-2 text-xs text-zinc-500 leading-relaxed">
              Focused daily engineering lessons delivered every morning at 06:30 Africa/Lagos.
            </p>
          </div>

          <div>
            <p className="font-bold text-zinc-900 mb-3">Explore</p>
            <ul className="space-y-2 text-xs text-zinc-600">
              <li>
                <a href="#courses" className="hover:text-blue-600">
                  Courses
                </a>
              </li>
              <li>
                <a href="#about" className="hover:text-blue-600">
                  About Us
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-blue-600">
                  FAQ
                </a>
              </li>
            </ul>
          </div>

          <div>
            <p className="font-bold text-zinc-900 mb-3">Account</p>
            <ul className="space-y-2 text-xs text-zinc-600">
              <li>
                <Link to="/login" className="hover:text-blue-600">
                  Sign in
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-blue-600">
                  Create Account
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="hover:text-blue-600">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link to="/admin/login" className="hover:text-blue-600">
                  Admin Login
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="font-bold text-zinc-900 mb-3">Schedule &amp; Support</p>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Daily unlocks in Africa/Lagos (WAT). Secure payments processed via Paystack.
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-zinc-400">
          <p>© {new Date().getFullYear()} Daily Lessons. All rights reserved.</p>
          <p>Built with FastAPI, React &amp; Paystack</p>
        </div>
      </footer>
    </div>
  );
}
