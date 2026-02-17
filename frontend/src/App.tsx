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

type SortRule = {
  field:
    | "id"
    | "student_nim"
    | "student_name"
    | "course_code"
    | "course_name"
    | "semester"
    | "academic_year"
    | "status";
  dir: "asc" | "desc";
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

  // Advanced Order (multi-column)
  const [sortRules, setSortRules] = useState<SortRule[] | null>(null);
  const [showAdvancedSort, setShowAdvancedSort] = useState(false);
  const sortsKey = JSON.stringify(sortRules ?? []);

  // Quick filter (min 2)
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED"
  >("ALL");
  const [semesterFilter, setSemesterFilter] = useState<"ALL" | "1" | "2">(
    "ALL",
  );
  const [academicYearFilter, setAcademicYearFilter] = useState<"ALL" | string>(
    "ALL",
  );

  // Live search (debounce 300–500ms)
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  // Advanced filter UI
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [filterLogic, setFilterLogic] = useState<"AND" | "OR">("AND");

  // Advanced: student_nim op
  const [afNimOp, setAfNimOp] = useState<"contains" | "startsWith" | "equals">(
    "contains",
  );
  const [afNim, setAfNim] = useState("");

  // Advanced: academic_year equals/between
  const [afYearMode, setAfYearMode] = useState<"equals" | "between">("equals");
  const [afYear, setAfYear] = useState("");
  const [afYearFrom, setAfYearFrom] = useState("");
  const [afYearTo, setAfYearTo] = useState("");

  // Advanced: semester in
  const [afSemester, setAfSemester] = useState<{ 1: boolean; 2: boolean }>({
    1: false,
    2: false,
  });

  // Advanced: status in
  const [afStatus, setAfStatus] = useState<{
    DRAFT: boolean;
    SUBMITTED: boolean;
    APPROVED: boolean;
    REJECTED: boolean;
  }>({ DRAFT: false, SUBMITTED: false, APPROVED: false, REJECTED: false });

  function onSort(col: typeof sortBy) {
    setPage(1);
    // kalau user header-sort, matikan advanced order supaya ga konflik
    setSortRules(null);

    if (sortBy === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
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

  function buildAdvancedFilters() {
    const rules: any[] = [];

    if (afNim.trim()) {
      rules.push({ field: "student_nim", op: afNimOp, value: afNim.trim() });
    }

    if (afYearMode === "equals" && afYear.trim()) {
      rules.push({ field: "academic_year", op: "equals", value: afYear.trim() });
    }
    if (afYearMode === "between" && afYearFrom.trim() && afYearTo.trim()) {
      rules.push({
        field: "academic_year",
        op: "between",
        value: [afYearFrom.trim(), afYearTo.trim()],
      });
    }

    const sems = [afSemester[1] ? 1 : null, afSemester[2] ? 2 : null].filter(
      Boolean,
    );
    if (sems.length) rules.push({ field: "semester", op: "in", value: sems });

    const statuses = (
      Object.keys(afStatus) as (keyof typeof afStatus)[]
    ).filter((k) => afStatus[k]);
    if (statuses.length)
      rules.push({ field: "status", op: "in", value: statuses });

    return rules;
  }

  // ✅ stable key for dependency
  const advancedKey = JSON.stringify({
    afNimOp,
    afNim,
    afYearMode,
    afYear,
    afYearFrom,
    afYearTo,
    afSemester,
    afStatus,
    filterLogic,
  });

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  // fetch data
  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      const advancedRules = buildAdvancedFilters();

      const qs = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize),
        status: statusFilter,
        semester: semesterFilter,
        academic_year: academicYearFilter,
        search: search,
        filter_logic: filterLogic,
      });

      // Advanced order priority
      if (sortRules && sortRules.length > 0) {
        qs.set("sorts", JSON.stringify(sortRules));
      } else {
        qs.set("sort_by", sortBy);
        qs.set("sort_dir", sortDir);
      }

      if (advancedRules.length > 0) {
        qs.set("filters", JSON.stringify(advancedRules));
      }

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
  }, [
    page,
    sortBy,
    sortDir,
    statusFilter,
    semesterFilter,
    academicYearFilter,
    search,
    advancedKey,
    sortsKey,
    filterLogic,
  ]);

  // helper untuk UI advanced order
  const sortFieldOptions: { value: SortRule["field"]; label: string }[] = [
    { value: "academic_year", label: "academic_year" },
    { value: "semester", label: "semester" },
    { value: "student_nim", label: "student_nim" },
    { value: "student_name", label: "student_name" },
    { value: "course_code", label: "course_code" },
    { value: "course_name", label: "course_name" },
    { value: "status", label: "status" },
    { value: "id", label: "id" },
  ];

  return (
    <div className="page">
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

      <main className="container">
        <div className="card">
          <div className="card__header">
            <h2 className="title">Data KRS (Enrollments)</h2>
            <div className="subtitle">
              Total data: <b className="subtitle__strong">{meta?.total ?? 0}</b>
            </div>
          </div>

          <div className="card__body">
            <div className="controls">
              {/* ROW 1 */}
              <div className="controls__row1">
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

              {/* ROW 2 */}
              <div className="controls__row2">
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

              {/* ROW 3 */}
              <div className="controls__row3">
                <button
                  className="btn btn--ghost"
                  onClick={() => setShowAdvanced((v) => !v)}
                >
                  Advanced Filter
                </button>

                <button
                  className="btn btn--ghost"
                  onClick={() => setShowAdvancedSort((v) => !v)}
                >
                  Advanced Order
                </button>
              </div>

              {/* Advanced Filter */}
              {showAdvanced && (
                <div className="adv">
                  <div className="adv__group1">
                    <div className="adv__item">
                      <label className="adv__label">Logic</label>
                      <select
                        className="select"
                        value={filterLogic}
                        onChange={(e) => {
                          setPage(1);
                          setFilterLogic(e.target.value as any);
                        }}
                      >
                        <option value="AND">AND</option>
                        <option value="OR">OR</option>
                      </select>
                    </div>

                    <div className="adv__item">
                      <label className="adv__label">NIM</label>
                      <select
                        className="select"
                        value={afNimOp}
                        onChange={(e) => {
                          setPage(1);
                          setAfNimOp(e.target.value as any);
                        }}
                      >
                        <option value="contains">contains</option>
                        <option value="startsWith">startsWith</option>
                        <option value="equals">equals</option>
                      </select>
                    </div>

                    <div className="adv__item">
                      <label className="adv__label adv__label--ghost"></label>
                      <input
                        className="input"
                        value={afNim}
                        onChange={(e) => {
                          setPage(1);
                          setAfNim(e.target.value);
                        }}
                        placeholder="contoh: 0001"
                      />
                    </div>

                    <div className="adv__item">
                      <label className="adv__label">Academic Year</label>
                      <select
                        className="select"
                        value={afYearMode}
                        onChange={(e) => {
                          setPage(1);
                          setAfYearMode(e.target.value as any);
                        }}
                      >
                        <option value="equals">equals</option>
                        <option value="between">between</option>
                      </select>
                    </div>

                    <div className="adv__item adv__item--year">
                      <label className="adv__label adv__label--ghost"></label>

                      {afYearMode === "equals" ? (
                        <input
                          className="input"
                          placeholder="2025/2026"
                          value={afYear}
                          onChange={(e) => {
                            setPage(1);
                            setAfYear(e.target.value);
                          }}
                        />
                      ) : (
                        <div className="adv__between">
                          <input
                            className="input"
                            placeholder="from (YYYY/YYYY)"
                            value={afYearFrom}
                            onChange={(e) => {
                              setPage(1);
                              setAfYearFrom(e.target.value);
                            }}
                          />
                          <input
                            className="input"
                            placeholder="to (YYYY/YYYY)"
                            value={afYearTo}
                            onChange={(e) => {
                              setPage(1);
                              setAfYearTo(e.target.value);
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="adv__group2">
                    <div className="adv__block">
                      <label className="adv__label">Semester</label>

                      <label className="adv__check">
                        <input
                          type="checkbox"
                          checked={afSemester[1]}
                          onChange={(e) => {
                            setPage(1);
                            setAfSemester((s) => ({
                              ...s,
                              1: e.target.checked,
                            }));
                          }}
                        />
                        <span>1</span>
                      </label>

                      <label className="adv__check">
                        <input
                          type="checkbox"
                          checked={afSemester[2]}
                          onChange={(e) => {
                            setPage(1);
                            setAfSemester((s) => ({
                              ...s,
                              2: e.target.checked,
                            }));
                          }}
                        />
                        <span>2</span>
                      </label>
                    </div>

                    <div className="adv__block">
                      <label className="adv__label">Status</label>

                      {(
                        ["DRAFT", "SUBMITTED", "APPROVED", "REJECTED"] as const
                      ).map((st) => (
                        <label className="adv__check" key={st}>
                          <input
                            type="checkbox"
                            checked={afStatus[st]}
                            onChange={(e) => {
                              setPage(1);
                              setAfStatus((s) => ({
                                ...s,
                                [st]: e.target.checked,
                              }));
                            }}
                          />
                          <span>{st}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="adv__actions">
                    <button
                      className="btn btn--ghost"
                      onClick={() => {
                        setPage(1);
                        setFilterLogic("AND");
                        setAfNimOp("contains");
                        setAfNim("");
                        setAfYearMode("equals");
                        setAfYear("");
                        setAfYearFrom("");
                        setAfYearTo("");
                        setAfSemester({ 1: false, 2: false });
                        setAfStatus({
                          DRAFT: false,
                          SUBMITTED: false,
                          APPROVED: false,
                          REJECTED: false,
                        });
                      }}
                    >
                      Reset Advanced
                    </button>
                  </div>
                </div>
              )}

              {/* ✅ Advanced Order UI */}
              {showAdvancedSort && (
                <div className="adv">
                  <div className="adv__group1">
                    <div className="adv__item" style={{ gridColumn: "1 / -1" }}>
                      <label className="adv__label">
                        Advanced Order (multi-column)
                      </label>
                      <div style={{ color: "#6b7280", fontSize: 12, marginTop: 4 }}>
                        Urutan dieksekusi dari atas ke bawah.
                      </div>
                    </div>

                    {(sortRules ?? []).map((rule, idx) => (
                      <div
                        key={idx}
                        className="adv__item"
                        style={{ gridColumn: "1 / -1" }}
                      >
                        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                          <span style={{ width: 22, color: "#6b7280" }}>
                            {idx + 1}.
                          </span>

                          <select
                            className="select"
                            value={rule.field}
                            onChange={(e) => {
                              setPage(1);
                              setSortBy("id");
                              setSortDir("desc");
                              setSortRules((prev) => {
                                const next = [...(prev ?? [])];
                                next[idx] = { ...next[idx], field: e.target.value as any };
                                return next;
                              });
                            }}
                          >
                            {sortFieldOptions.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>

                          <select
                            className="select"
                            value={rule.dir}
                            onChange={(e) => {
                              setPage(1);
                              setSortRules((prev) => {
                                const next = [...(prev ?? [])];
                                next[idx] = { ...next[idx], dir: e.target.value as any };
                                return next;
                              });
                            }}
                          >
                            <option value="asc">ASC</option>
                            <option value="desc">DESC</option>
                          </select>

                          <button
                            className="btn btn--ghost"
                            onClick={() => {
                              setPage(1);
                              setSortRules((prev) => {
                                const next = [...(prev ?? [])];
                                next.splice(idx, 1);
                                return next.length ? next : null;
                              });
                            }}
                            title="Remove rule"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="adv__actions" style={{ gap: 10 }}>
                    <button
                      className="btn btn--primary"
                      onClick={() => {
                        setPage(1);
                        // kalau kosong, set default sesuai contoh requirement
                        if (!sortRules || sortRules.length === 0) {
                          setSortRules([
                            { field: "academic_year", dir: "desc" },
                            { field: "semester", dir: "asc" },
                            { field: "student_nim", dir: "asc" },
                          ]);
                          return;
                        }
                        setSortRules([...sortRules]);
                      }}
                    >
                      Apply Advanced Order
                    </button>

                    <button
                      className="btn btn--ghost"
                      onClick={() => {
                        setPage(1);
                        setSortRules((prev) => {
                          const next = [...(prev ?? [])];
                          next.push({ field: "student_nim", dir: "asc" });
                          return next;
                        });
                      }}
                    >
                      + Add Rule
                    </button>

                    <button
                      className="btn btn--ghost"
                      onClick={() => {
                        setPage(1);
                        setSortRules(null); // balik ke header sort
                        setShowAdvancedSort(false);
                      }}
                    >
                      Use Header Sort
                    </button>
                  </div>
                </div>
              )}
            </div>

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
