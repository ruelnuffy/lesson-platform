import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CalendarPlus,
  CheckCircle2,
  Eye,
  EyeOff,
  FileText,
  Image as ImageIcon,
  Pencil,
  Plus,
  Trash2,
  Upload,
  Video,
} from "lucide-react";
import { MarkdownView } from "../../components/MarkdownView";
import {
  ApiError,
  apiFetch,
  formatNaira,
  resolveMediaUrl,
  uploadMedia,
} from "../../lib/api";

interface AdminCourse {
  id: number;
  title: string;
  description: string;
  price_kobo: number;
  image_url: string | null;
  is_active: boolean;
  lesson_count: number;
}

interface AdminLesson {
  id: number;
  course_id: number;
  day_number: number;
  title: string;
  content_markdown: string;
  video_url: string | null;
  release_date: string;
}

export function AdminCoursesTab() {
  const qc = useQueryClient();
  const coverInputRef = useRef<HTMLInputElement>(null);
  const mdInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [editingCourse, setEditingCourse] = useState<AdminCourse | null>(null);
  const [editingLesson, setEditingLesson] = useState<AdminLesson | null>(null);
  const [showPreview, setShowPreview] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Course form
  const [courseTitle, setCourseTitle] = useState("");
  const [courseDesc, setCourseDesc] = useState("");
  const [coursePriceNaira, setCoursePriceNaira] = useState("15000");
  const [courseImageUrl, setCourseImageUrl] = useState("");
  const [courseActive, setCourseActive] = useState(true);
  const [uploadingCover, setUploadingCover] = useState(false);

  // Bulk lessons form
  const [bulkStartDate, setBulkStartDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [bulkDays, setBulkDays] = useState("7");
  const [bulkStartDay, setBulkStartDay] = useState("1");

  // Lesson form
  const [lessonDay, setLessonDay] = useState("1");
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonReleaseDate, setLessonReleaseDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [lessonVideoUrl, setLessonVideoUrl] = useState("");
  const [lessonMarkdown, setLessonMarkdown] = useState("");
  const [uploadingVideo, setUploadingVideo] = useState(false);

  const flashSuccess = (msg: string) => {
    setErrorMessage("");
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(""), 4000);
  };

  const flashError = (err: unknown) => {
    setStatusMessage("");
    setErrorMessage(err instanceof ApiError ? err.message : "Operation failed");
  };

  const { data: courses = [] } = useQuery<AdminCourse[]>({
    queryKey: ["admin", "courses"],
    queryFn: () => apiFetch<AdminCourse[]>("/api/admin/courses"),
  });

  const activeCourseId = selectedCourseId ?? courses[0]?.id ?? null;

  const { data: lessons = [] } = useQuery<AdminLesson[]>({
    queryKey: ["admin", "lessons", activeCourseId],
    queryFn: () =>
      apiFetch<AdminLesson[]>(`/api/admin/lessons?course_id=${activeCourseId}`),
    enabled: Boolean(activeCourseId),
  });

  const resetCourseForm = () => {
    setEditingCourse(null);
    setCourseTitle("");
    setCourseDesc("");
    setCoursePriceNaira("15000");
    setCourseImageUrl("");
    setCourseActive(true);
  };

  const startEditCourse = (c: AdminCourse) => {
    setEditingCourse(c);
    setCourseTitle(c.title);
    setCourseDesc(c.description);
    setCoursePriceNaira(String(Math.round(c.price_kobo / 100)));
    setCourseImageUrl(c.image_url || "");
    setCourseActive(c.is_active);
  };

  const saveCourse = useMutation({
    mutationFn: () => {
      const payload = {
        title: courseTitle.trim(),
        description: courseDesc.trim(),
        price_kobo: Math.round(Number(coursePriceNaira) * 100),
        image_url: courseImageUrl.trim() || null,
        is_active: courseActive,
      };
      if (editingCourse) {
        return apiFetch<AdminCourse>(`/api/admin/courses/${editingCourse.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      }
      return apiFetch<AdminCourse>("/api/admin/courses", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: (saved) => {
      const wasEdit = Boolean(editingCourse);
      resetCourseForm();
      setSelectedCourseId(saved.id);
      qc.invalidateQueries({ queryKey: ["admin", "courses"] });
      qc.invalidateQueries({ queryKey: ["courses"] });
      flashSuccess(wasEdit ? `Updated course "${saved.title}".` : `Published course "${saved.title}".`);
    },
    onError: flashError,
  });

  const deleteCourse = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/api/admin/courses/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      setSelectedCourseId(null);
      resetCourseForm();
      qc.invalidateQueries({ queryKey: ["admin", "courses"] });
      qc.invalidateQueries({ queryKey: ["courses"] });
      flashSuccess("Course deleted.");
    },
    onError: flashError,
  });

  const bulkCreate = useMutation({
    mutationFn: () =>
      apiFetch<AdminLesson[]>(`/api/admin/courses/${activeCourseId}/lessons/bulk`, {
        method: "POST",
        body: JSON.stringify({
          start_date: bulkStartDate,
          num_days: Number(bulkDays),
          start_day_number: Number(bulkStartDay),
          title_prefix: "Day",
        }),
      }),
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ["admin", "lessons", activeCourseId] });
      qc.invalidateQueries({ queryKey: ["admin", "courses"] });
      flashSuccess(`Created ${created.length} scheduled lesson(s).`);
    },
    onError: flashError,
  });

  const saveLesson = useMutation({
    mutationFn: () => {
      if (editingLesson) {
        return apiFetch<AdminLesson>(`/api/admin/lessons/${editingLesson.id}`, {
          method: "PUT",
          body: JSON.stringify({
            day_number: Number(lessonDay),
            title: lessonTitle.trim(),
            release_date: lessonReleaseDate,
            video_url: lessonVideoUrl.trim() || null,
            content_markdown: lessonMarkdown,
          }),
        });
      }
      return apiFetch<AdminLesson>("/api/admin/lessons", {
        method: "POST",
        body: JSON.stringify({
          course_id: activeCourseId,
          day_number: Number(lessonDay),
          title: lessonTitle.trim(),
          release_date: lessonReleaseDate,
          video_url: lessonVideoUrl.trim() || null,
          content_markdown: lessonMarkdown,
        }),
      });
    },
    onSuccess: (saved) => {
      const wasEdit = Boolean(editingLesson);
      setEditingLesson(null);
      setLessonTitle("");
      setLessonVideoUrl("");
      setLessonDay(String(saved.day_number + 1));
      setLessonMarkdown("");
      qc.invalidateQueries({ queryKey: ["admin", "lessons", activeCourseId] });
      qc.invalidateQueries({ queryKey: ["admin", "courses"] });
      flashSuccess(wasEdit ? `Updated Day ${saved.day_number}.` : `Uploaded Day ${saved.day_number}: ${saved.title}.`);
    },
    onError: flashError,
  });

  const deleteLesson = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/api/admin/lessons/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "lessons", activeCourseId] });
      qc.invalidateQueries({ queryKey: ["admin", "courses"] });
      flashSuccess("Lesson deleted.");
    },
    onError: flashError,
  });

  const startEditLesson = (l: AdminLesson) => {
    setEditingLesson(l);
    setLessonDay(String(l.day_number));
    setLessonTitle(l.title);
    setLessonReleaseDate(l.release_date);
    setLessonVideoUrl(l.video_url || "");
    setLessonMarkdown(l.content_markdown);
  };

  const handleCoverUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    try {
      const res = await uploadMedia(file);
      setCourseImageUrl(res.url);
      flashSuccess("Course cover image uploaded.");
    } catch (err) {
      flashError(err);
    } finally {
      setUploadingCover(false);
    }
  };

  const handleVideoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingVideo(true);
    try {
      const res = await uploadMedia(file);
      setLessonVideoUrl(res.url);
      flashSuccess("Lesson video uploaded.");
    } catch (err) {
      flashError(err);
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleMarkdownFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setLessonMarkdown(text);
    if (!lessonTitle.trim()) {
      const heading = text.match(/^#\s+(.+)$/m);
      setLessonTitle(heading ? heading[1].trim() : file.name.replace(/\.(md|txt)$/i, ""));
    }
    flashSuccess(`Loaded "${file.name}" into editor.`);
  };

  const handleSaveCourse = (e: FormEvent) => {
    e.preventDefault();
    saveCourse.mutate();
  };

  const handleSaveLesson = (e: FormEvent) => {
    e.preventDefault();
    saveLesson.mutate();
  };

  return (
    <div className="space-y-6">
      {statusMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 text-emerald-700 text-sm flex items-center gap-2 shadow-soft">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-2xl bg-rose-50 text-rose-700 text-sm flex items-center gap-2 shadow-soft">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-5">
        {/* Courses List */}
        <div className="bg-white rounded-2xl shadow-soft p-5">
          <h2 className="font-bold text-zinc-900 mb-3">Courses ({courses.length})</h2>
          <div className="space-y-2.5">
            {courses.map((c) => (
              <div
                key={c.id}
                onClick={() => setSelectedCourseId(c.id)}
                className={`p-3.5 rounded-xl cursor-pointer flex items-center justify-between gap-3 transition-all ${
                  activeCourseId === c.id
                    ? "bg-blue-50 ring-2 ring-blue-600 shadow-sm"
                    : "bg-[#F7F7F5] hover:bg-zinc-100"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={resolveMediaUrl(c.image_url)}
                    alt={c.title}
                    className="w-12 h-12 rounded-lg object-cover shrink-0 bg-sky-50"
                  />
                  <div className="min-w-0">
                    <p className="font-bold text-zinc-900 text-sm truncate">{c.title}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {formatNaira(c.price_kobo)} · {c.lesson_count} lessons ·{" "}
                      {c.is_active ? "Active" : "Draft"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      startEditCourse(c);
                    }}
                    className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-100/60"
                    title="Edit course"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteCourse.mutate(c.id);
                    }}
                    className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50"
                    title="Delete course"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Create / Edit Course Form */}
        <form
          onSubmit={handleSaveCourse}
          className="bg-white rounded-2xl shadow-soft p-5 space-y-3.5"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-zinc-900">
              {editingCourse ? `Editing "${editingCourse.title}"` : "Upload New Course"}
            </h2>
            {editingCourse && (
              <button
                type="button"
                onClick={resetCourseForm}
                className="text-xs font-semibold text-zinc-500 hover:text-zinc-900"
              >
                Cancel
              </button>
            )}
          </div>

          <input
            required
            placeholder="Course title"
            value={courseTitle}
            onChange={(e) => setCourseTitle(e.target.value)}
            className="w-full rounded-xl bg-[#F7F7F5] px-3.5 py-2.5 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:shadow-soft"
          />
          <textarea
            rows={2}
            placeholder="Course description"
            value={courseDesc}
            onChange={(e) => setCourseDesc(e.target.value)}
            className="w-full rounded-xl bg-[#F7F7F5] px-3.5 py-2.5 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:shadow-soft"
          />

          <div className="flex flex-wrap items-center gap-3">
            <input
              type="number"
              min="0"
              placeholder="Price (NGN)"
              value={coursePriceNaira}
              onChange={(e) => setCoursePriceNaira(e.target.value)}
              className="w-36 rounded-xl bg-[#F7F7F5] px-3.5 py-2 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />

            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              onChange={handleCoverUpload}
              className="hidden"
            />
            <button
              type="button"
              disabled={uploadingCover}
              onClick={() => coverInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#F7F7F5] text-zinc-800 text-xs font-semibold hover:bg-zinc-200/70 transition-colors"
            >
              <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
              {uploadingCover
                ? "Uploading..."
                : courseImageUrl
                ? "Change Cover"
                : "Upload Cover Image"}
            </button>

            <label className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-700 cursor-pointer">
              <input
                type="checkbox"
                checked={courseActive}
                onChange={(e) => setCourseActive(e.target.checked)}
                className="w-4 h-4 rounded accent-blue-600"
              />
              Published
            </label>
          </div>

          {courseImageUrl && (
            <div className="flex items-center gap-3 bg-[#F7F7F5] rounded-xl p-2">
              <img
                src={resolveMediaUrl(courseImageUrl)}
                alt="Cover preview"
                className="w-12 h-12 rounded-lg object-cover"
              />
              <span className="text-xs text-zinc-600 truncate flex-1">{courseImageUrl}</span>
              <button
                type="button"
                onClick={() => setCourseImageUrl("")}
                className="text-xs text-rose-600 font-semibold px-2"
              >
                Remove
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={saveCourse.isPending}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-500 disabled:opacity-50 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            {saveCourse.isPending
              ? "Saving..."
              : editingCourse
              ? "Update Course"
              : "Publish Course"}
          </button>
        </form>
      </div>

      {activeCourseId && (
        <>
          <div className="bg-white rounded-2xl shadow-soft p-5">
            <h2 className="font-bold text-zinc-900 mb-3 flex items-center gap-2">
              <CalendarPlus className="w-4 h-4 text-blue-600" />
              Bulk Create Lesson Days
            </h2>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-500">Start Date</label>
                <input
                  type="date"
                  value={bulkStartDate}
                  onChange={(e) => setBulkStartDate(e.target.value)}
                  className="mt-1 rounded-xl bg-[#F7F7F5] px-3 py-2 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500">Days</label>
                <input
                  type="number"
                  min="1"
                  max="90"
                  value={bulkDays}
                  onChange={(e) => setBulkDays(e.target.value)}
                  className="mt-1 w-24 rounded-xl bg-[#F7F7F5] px-3 py-2 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500">Start Day #</label>
                <input
                  type="number"
                  min="1"
                  value={bulkStartDay}
                  onChange={(e) => setBulkStartDay(e.target.value)}
                  className="mt-1 w-24 rounded-xl bg-[#F7F7F5] px-3 py-2 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>
              <button
                type="button"
                disabled={bulkCreate.isPending}
                onClick={() => bulkCreate.mutate()}
                className="px-4 py-2 rounded-xl bg-zinc-900 text-white text-sm font-semibold hover:bg-blue-600 transition-colors"
              >
                {bulkCreate.isPending ? "Creating..." : "Bulk Create Days"}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-soft overflow-hidden">
            <div className="px-5 py-3.5 font-bold text-zinc-900">
              Scheduled Lessons ({lessons.length})
            </div>
            <div className="divide-y divide-zinc-100">
              {lessons.map((l) => (
                <div
                  key={l.id}
                  className="px-5 py-3.5 flex items-center justify-between gap-4 text-sm hover:bg-zinc-50/70"
                >
                  <div>
                    <span className="inline-block px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold text-xs mr-2">
                      Day {l.day_number}
                    </span>
                    <span className="font-semibold text-zinc-900">{l.title}</span>
                    <span className="ml-2 text-xs text-zinc-500">({l.release_date})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => startEditLesson(l)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-blue-700 hover:bg-blue-50"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteLesson.mutate(l.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Upload / Edit Lesson Form */}
          <form
            onSubmit={handleSaveLesson}
            className="bg-white rounded-2xl shadow-soft p-5 space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-bold text-zinc-900">
                {editingLesson ? `Editing Day ${editingLesson.day_number}` : "Upload Lesson"}
              </h2>
              <div className="flex flex-wrap gap-2">
                <input
                  ref={mdInputRef}
                  type="file"
                  accept=".md,.markdown,.txt"
                  onChange={handleMarkdownFile}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => mdInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F7F7F5] text-xs font-semibold text-zinc-800 hover:bg-zinc-200/70"
                >
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  Import .md File
                </button>
                <button
                  type="button"
                  onClick={() => setShowPreview((p) => !p)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 text-xs font-semibold text-zinc-700 hover:bg-zinc-200/80"
                >
                  {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {showPreview ? "Hide Preview" : "Show Preview"}
                </button>
                {editingLesson && (
                  <button
                    type="button"
                    onClick={() => setEditingLesson(null)}
                    className="px-3 py-1.5 rounded-lg bg-zinc-100 text-xs font-semibold text-zinc-600"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              <input
                type="number"
                min="1"
                required
                placeholder="Day #"
                value={lessonDay}
                onChange={(e) => setLessonDay(e.target.value)}
                className="rounded-xl bg-[#F7F7F5] px-3.5 py-2 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
              <input
                required
                placeholder="Lesson Title"
                value={lessonTitle}
                onChange={(e) => setLessonTitle(e.target.value)}
                className="rounded-xl bg-[#F7F7F5] px-3.5 py-2 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
              <input
                type="date"
                required
                value={lessonReleaseDate}
                onChange={(e) => setLessonReleaseDate(e.target.value)}
                className="rounded-xl bg-[#F7F7F5] px-3.5 py-2 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>

            <div className="p-4 rounded-2xl bg-[#F7F7F5] space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-700 flex items-center gap-1.5">
                  <Video className="w-4 h-4 text-blue-600" />
                  Lesson Video (Required)
                </label>
                <span className="text-[11px] text-zinc-500">MP4, WebM, MOV or Embed URL</span>
              </div>

              <div className="flex flex-wrap gap-2 items-center">
                <input
                  required
                  placeholder="Paste Video URL (YouTube/Vimeo) or upload a video file →"
                  value={lessonVideoUrl}
                  onChange={(e) => setLessonVideoUrl(e.target.value)}
                  className="flex-1 min-w-[240px] rounded-xl bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 shadow-sm"
                />
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  onChange={handleVideoUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={uploadingVideo}
                  onClick={() => videoInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500 shadow-sm transition-colors"
                >
                  <Video className="w-3.5 h-3.5" />
                  {uploadingVideo ? "Uploading Video..." : "Upload Video"}
                </button>
              </div>

              {lessonVideoUrl && (
                <div className="aspect-video max-h-56 w-full rounded-xl overflow-hidden bg-zinc-900">
                  {lessonVideoUrl.startsWith("/uploads/") ||
                  /\.(mp4|webm|mov)$/i.test(lessonVideoUrl) ? (
                    <video
                      src={resolveMediaUrl(lessonVideoUrl, "")}
                      controls
                      className="w-full h-full"
                    />
                  ) : (
                    <iframe
                      src={lessonVideoUrl}
                      title="Video preview"
                      className="w-full h-full"
                      allowFullScreen
                    />
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
                Lesson Notes / Summary (Optional Markdown)
              </label>
              <div className={showPreview ? "grid md:grid-cols-2 gap-4" : ""}>
                <textarea
                  rows={6}
                  placeholder="Optional written notes, links, or key takeaways..."
                  value={lessonMarkdown}
                  onChange={(e) => setLessonMarkdown(e.target.value)}
                  className="w-full rounded-xl bg-[#F7F7F5] px-3.5 py-2.5 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
                {showPreview && (
                  <div className="rounded-xl p-4 bg-zinc-50 shadow-inner overflow-y-auto max-h-52">
                    <MarkdownView content={lessonMarkdown || "*No written notes added.*"} />
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={saveLesson.isPending}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-500 disabled:opacity-50 shadow-sm"
            >
              <Upload className="w-4 h-4" />
              {saveLesson.isPending
                ? "Saving..."
                : editingLesson
                ? "Update Lesson"
                : "Upload Lesson"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
