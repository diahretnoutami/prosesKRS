import { useEffect, useState } from "react";
import "./App.css";

type EnrollmentRow = {
  id: number;
  student_nim: string;
  student_name: string;
  course_code: string;
  course_name: string;
  semester: number;
  academic_year: string;
  status: "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";
};

type ApiResponse = {
  data: EnrollmentRow[];
  meta: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
};

function Badge({ status }: { status: EnrollmentRow["status"] }) {
  const cls =
    status === "APPROVED"
      ? "badge badge--approved"
      : status === "REJECTED"
        ? "badge badge--rejected"
        : status === "SUBMITTED"
          ? "badge badge--submitted"
          : "badge badge--draft";

  return <span className={cls}>{status}</span>;
}

export default function App() {
  const [rows, setRows] = useState<EnrollmentRow[]>([]);
  const [meta, setMeta] = useState<ApiResponse["meta"] | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [sortBy, setSortBy] = useState<
    | "id"
    | "student_nim"
    | "student_name"
    | "course_code"
    | "course_name"
    | "semester"
    | "academic_year"
    | "status"
  >("id");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED"
  >("ALL");
  const [semesterFilter, setSemesterFilter] = useState<"ALL" | "1" | "2">(
    "ALL",
  );
  const [academicYearFilter, setAcademicYearFilter] = useState<"ALL" | string>(
    "ALL",
  );
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  function onSort(col: typeof sortBy) {
    setPage(1);
    if (sortBy === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(col);
      setSortDir("asc");
    }
  }

  const columns: { label: string; key: typeof sortBy }[] = [
    { label: "NIM", key: "student_nim" },
    { label: "Nama", key: "student_name" },
    { label: "Kode MK", key: "course_code" },
    { label: "Nama MK", key: "course_name" },
    { label: "Semester", key: "semester" },
    { label: "Tahun", key: "academic_year" },
    { label: "Status", key: "status" },
  ];

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      const qs = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize),
        sort_by: sortBy,
        sort_dir: sortDir,
        status: statusFilter,
        semester: semesterFilter,
        academic_year: academicYearFilter,
        search: search,
      });

      const res = await fetch(`/api/enrollments?${qs.toString()}`, {
        signal: controller.signal,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: ApiResponse = await res.json();
      setRows(json.data);
      setMeta(json.meta);
    }

    load().catch((e) => {
      if (e.name !== "AbortError") console.error(e);
    });

    return () => controller.abort();
  }, [page, sortBy, sortDir, statusFilter, semesterFilter, academicYearFilter, search]);

  return (
    <div className="page">
      {}
      <header className="navbar">
        <div className="navbar__inner">
          <div className="brand">
            <div className="brand__logo" />
            <b className="brand__title">KRS Akademik</b>
          </div>

          <nav className="nav">
            <a className="nav__link" href="#">
              Home
            </a>
            <a className="nav__link" href="#">
              About
            </a>
            <a className="nav__link" href="#">
              Contact
            </a>
            <a className="nav__link nav__link--primary" href="#">
              Login
            </a>
          </nav>
        </div>
      </header>

      {/* Content (full width) */}
      <main className="container">
        {/* Card */}
        <div className="card">
          <div className="card__header">
            <h2 className="title">Data KRS (Enrollments)</h2>
            <div className="subtitle">
              Total data: <b className="subtitle__strong">{meta?.total ?? 0}</b>
            </div>
          </div>

          <div className="card__body">
            {/* Top controls */}
            <div className="controls">
              {/* Row atas */}
              <div className="controls__top">
                <button
                  className="btn btn--primary"
                  onClick={() =>
                    alert("Next: kita bikin modal Create KRS (atomic 3 tabel)")
                  }
                >
                  + Tambah KRS
                </button>

                <div className="control">
                  <span>Show</span>
                  <select value={pageSize} disabled className="select">
                    <option>10</option>
                  </select>
                  <span>entries</span>
                </div>

                <div className="control">
                  <span>Search:</span>
                  <input
                    placeholder="NIM / Nama / Kode MK..."
                    className="input"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                  />
                </div>
              </div>

              {/* Row bawah: quick filters */}
              <div className="controls__filters">
                <div className="control">
                  <span>Status</span>
                  <select
                    className="select"
                    value={statusFilter}
                    onChange={(e) => {
                      setPage(1);
                      setStatusFilter(e.target.value as any);
                    }}
                  >
                    <option value="ALL">All</option>
                    <option value="DRAFT">DRAFT</option>
                    <option value="SUBMITTED">SUBMITTED</option>
                    <option value="APPROVED">APPROVED</option>
                    <option value="REJECTED">REJECTED</option>
                  </select>
                </div>

                <div className="control">
                  <span>Semester</span>
                  <select
                    className="select"
                    value={semesterFilter}
                    onChange={(e) => {
                      setPage(1);
                      setSemesterFilter(e.target.value as any);
                    }}
                  >
                    <option value="ALL">All</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                  </select>
                </div>

                <div className="control">
                  <span>Tahun Ajaran</span>
                  <select
                    className="select"
                    value={academicYearFilter}
                    onChange={(e) => {
                      setPage(1);
                      setAcademicYearFilter(e.target.value);
                    }}
                  >
                    <option value="ALL">All</option>
                    <option value="2024/2025">2024/2025</option>
                    <option value="2025/2026">2025/2026</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="tableWrap">
              <table className="table">
                <thead>
                  <tr>
                    {columns.map((c) => {
                      const active = sortBy === c.key;
                      const indicator = active
                        ? sortDir === "asc"
                          ? " ▲"
                          : " ▼"
                        : "";
                      return (
                        <th
                          key={c.key}
                          onClick={() => onSort(c.key)}
                          title="Click to sort"
                        >
                          {c.label}
                          {indicator}
                        </th>
                      );
                    })}
                  </tr>
                </thead>

                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td>{r.student_nim}</td>
                      <td>{r.student_name}</td>
                      <td>{r.course_code}</td>
                      <td>{r.course_name}</td>
                      <td>{r.semester}</td>
                      <td>{r.academic_year}</td>
                      <td>
                        <Badge status={r.status} />
                      </td>
                    </tr>
                  ))}

                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={7} className="empty">
                        No data
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="pagination">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="btn btn--ghost"
              >
                Prev
              </button>

              <span className="pagination__text">
                Page <b>{meta?.page ?? page}</b> /{" "}
                <b>{meta?.total_pages ?? 1}</b>
              </span>

              <button
                onClick={() =>
                  setPage((p) =>
                    meta ? Math.min(meta.total_pages, p + 1) : p + 1,
                  )
                }
                disabled={meta ? page >= meta.total_pages : false}
                className="btn btn--ghost"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
