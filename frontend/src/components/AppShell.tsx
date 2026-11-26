import { useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Award,
  BookOpen,
  CreditCard,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  User as UserIcon,
  X,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import { Avatar } from "./Avatar";

function getPageTitle(pathname: string): string {
  if (pathname === "/dashboard") return "Dashboard";
  if (pathname === "/lessons/today") return "Today's Lesson";
  if (pathname.includes("/quiz")) return "Lesson Quiz";
  if (pathname.startsWith("/lessons")) return "Lesson";
  if (pathname === "/scores") return "Quiz Scores";
  if (pathname === "/profile") return "Profile";
  if (pathname.startsWith("/checkout")) return "Enrollment & Checkout";
  if (pathname.startsWith("/admin")) return "Admin Console";
  return "Daily Lessons";
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    setSidebarOpen(false);
    await logout();
    navigate("/");
  };

  const navItems = [
    { to: "/dashboard", label: "Overview", icon: LayoutDashboard, match: "/dashboard" },
    { to: "/lessons/today", label: "Today's Lesson", icon: BookOpen, match: "/lessons" },
    { to: "/scores", label: "Quiz Scores", icon: Award, match: "/scores" },
    { to: "/checkout", label: "Billing & Enroll", icon: CreditCard, match: "/checkout" },
    { to: "/profile", label: "Profile", icon: UserIcon, match: "/profile" },
  ];

  const isActive = (match: string) =>
    location.pathname === match ||
    (match !== "/dashboard" && location.pathname.startsWith(match));

  const sidebarContent = (
    <div className="flex flex-col h-full bg-blue-600 text-white shadow-elevated">
      {/* Brand */}
      <div className="h-16 px-6 flex items-center justify-between">
        <Link
          to="/"
          onClick={() => setSidebarOpen(false)}
          className="font-extrabold tracking-tight text-white text-lg"
        >
          Daily Lessons
        </Link>
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden p-1.5 rounded-lg text-blue-100 hover:text-white hover:bg-blue-500/60"
          aria-label="Close sidebar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Prominent User Profile Card */}
      {user && (
        <div className="px-4 pb-3">
          <Link
            to="/profile"
            onClick={() => setSidebarOpen(false)}
            className="block rounded-2xl bg-blue-700/70 hover:bg-blue-700 p-3.5 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <Avatar name={user.name} avatarUrl={user.avatar_url} size="md" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-white truncate">{user.name}</p>
                <p className="text-[11px] text-blue-100 truncate">{user.email}</p>
              </div>
            </div>
            <div className="mt-2.5 flex items-center justify-between text-[11px]">
              <span className="px-2 py-0.5 rounded-full bg-white text-blue-600 font-bold capitalize shadow-sm">
                {user.role === "admin" ? "Admin" : "Learner"}
              </span>
              <span className="font-semibold text-blue-100 group-hover:text-white">
                Edit profile →
              </span>
            </div>
          </Link>
        </div>
      )}

      {/* Nav Links */}
      <div className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        <p className="px-3 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-blue-200">
          Workspace
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.match);
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                active
                  ? "bg-white text-blue-600 shadow-soft"
                  : "text-blue-100 hover:text-white hover:bg-blue-500/60"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}

        {user?.role === "admin" && (
          <>
            <p className="px-3 pt-4 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-blue-200">
              Administration
            </p>
            <Link
              to="/admin"
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                location.pathname.startsWith("/admin")
                  ? "bg-amber-400 text-zinc-900 shadow-soft"
                  : "bg-amber-300/20 text-amber-100 hover:bg-amber-300/30"
              }`}
            >
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Admin Console</span>
            </Link>
          </>
        )}
      </div>

      {/* Bottom Actions */}
      <div className="p-3 space-y-1">
        <Link
          to="/"
          onClick={() => setSidebarOpen(false)}
          className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-blue-100 hover:text-white hover:bg-blue-500/60 transition-colors"
        >
          <Home className="w-4 h-4 shrink-0" />
          <span>Back to Home</span>
        </Link>
        {user && (
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-rose-200 hover:text-white hover:bg-rose-500/25 transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Sign out</span>
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F7F7F5] text-zinc-900 flex">
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 sticky top-0 h-screen z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-zinc-900/30 backdrop-blur-xs"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] h-full z-10">{sidebarContent}</div>
        </div>
      )}

      {/* Main Content Column */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Utility Bar */}
        <header className="sticky top-0 z-20 h-16 bg-white/90 backdrop-blur-md shadow-nav px-4 sm:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl text-zinc-600 hover:bg-[#F7F7F5]"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            {location.pathname !== "/dashboard" && (
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F7F7F5] text-xs font-semibold text-zinc-700 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Back to Dashboard</span>
              </Link>
            )}
            <h2 className="text-base sm:text-lg font-extrabold text-zinc-900 tracking-tight">
              {getPageTitle(location.pathname)}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/lessons/today"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500 shadow-sm transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5" />
              Today&apos;s Lesson
            </Link>
            {user && (
              <Link
                to="/profile"
                className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full bg-[#F7F7F5] hover:bg-zinc-200/70 transition-colors"
              >
                <Avatar name={user.name} avatarUrl={user.avatar_url} size="sm" />
                <span className="hidden md:inline text-xs font-semibold text-zinc-800 max-w-[110px] truncate">
                  {user.name}
                </span>
              </Link>
            )}
          </div>
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
