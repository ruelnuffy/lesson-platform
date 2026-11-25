import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-slate-900 text-lg">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600 text-white text-sm font-bold">
            DL
          </span>
          Daily Lessons
        </Link>

        <nav className="flex items-center gap-4 text-sm font-medium">
          {user ? (
            <>
              <Link to="/dashboard" className="text-slate-600 hover:text-indigo-600">
                Dashboard
              </Link>
              <Link to="/lessons/today" className="text-slate-600 hover:text-indigo-600">
                Today&apos;s Lesson
              </Link>
              <Link to="/scores" className="text-slate-600 hover:text-indigo-600">
                Scores
              </Link>
              {user.role === "admin" && (
                <Link
                  to="/admin"
                  className="px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100"
                >
                  Admin
                </Link>
              )}
              <button
                onClick={handleLogout}
                className="text-slate-500 hover:text-slate-900 ml-2"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-slate-600 hover:text-indigo-600">
                Log in
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Get Started
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
