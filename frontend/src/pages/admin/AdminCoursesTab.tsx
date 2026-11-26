import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarPlus, Eye, EyeOff, Pencil, Plus, Trash2 } from "lucide-react";
import { MarkdownView } from "../../components/MarkdownView";
import { apiFetch, formatNaira } from "../../lib/api";

interface AdminCourse {
  id: number;
  title: string;
  description: string;
  price_kobo: number;
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
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [editingLesson, setEditingLesson] = useState<AdminLesson | null>(null);
  const [showPreview, setShowPreview] = useState(true);

  const [courseTitle, setCourseTitle] = useState("");
  const [courseDesc, setCourseDesc] = useState("");
  const [coursePriceNaira, setCoursePriceNaira] = useState("15000");

  const [bulkStartDate, setBulkStartDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [bulkDays, setBulkDays] = useState("7");
  const [bulkStartDay, setBulkStartDay] = useState("1");

  const [lessonDay, setLessonDay] = useState("1");
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonReleaseDate, setLessonReleaseDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [lessonVideoUrl, setLessonVideoUrl] = useState("");
  const [lessonMarkdown, setLessonMarkdown] = useState("# Lesson Title\n\nContent...");

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

  const createCourse = useMutation({
    mutationFn: () =>
      apiFetch("/api/admin/courses", {
        method: "POST",
        body: JSON.stringify({
          title: courseTitle,
          description: courseDesc,
          price_kobo: Math.round(Number(coursePriceNaira) * 100),
          is_active: true,
        }),
      }),
    onSuccess: () => {
      setCourseTitle("");
      setCourseDesc("");
      qc.invalidateQueries({ queryKey: ["admin", "courses"] });
    },
  });

  const deleteCourse = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/api/admin/courses/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      setSelectedCourseId(null);
      qc.invalidateQueries({ queryKey: ["admin", "courses"] });
    },
  });

  const bulkCreate = useMutation({
    mutationFn: () =>
      apiFetch(`/api/admin/courses/${activeCourseId}/lessons/bulk`, {
        method: "POST",
        body: JSON.stringify({
          start_date: bulkStartDate,
          num_days: Number(bulkDays),
          start_day_number: Number(bulkStartDay),
          title_prefix: "Day",
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "lessons", activeCourseId] });
      qc.invalidateQueries({ queryKey: ["admin", "courses"] });
    },
  });

  const saveLesson = useMutation({
    mutationFn: () => {
      if (editingLesson) {
        return apiFetch(`/api/admin/lessons/${editingLesson.id}`, {
          method: "PUT",
          body: JSON.stringify({
            day_number: Number(lessonDay),
            title: lessonTitle,
            release_date: lessonReleaseDate,
            video_url: lessonVideoUrl || null,
            content_markdown: lessonMarkdown,
          }),
        });
      }
      return apiFetch("/api/admin/lessons", {
        method: "POST",
        body: JSON.stringify({
          course_id: activeCourseId,
          day_number: Number(lessonDay),
          title: lessonTitle,
          release_date: lessonReleaseDate,
          video_url: lessonVideoUrl || null,
          content_markdown: lessonMarkdown,
        }),
      });
    },
    onSuccess: () => {
      setEditingLesson(null);
      setLessonTitle("");
      setLessonVideoUrl("");
      setLessonMarkdown("# Lesson Title\n\nContent...");
      qc.invalidateQueries({ queryKey: ["admin", "lessons", activeCourseId] });
      qc.invalidateQueries({ queryKey: ["admin", "courses"] });
    },
  });

  const deleteLesson = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/api/admin/lessons/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "lessons", activeCourseId] });
      qc.invalidateQueries({ queryKey: ["admin", "courses"] });
    },
  });

  const startEditLesson = (l: AdminLesson) => {
    setEditingLesson(l);
    setLessonDay(String(l.day_number));
    setLessonTitle(l.title);
    setLessonReleaseDate(l.release_date);
    setLessonVideoUrl(l.video_url || "");
    setLessonMarkdown(l.content_markdown);
  };

  const handleCreateCourse = (e: FormEvent) => {
    e.preventDefault();
    createCourse.mutate();
  };

  const handleSaveLesson = (e: FormEvent) => {
    e.preventDefault();
    saveLesson.mutate();
  };

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl shadow-soft p-5">
          <h2 className="font-bold text-zinc-900 mb-3">Courses</h2>
          <div className="space-y-2">
            {courses.map((c) => (
              <div
                key={c.id}
                onClick={() => setSelectedCourseId(c.id)}
                className={`p-3.5 rounded-xl cursor-pointer flex items-center justify-between transition-all ${
                  activeCourseId === c.id
                    ? "bg-blue-50 ring-2 ring-blue-600 shadow-sm"
                    : "bg-zinc-50/80 hover:bg-zinc-100/80"
                }`}
              >
                <div>
                  <p className="font-bold text-zinc-900 text-sm">{c.title}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {formatNaira(c.price_kobo)} · {c.lesson_count} lessons
                  </p>
                </div>
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
            ))}
          </div>
        </div>

        <form
          onSubmit={handleCreateCourse}
          className="bg-white rounded-2xl shadow-soft p-5 space-y-3"
        >
          <h2 className="font-bold text-zinc-900">Create New Course</h2>
          <input
            required
            placeholder="Course title"
            value={courseTitle}
            onChange={(e) => setCourseTitle(e.target.value)}
            className="w-full rounded-xl bg-zinc-100/80 px-3.5 py-2 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:shadow-soft"
          />
          <textarea
            rows={2}
            placeholder="Course description"
            value={courseDesc}
            onChange={(e) => setCourseDesc(e.target.value)}
            className="w-full rounded-xl bg-zinc-100/80 px-3.5 py-2 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:shadow-soft"
          />
          <div className="flex items-center gap-3">
            <input
              type="number"
              min="0"
              placeholder="Price (NGN)"
              value={coursePriceNaira}
              onChange={(e) => setCoursePriceNaira(e.target.value)}
              className="w-36 rounded-xl bg-zinc-100/80 px-3.5 py-2 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:shadow-soft"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Add Course
            </button>
          </div>
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
                  className="mt-1 rounded-xl bg-zinc-100/80 px-3 py-2 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
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
                  className="mt-1 w-24 rounded-xl bg-zinc-100/80 px-3 py-2 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500">Start Day #</label>
                <input
                  type="number"
                  min="1"
                  value={bulkStartDay}
                  onChange={(e) => setBulkStartDay(e.target.value)}
                  className="mt-1 w-24 rounded-xl bg-zinc-100/80 px-3 py-2 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>
              <button
                type="button"
                onClick={() => bulkCreate.mutate()}
                className="px-4 py-2 rounded-xl bg-zinc-900 text-white text-sm font-semibold hover:bg-blue-600 transition-colors"
              >
                Bulk Create Days
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
                    <span className="ml-2 text-xs text-zinc-500 font-mono">
                      {l.release_date}
                    </span>
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

          <form
            onSubmit={handleSaveLesson}
            className="bg-white rounded-2xl shadow-soft p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-zinc-900">
                {editingLesson ? `Editing Day ${editingLesson.day_number}` : "Create Lesson"}
              </h2>
              <div className="flex gap-2">
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
                className="rounded-xl bg-zinc-100/80 px-3.5 py-2 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
              <input
                required
                placeholder="Lesson Title"
                value={lessonTitle}
                onChange={(e) => setLessonTitle(e.target.value)}
                className="rounded-xl bg-zinc-100/80 px-3.5 py-2 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
              <input
                type="date"
                required
                value={lessonReleaseDate}
                onChange={(e) => setLessonReleaseDate(e.target.value)}
                className="rounded-xl bg-zinc-100/80 px-3.5 py-2 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>

            <input
              placeholder="Optional Video Embed URL (e.g. https://www.youtube.com/embed/...)"
              value={lessonVideoUrl}
              onChange={(e) => setLessonVideoUrl(e.target.value)}
              className="w-full rounded-xl bg-zinc-100/80 px-3.5 py-2 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />

            <div className={showPreview ? "grid md:grid-cols-2 gap-4" : ""}>
              <textarea
                rows={10}
                value={lessonMarkdown}
                onChange={(e) => setLessonMarkdown(e.target.value)}
                className="w-full rounded-xl bg-zinc-100/80 px-3.5 py-2.5 text-sm font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
              {showPreview && (
                <div className="rounded-xl p-4 bg-zinc-50 shadow-inner overflow-y-auto max-h-72">
                  <MarkdownView content={lessonMarkdown} />
                </div>
              )}
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
            >
              {editingLesson ? "Update Lesson" : "Create Lesson"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
