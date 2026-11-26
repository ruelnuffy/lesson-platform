import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Award,
  BookOpen,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { useAuth } from "../lib/auth";

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    setMobileOpen(false);
    await logout();
    navigate("/");
  };

  const navLinkClass = (path: string) => {
    const active =
      location.pathname === path ||
      (path !== "/" && location.pathname.startsWith(path));
    return `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
      active
        ? "bg-indigo-50 text-indigo-700"
        : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/80"
    }`;
  };

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "";

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md shadow-nav">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link
          to="/"
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-2.5 group"
        >
          <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-zinc-900 text-white shadow-sm group-hover:bg-indigo-600 transition-colors">
            <Sparkles className="w-4 h-4" />
          </span>
          <div className="leading-tight">
            <span className="font-extrabold tracking-tight text-zinc-900 text-base block">
              Daily Lessons
            </span>
            <span className="text-[11px] font-medium text-zinc-500 hidden sm:block">
              One lesson every morning
            </span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {user ? (
            <>
              <Link to="/dashboard" className={navLinkClass("/dashboard")}>
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </Link>
              <Link to="/lessons/today" className={navLinkClass("/lessons")}>
                <BookOpen className="w-4 h-4" />
                Today&apos;s Lesson
              </Link>
              <Link to="/scores" className={navLinkClass("/scores")}>
                <Award className="w-4 h-4" />
                Scores
              </Link>
              {user.role === "admin" && (
                <Link
                  to="/admin"
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                    location.pathname.startsWith("/admin")
                      ? "bg-amber-100 text-amber-900 shadow-sm"
                      : "bg-amber-50 text-amber-800 hover:bg-amber-100"
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  Admin
                </Link>
              )}

              <div className="w-2" />

              <div className="flex items-center gap-2.5 pl-1">
                <div className="w-8 h-8 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shadow-sm">
                  {initials}
                </div>
                <span className="text-sm font-medium text-zinc-700 max-w-[120px] truncate">
                  {user.name}
                </span>
                <button
                  onClick={handleLogout}
                  title="Log out"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Log out
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="px-4 py-2 rounded-xl text-sm font-semibold text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
              >
                Log in
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-zinc-900 text-white hover:bg-indigo-600 shadow-sm transition-colors"
              >
                Get Started
              </Link>
            </div>
          )}
        </nav>

        {/* Mobile menu toggle */}
        <button
          type="button"
          onClick={() => setMobileOpen((o) => !o)}
          className="md:hidden p-2 rounded-lg text-zinc-600 hover:bg-zinc-100"
          aria-label="Toggle navigation"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden bg-white px-4 py-4 space-y-2 shadow-elevated">
          {user ? (
            <>
              <div className="flex items-center gap-3 pb-3 mb-2">
                <div className="w-9 h-9 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
                  {initials}
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-900">{user.name}</p>
                  <p className="text-xs text-zinc-500">{user.email}</p>
                </div>
              </div>
              <Link
                to="/dashboard"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-zinc-700 hover:bg-zinc-100"
              >
                <LayoutDashboard className="w-4 h-4" /> Dashboard
              </Link>
              <Link
                to="/lessons/today"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-zinc-700 hover:bg-zinc-100"
              >
                <BookOpen className="w-4 h-4" /> Today&apos;s Lesson
              </Link>
              <Link
                to="/scores"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-zinc-700 hover:bg-zinc-100"
              >
                <Award className="w-4 h-4" /> Scores
              </Link>
              {user.role === "admin" && (
                <Link
                  to="/admin"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-amber-800 bg-amber-50"
                >
                  <ShieldCheck className="w-4 h-4" /> Admin Dashboard
                </Link>
              )}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-rose-600 hover:bg-rose-50"
              >
                <LogOut className="w-4 h-4" /> Log out
              </button>
            </>
          ) : (
            <div className="flex flex-col gap-2">
              <Link
                to="/login"
                onClick={() => setMobileOpen(false)}
                className="w-full text-center py-2.5 rounded-xl bg-zinc-100 text-sm font-semibold text-zinc-800"
              >
                Log in
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileOpen(false)}
                className="w-full text-center py-2.5 rounded-xl bg-zinc-900 text-white text-sm font-semibold"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
