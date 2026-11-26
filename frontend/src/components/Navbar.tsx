import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Award,
  BookOpen,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  X,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import { Avatar } from "./Avatar";

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
        ? "bg-white/20 text-white"
        : "text-blue-100 hover:text-white hover:bg-blue-500/60"
    }`;
  };

  return (
    <header className="sticky top-0 z-40 bg-blue-600 text-white shadow-nav">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link
          to="/"
          onClick={() => setMobileOpen(false)}
          className="flex items-center group"
        >
          <div className="leading-tight">
            <span className="font-extrabold tracking-tight text-white group-hover:text-blue-100 transition-colors text-lg block">
              Daily Lessons
            </span>
            <span className="text-[11px] font-medium text-blue-100 hidden sm:block">
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
                      ? "bg-amber-400 text-zinc-900 shadow-sm"
                      : "bg-amber-300/20 text-amber-100 hover:bg-amber-300/30"
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  Admin
                </Link>
              )}

              <div className="w-2" />

              <div className="flex items-center gap-2.5 pl-1">
                <Link
                  to="/profile"
                  className="flex items-center gap-2 hover:opacity-90 transition-opacity"
                >
                  <Avatar name={user.name} avatarUrl={user.avatar_url} size="sm" />
                  <span className="text-sm font-medium text-white max-w-[120px] truncate">
                    {user.name}
                  </span>
                </Link>
                <button
                  onClick={handleLogout}
                  title="Log out"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-blue-100 hover:text-white hover:bg-blue-500/60 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Log out
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <a
                href="/#courses"
                className="px-3 py-2 rounded-xl text-sm font-medium text-blue-100 hover:text-white hover:bg-blue-500/50 transition-colors"
              >
                Courses
              </a>
              <a
                href="/#about"
                className="px-3 py-2 rounded-xl text-sm font-medium text-blue-100 hover:text-white hover:bg-blue-500/50 transition-colors"
              >
                About
              </a>
              <a
                href="/#faq"
                className="px-3 py-2 rounded-xl text-sm font-medium text-blue-100 hover:text-white hover:bg-blue-500/50 transition-colors"
              >
                FAQ
              </a>
              <Link
                to="/login"
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white hover:bg-blue-500/60 transition-colors"
              >
                Log in
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-white text-blue-600 hover:bg-blue-50 shadow-sm transition-colors"
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
          className="md:hidden p-2 rounded-lg text-white hover:bg-blue-500/60"
          aria-label="Toggle navigation"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden bg-blue-700 text-white px-4 py-4 space-y-2 shadow-elevated">
          {user ? (
            <>
              <Link
                to="/profile"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 pb-3 mb-2"
              >
                <Avatar name={user.name} avatarUrl={user.avatar_url} size="sm" />
                <div>
                  <p className="text-sm font-semibold text-white">{user.name}</p>
                  <p className="text-xs text-blue-200">{user.email}</p>
                </div>
              </Link>
              <Link
                to="/dashboard"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-blue-50 hover:bg-blue-600"
              >
                <LayoutDashboard className="w-4 h-4" /> Dashboard
              </Link>
              <Link
                to="/lessons/today"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-blue-50 hover:bg-blue-600"
              >
                <BookOpen className="w-4 h-4" /> Today&apos;s Lesson
              </Link>
              <Link
                to="/scores"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-blue-50 hover:bg-blue-600"
              >
                <Award className="w-4 h-4" /> Scores
              </Link>
              {user.role === "admin" && (
                <Link
                  to="/admin"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-amber-100 bg-amber-500/20"
                >
                  <ShieldCheck className="w-4 h-4" /> Admin Dashboard
                </Link>
              )}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-rose-200 hover:bg-rose-500/20"
              >
                <LogOut className="w-4 h-4" /> Log out
              </button>
            </>
          ) : (
            <div className="flex flex-col gap-2">
              <Link
                to="/login"
                onClick={() => setMobileOpen(false)}
                className="w-full text-center py-2.5 rounded-xl bg-blue-600 text-sm font-semibold text-white"
              >
                Log in
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileOpen(false)}
                className="w-full text-center py-2.5 rounded-xl bg-white text-blue-600 text-sm font-semibold"
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
