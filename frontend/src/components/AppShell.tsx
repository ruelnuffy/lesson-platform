import { useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Award,
  BookOpen,
  CreditCard,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  X,
} from "lucide-react";
import { useAuth } from "../lib/auth";

function getPageTitle(pathname: string): string {
  if (pathname === "/dashboard") return "Dashboard";
  if (pathname === "/lessons/today") return "Today's Lesson";
  if (pathname.includes("/quiz")) return "Lesson Quiz";
  if (pathname.startsWith("/lessons")) return "Lesson";
  if (pathname === "/scores") return "Quiz Scores";
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

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "DL";

  const navItems = [
    { to: "/dashboard", label: "Overview", icon: LayoutDashboard, match: "/dashboard" },
    { to: "/lessons/today", label: "Today's Lesson", icon: BookOpen, match: "/lessons" },
    { to: "/scores", label: "Quiz Scores", icon: Award, match: "/scores" },
    { to: "/checkout", label: "Billing & Enroll", icon: CreditCard, match: "/checkout" },
  ];

  const isActive = (match: string) =>
    location.pathname === match ||
    (match !== "/dashboard" && location.pathname.startsWith(match));

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white shadow-soft">
      {/* Brand */}
      <div className="h-16 px-6 flex items-center justify-between">
        <Link
          to="/"
          onClick={() => setSidebarOpen(false)}
          className="font-extrabold tracking-tight text-blue-600 text-lg"
        >
          Daily Lessons
        </Link>
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
          aria-label="Close sidebar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Nav Links */}
      <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
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
                  ? "bg-blue-600 text-white shadow-soft"
                  : "text-zinc-600 hover:text-zinc-900 hover:bg-[#F7F7F5]"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}

        {user?.role === "admin" && (
          <>
            <p className="px-3 pt-5 pb-2 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Administration
            </p>
            <Link
              to="/admin"
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                location.pathname.startsWith("/admin")
                  ? "bg-amber-500 text-white shadow-soft"
                  : "bg-amber-50 text-amber-800 hover:bg-amber-100"
              }`}
            >
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Admin Console</span>
            </Link>
          </>
        )}

        <div className="pt-5">
          <Link
            to="/"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-zinc-500 hover:text-zinc-900 hover:bg-[#F7F7F5] transition-colors"
          >
            <Home className="w-4 h-4 shrink-0" />
            <span>Back to Home</span>
          </Link>
        </div>
      </div>

      {/* User Footer */}
      {user && (
        <div className="p-3">
          <div className="bg-[#F7F7F5] rounded-2xl p-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-zinc-900 truncate">{user.name}</p>
                <p className="text-[11px] text-zinc-500 truncate">{user.email}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              title="Log out"
              className="p-2 rounded-lg text-zinc-500 hover:text-rose-600 hover:bg-white transition-colors shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
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
          </div>
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
