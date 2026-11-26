import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  AlertCircle,
  Calendar,
  Camera,
  CheckCircle2,
  Mail,
  ShieldCheck,
  Trash2,
  User as UserIcon,
} from "lucide-react";
import { Avatar } from "../components/Avatar";
import { ApiError, apiFetch, type User } from "../lib/api";
import { useAuth } from "../lib/auth";

function resizeImageToDataUrl(file: File, maxSize = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas not supported"));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = () => reject(new Error("Invalid image file"));
      img.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export function ProfilePage() {
  const { user, refetchUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(user?.name || "");
  const [avatarUrl, setAvatarUrl] = useState<string>(user?.avatar_url || "");
  const [savedBanner, setSavedBanner] = useState(false);

  const updateProfile = useMutation<User, ApiError, { name: string; avatar_url: string | null }>({
    mutationFn: (payload) =>
      apiFetch<User>("/api/auth/profile", {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    onSuccess: async () => {
      await refetchUser();
      setSavedBanner(true);
      setTimeout(() => setSavedBanner(false), 3000);
    },
  });

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await resizeImageToDataUrl(file, 256);
      setAvatarUrl(dataUrl);
    } catch {
      // ignore invalid file
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSavedBanner(false);
    updateProfile.mutate({
      name: name.trim(),
      avatar_url: avatarUrl.trim() || null,
    });
  };

  if (!user) return null;

  return (
    <div className="w-full px-4 sm:px-8 py-8 space-y-7">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-blue-600">Account</p>
        <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight">
          Your Profile
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Update your display name and profile picture shown across your dashboard.
        </p>
      </div>

      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* Left: Profile Preview Card */}
        <div className="lg:col-span-5 bg-white rounded-3xl shadow-soft p-7 text-center">
          <div className="relative inline-block">
            <Avatar name={name || user.name} avatarUrl={avatarUrl || null} size="xl" />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-blue-600 text-white shadow-soft flex items-center justify-center hover:bg-blue-500 transition-colors"
              title="Upload photo"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          <h2 className="mt-4 text-xl font-extrabold text-zinc-900">
            {name || user.name}
          </h2>
          <p className="text-sm text-zinc-500 mt-0.5">{user.email}</p>

          <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold capitalize">
            <ShieldCheck className="w-3.5 h-3.5" />
            {user.role} Account
          </div>

          <div className="mt-6 pt-5 space-y-2.5 text-left text-xs text-zinc-600">
            <div className="flex items-center justify-between bg-[#F7F7F5] rounded-xl px-3.5 py-2.5">
              <span className="inline-flex items-center gap-1.5 font-medium">
                <Mail className="w-3.5 h-3.5 text-blue-600" />
                Email
              </span>
              <span className="font-semibold text-zinc-900 truncate max-w-[160px]">
                {user.email}
              </span>
            </div>
            <div className="flex items-center justify-between bg-[#F7F7F5] rounded-xl px-3.5 py-2.5">
              <span className="inline-flex items-center gap-1.5 font-medium">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                Joined
              </span>
              <span className="font-semibold text-zinc-900">
                {new Date(user.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Edit Form */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-7 bg-white rounded-3xl shadow-soft p-7 space-y-5"
        >
          <h2 className="text-lg font-extrabold text-zinc-900">Edit Details</h2>

          {savedBanner && (
            <div className="p-3.5 rounded-xl bg-emerald-50 text-emerald-700 text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Profile updated successfully.</span>
            </div>
          )}

          {updateProfile.error && (
            <div className="p-3.5 rounded-xl bg-rose-50 text-rose-700 text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{updateProfile.error.message}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Full Name
            </label>
            <div className="mt-1.5 relative">
              <UserIcon className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl bg-[#F7F7F5] pl-10 pr-4 py-3 text-sm text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:shadow-soft transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Profile Picture
            </label>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#F7F7F5] text-zinc-800 text-xs font-semibold hover:bg-zinc-200/70 transition-colors"
              >
                <Camera className="w-4 h-4 text-blue-600" />
                Upload Photo
              </button>
              {avatarUrl && (
                <button
                  type="button"
                  onClick={() => setAvatarUrl("")}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-rose-50 text-rose-600 text-xs font-semibold hover:bg-rose-100 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remove
                </button>
              )}
            </div>

            <input
              type="url"
              placeholder="Or paste an image URL (https://...)"
              value={avatarUrl.startsWith("data:") ? "" : avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              className="mt-3 w-full rounded-xl bg-[#F7F7F5] px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:shadow-soft transition"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={updateProfile.isPending}
              className="px-6 py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-500 disabled:opacity-50 shadow-soft transition-colors"
            >
              {updateProfile.isPending ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
