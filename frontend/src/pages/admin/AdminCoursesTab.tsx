import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  const [showPreview, setShowPreview] = useState(false);

  // Course form
  const [courseTitle, setCourseTitle] = useState("");
  const [courseDesc, setCourseDesc] = useState("");
  const [coursePriceNaira, setCoursePriceNaira] = useState("15000");

  // Bulk lessons form
  const [bulkStartDate, setBulkStartDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [bulkDays, setBulkDays] = useState("7");
  const [bulkStartDay, setBulkStartDay] = useState("1");

  // Single lesson form
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
    <div className="space-y-8">
      {/* Courses List + Create */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="font-bold text-slate-900 mb-3">Courses</h2>
          <div className="space-y-2">
            {courses.map((c) => (
              <div
                key={c.id}
                onClick={() => setSelectedCourseId(c.id)}
                className={`p-3 rounded-lg border cursor-pointer flex items-center justify-between ${
                  activeCourseId === c.id
                    ? "border-indigo-600 bg-indigo-50"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div>
                  <p className="font-semibold text-slate-900 text-sm">{c.title}</p>
                  <p className="text-xs text-slate-500">
                    {formatNaira(c.price_kobo)} · {c.lesson_count} lessons
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteCourse.mutate(c.id);
                  }}
                  className="text-xs text-rose-600 hover:underline"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>

        <form
          onSubmit={handleCreateCourse}
          className="bg-white border border-slate-200 rounded-xl p-5 space-y-3"
        >
          <h2 className="font-bold text-slate-900">Create New Course</h2>
          <input
            required
            placeholder="Course title"
            value={courseTitle}
            onChange={(e) => setCourseTitle(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <textarea
            rows={2}
            placeholder="Course description"
            value={courseDesc}
            onChange={(e) => setCourseDesc(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <div className="flex items-center gap-3">
            <input
              type="number"
              min="0"
              placeholder="Price (NGN)"
              value={coursePriceNaira}
              onChange={(e) => setCoursePriceNaira(e.target.value)}
              className="w-40 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
            >
              Add Course
            </button>
          </div>
        </form>
      </div>

      {activeCourseId && (
        <>
          {/* Bulk Create Days */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="font-bold text-slate-900 mb-3">Bulk Create Lesson Days</h2>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-xs text-slate-500">Start Date</label>
                <input
                  type="date"
                  value={bulkStartDate}
                  onChange={(e) => setBulkStartDate(e.target.value)}
                  className="mt-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500">Number of Days</label>
                <input
                  type="number"
                  min="1"
                  max="90"
                  value={bulkDays}
                  onChange={(e) => setBulkDays(e.target.value)}
                  className="mt-1 w-24 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500">Start Day #</label>
                <input
                  type="number"
                  min="1"
                  value={bulkStartDay}
                  onChange={(e) => setBulkStartDay(e.target.value)}
                  className="mt-1 w-24 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                />
              </div>
              <button
                type="button"
                onClick={() => bulkCreate.mutate()}
                className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800"
              >
                Bulk Create Days
              </button>
            </div>
          </div>

          {/* Lessons Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200 font-bold text-slate-900">
              Lessons ({lessons.length})
            </div>
            <div className="divide-y divide-slate-100">
              {lessons.map((l) => (
                <div
                  key={l.id}
                  className="px-5 py-3 flex items-center justify-between gap-4 text-sm"
                >
                  <div>
                    <span className="font-semibold text-indigo-700 mr-2">
                      Day {l.day_number}
                    </span>
                    <span className="font-medium text-slate-900">{l.title}</span>
                    <span className="ml-2 text-xs text-slate-500">({l.release_date})</span>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => startEditLesson(l)}
                      className="text-indigo-600 font-medium hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteLesson.mutate(l.id)}
                      className="text-rose-600 font-medium hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Lesson Markdown Editor with Preview */}
          <form
            onSubmit={handleSaveLesson}
            className="bg-white border border-slate-200 rounded-xl p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-900">
                {editingLesson ? `Edit Day ${editingLesson.day_number}` : "Create Lesson"}
              </h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowPreview((p) => !p)}
                  className="px-3 py-1 rounded border border-slate-300 text-xs font-medium"
                >
                  {showPreview ? "Hide Preview" : "Show Preview"}
                </button>
                {editingLesson && (
                  <button
                    type="button"
                    onClick={() => setEditingLesson(null)}
                    className="px-3 py-1 rounded border border-slate-300 text-xs"
                  >
                    Cancel Edit
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
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <input
                required
                placeholder="Lesson Title"
                value={lessonTitle}
                onChange={(e) => setLessonTitle(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <input
                type="date"
                required
                value={lessonReleaseDate}
                onChange={(e) => setLessonReleaseDate(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <input
              placeholder="Optional Video Embed URL (e.g. https://www.youtube.com/embed/...)"
              value={lessonVideoUrl}
              onChange={(e) => setLessonVideoUrl(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />

            <div className={showPreview ? "grid md:grid-cols-2 gap-4" : ""}>
              <textarea
                rows={10}
                value={lessonMarkdown}
                onChange={(e) => setLessonMarkdown(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
              />
              {showPreview && (
                <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 overflow-y-auto max-h-72">
                  <MarkdownView content={lessonMarkdown} />
                </div>
              )}
            </div>

            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
            >
              {editingLesson ? "Update Lesson" : "Create Lesson"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
