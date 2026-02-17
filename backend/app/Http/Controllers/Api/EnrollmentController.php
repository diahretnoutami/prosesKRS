<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class EnrollmentController extends Controller
{
    public function index(Request $request)
    {
        $page = max((int) $request->query('page', 1), 1);
        $pageSize = (int) $request->query('page_size', 10);
        $pageSize = min(max($pageSize, 1), 100);

        $query = DB::table('enrollments as e')
            ->join('students as s', 's.id', '=', 'e.student_id')
            ->join('courses as c', 'c.id', '=', 'e.course_id')
            ->select([
                'e.id',
                's.nim as student_nim',
                's.name as student_name',
                'c.code as course_code',
                'c.name as course_name',
                'e.semester',
                'e.academic_year',
                'e.status',
                'e.created_at',
                'e.updated_at',
            ]);

        // -------------------- Quick filters --------------------
        $status = $request->query('status');
        $semester = $request->query('semester');
        $academicYear = trim((string) $request->query('academic_year', ''));

        $allowedStatuses = ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'];

        if (is_string($status) && $status !== '' && strtoupper($status) !== 'ALL') {
            $status = strtoupper($status);
            if (in_array($status, $allowedStatuses, true)) {
                $query->where('e.status', $status);
            }
        }

        if ($semester !== null && $semester !== '' && (string) $semester !== 'ALL') {
            $sem = (int) $semester;
            if (in_array($sem, [1, 2], true)) {
                $query->where('e.semester', $sem);
            }
        }

        if ($academicYear !== '' && strtoupper($academicYear) !== 'ALL') {
            if (preg_match('/^\d{4}\/\d{4}$/', $academicYear) === 1) {
                $query->where('e.academic_year', $academicYear);
            }
        }

        // -------------------- Live search (server-side) --------------------
        $search = trim((string) $request->query('search', ''));
        if ($search !== '') {
            $like = '%' . str_replace(['%', '_'], ['\%', '\_'], $search) . '%';

            $query->where(function ($q) use ($like) {
                $q->where('s.nim', 'ILIKE', $like)
                  ->orWhere('s.name', 'ILIKE', $like)
                  ->orWhere('c.code', 'ILIKE', $like);
            });
        }

        // -------------------- Advanced filters (multi filter + AND/OR) --------------------
        $filtersRaw = $request->query('filters');
        $filterLogic = strtoupper((string) $request->query('filter_logic', 'AND'));
        $filterLogic = in_array($filterLogic, ['AND', 'OR'], true) ? $filterLogic : 'AND';

        $allowedFields = [
            'student_nim'   => 's.nim',
            'student_name'  => 's.name',
            'course_code'   => 'c.code',
            'course_name'   => 'c.name',
            'semester'      => 'e.semester',
            'academic_year' => 'e.academic_year',
            'status'        => 'e.status',
        ];

        $allowedOps = ['contains', 'startsWith', 'equals', 'between', 'in'];

        if (is_string($filtersRaw) && trim($filtersRaw) !== '') {
            $decoded = json_decode($filtersRaw, true);

            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                $query->where(function ($group) use ($decoded, $filterLogic, $allowedFields, $allowedOps, $allowedStatuses) {
                    foreach ($decoded as $rule) {
                        if (!is_array($rule)) continue;

                        $field = $rule['field'] ?? null;
                        $op    = $rule['op'] ?? null;
                        $value = $rule['value'] ?? null;

                        if (!is_string($field) || !isset($allowedFields[$field])) continue;
                        if (!is_string($op) || !in_array($op, $allowedOps, true)) continue;

                        $col = $allowedFields[$field];

                        $applyRule = function ($q) use ($field, $op, $value, $col, $allowedStatuses) {
                            $escapeLike = function (string $s) {
                                return str_replace(['%', '_'], ['\%', '\_'], $s);
                            };

                            if ($op === 'contains') {
                                if (!is_string($value) || $value === '') return;
                                $like = '%' . $escapeLike($value) . '%';
                                $q->where($col, 'ILIKE', $like);
                                return;
                            }

                            if ($op === 'startsWith') {
                                if (!is_string($value) || $value === '') return;
                                $like = $escapeLike($value) . '%';
                                $q->where($col, 'ILIKE', $like);
                                return;
                            }

                            if ($op === 'equals') {
                                if ($value === null || $value === '') return;
                                $q->where($col, '=', $value);
                                return;
                            }

                            if ($op === 'between') {
                                if (!is_array($value) || count($value) !== 2) return;
                                [$from, $to] = $value;
                                if ($from === null || $to === null || $from === '' || $to === '') return;
                                $q->whereBetween($col, [$from, $to]);
                                return;
                            }

                            if ($op === 'in') {
                                if (!is_array($value) || count($value) === 0) return;

                                if ($field === 'semester') {
                                    $vals = array_values(array_filter(
                                        array_map(fn ($v) => (int) $v, $value),
                                        fn ($v) => in_array($v, [1, 2], true)
                                    ));
                                    if (count($vals) === 0) return;
                                    $q->whereIn($col, $vals);
                                    return;
                                }

                                if ($field === 'status') {
                                    $vals = array_values(array_filter(
                                        array_map(fn ($v) => strtoupper((string) $v), $value),
                                        fn ($v) => in_array($v, $allowedStatuses, true)
                                    ));
                                    if (count($vals) === 0) return;
                                    $q->whereIn($col, $vals);
                                    return;
                                }

                                $q->whereIn($col, $value);
                                return;
                            }
                        };

                        if ($filterLogic === 'OR') {
                            $group->orWhere(function ($q) use ($applyRule) {
                                $applyRule($q);
                            });
                        } else {
                            $group->where(function ($q) use ($applyRule) {
                                $applyRule($q);
                            });
                        }
                    }
                });
            }
        }

        // -------------------- Sorting / Advanced Order (multi-column) --------------------
        $sortable = [
            'id'            => 'e.id',
            'student_nim'   => 's.nim',
            'student_name'  => 's.name',
            'course_code'   => 'c.code',
            'course_name'   => 'c.name',
            'semester'      => 'e.semester',
            'academic_year' => 'e.academic_year',
            'status'        => 'e.status',
        ];

        $sortsRaw = $request->query('sorts'); // JSON array
        $appliedAnySort = false;

        // Advanced order: sorts=[{field,dir},...]
        if (is_string($sortsRaw) && trim($sortsRaw) !== '') {
            $decodedSorts = json_decode($sortsRaw, true);

            if (json_last_error() === JSON_ERROR_NONE && is_array($decodedSorts)) {
                foreach ($decodedSorts as $s) {
                    if (!is_array($s)) continue;

                    $field = $s['field'] ?? null;
                    $dir = strtolower((string) ($s['dir'] ?? 'asc'));
                    $dir = $dir === 'desc' ? 'desc' : 'asc';

                    if (!is_string($field) || !isset($sortable[$field])) continue;

                    $query->orderBy($sortable[$field], $dir);
                    $appliedAnySort = true;
                }
            }
        }

        // Fallback: header sort (single)
        if (!$appliedAnySort) {
            $sortBy = (string) $request->query('sort_by', 'id');
            $sortDir = strtolower((string) $request->query('sort_dir', 'desc')) === 'asc' ? 'asc' : 'desc';
            $sortCol = $sortable[$sortBy] ?? 'e.id';

            $query->orderBy($sortCol, $sortDir);
        }

        // Tie-breaker (stable pagination), always last and ONLY ONCE
        $query->orderBy('e.id', 'desc');

        // -------------------- Pagination --------------------
        $total = (clone $query)->count();

        $rows = $query
            ->forPage($page, $pageSize)
            ->get();

        return response()->json([
            'data' => $rows,
            'meta' => [
                'page' => $page,
                'page_size' => $pageSize,
                'total' => $total,
                'total_pages' => (int) ceil($total / $pageSize),
            ],
        ]);
    }
}