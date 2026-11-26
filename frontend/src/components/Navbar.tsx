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
    return `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
      active
        ? "text-blue-600 font-semibold bg-blue-50"
        : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/70"
    }`;
  };

  return (
    <header className="fixed top-4 inset-x-0 z-40 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto bg-white/95 backdrop-blur-md rounded-full shadow-pill px-5 sm:px-7 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand */}
        <Link
          to="/"
          onClick={() => setMobileOpen(false)}
          className="font-extrabold tracking-tight text-blue-600 hover:text-blue-700 transition-colors text-lg shrink-0"
        >
          Daily Lessons
        </Link>

        {/* Center: Navigation Links */}
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
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold transition-all ${
                    location.pathname.startsWith("/admin")
                      ? "bg-amber-100 text-amber-900"
                      : "bg-amber-50 text-amber-800 hover:bg-amber-100"
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  Admin
                </Link>
              )}
            </>
          ) : (
            <>
              <Link
                to="/"
                className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  location.pathname === "/"
                    ? "text-blue-600 font-semibold"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                Home
              </Link>
              <a
                href="/#courses"
                className="px-3.5 py-1.5 rounded-full text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
              >
                Courses
              </a>
              <a
                href="/#about"
                className="px-3.5 py-1.5 rounded-full text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
              >
                About Us
              </a>
              <a
                href="/#reviews"
                className="px-3.5 py-1.5 rounded-full text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
              >
                Reviews
              </a>
              <a
                href="/#faq"
                className="px-3.5 py-1.5 rounded-full text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
              >
                FAQ
              </a>
            </>
          )}
        </nav>

        {/* Right: Auth / Profile Actions */}
        <div className="hidden md:flex items-center gap-3 shrink-0">
          {user ? (
            <>
              <Link
                to="/profile"
                className="flex items-center gap-2 hover:opacity-85 transition-opacity"
              >
                <Avatar name={user.name} avatarUrl={user.avatar_url} size="sm" />
                <span className="text-sm font-semibold text-zinc-800 max-w-[120px] truncate">
                  {user.name}
                </span>
              </Link>
              <button
                onClick={handleLogout}
                title="Log out"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold text-zinc-600 hover:text-zinc-900 bg-[#F7F7F5] hover:bg-zinc-200/70 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                Log out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="px-4 py-2 rounded-full text-sm font-semibold text-zinc-700 hover:text-zinc-900 transition-colors"
              >
                Log in
              </Link>
              <Link
                to="/register"
                className="px-5 py-2.5 rounded-full text-sm font-semibold bg-blue-600 text-white hover:bg-blue-500 shadow-sm transition-colors"
              >
                Sign up
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu toggle */}
        <button
          type="button"
          onClick={() => setMobileOpen((o) => !o)}
          className="md:hidden p-2 rounded-full text-zinc-600 hover:bg-zinc-100"
          aria-label="Toggle navigation"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Floating Drawer */}
      {mobileOpen && (
        <div className="md:hidden max-w-7xl mx-auto mt-2 bg-white rounded-3xl px-5 py-5 space-y-2 shadow-elevated">
          {user ? (
            <>
              <Link
                to="/profile"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 pb-3 mb-2"
              >
                <Avatar name={user.name} avatarUrl={user.avatar_url} size="sm" />
                <div>
                  <p className="text-sm font-semibold text-zinc-900">{user.name}</p>
                  <p className="text-xs text-zinc-500">{user.email}</p>
                </div>
              </Link>
              <Link
                to="/dashboard"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-zinc-700 hover:bg-zinc-100"
              >
                <LayoutDashboard className="w-4 h-4" /> Dashboard
              </Link>
              <Link
                to="/lessons/today"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-zinc-700 hover:bg-zinc-100"
              >
                <BookOpen className="w-4 h-4" /> Today&apos;s Lesson
              </Link>
              <Link
                to="/scores"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-zinc-700 hover:bg-zinc-100"
              >
                <Award className="w-4 h-4" /> Scores
              </Link>
              {user.role === "admin" && (
                <Link
                  to="/admin"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-amber-800 bg-amber-50"
                >
                  <ShieldCheck className="w-4 h-4" /> Admin Dashboard
                </Link>
              )}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-rose-600 hover:bg-rose-50"
              >
                <LogOut className="w-4 h-4" /> Log out
              </button>
            </>
          ) : (
            <div className="flex flex-col gap-2">
              <a
                href="/#courses"
                onClick={() => setMobileOpen(false)}
                className="px-3 py-2 rounded-xl text-sm font-medium text-zinc-700 hover:bg-zinc-100"
              >
                Courses
              </a>
              <a
                href="/#about"
                onClick={() => setMobileOpen(false)}
                className="px-3 py-2 rounded-xl text-sm font-medium text-zinc-700 hover:bg-zinc-100"
              >
                About Us
              </a>
              <a
                href="/#reviews"
                onClick={() => setMobileOpen(false)}
                className="px-3 py-2 rounded-xl text-sm font-medium text-zinc-700 hover:bg-zinc-100"
              >
                Reviews
              </a>
              <a
                href="/#faq"
                onClick={() => setMobileOpen(false)}
                className="px-3 py-2 rounded-xl text-sm font-medium text-zinc-700 hover:bg-zinc-100"
              >
                FAQ
              </a>
              <Link
                to="/login"
                onClick={() => setMobileOpen(false)}
                className="w-full text-center py-2.5 rounded-full bg-zinc-100 text-sm font-semibold text-zinc-800 mt-2"
              >
                Log in
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileOpen(false)}
                className="w-full text-center py-2.5 rounded-full bg-blue-600 text-white text-sm font-semibold"
              >
                Sign up
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
