export function Avatar({
  name,
  avatarUrl,
  size = "md",
}: {
  name: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "DL";

  const sizeClass = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-xs",
    lg: "w-14 h-14 text-base",
    xl: "w-24 h-24 text-2xl",
  }[size];

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={`${sizeClass} rounded-full object-cover shadow-sm shrink-0 bg-sky-50`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shadow-sm shrink-0`}
    >
      {initials}
    </div>
  );
}
