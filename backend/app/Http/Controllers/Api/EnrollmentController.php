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

        $sortBy = (string) $request->query('sort_by', 'id');
        $sortDir = strtolower((string) $request->query('sort_dir', 'desc')) === 'asc' ? 'asc' : 'desc';

        $sortable = [
            'id' => 'e.id',
            'student_nim' => 's.nim',
            'student_name' => 's.name',
            'course_code' => 'c.code',
            'course_name' => 'c.name',
            'semester' => 'e.semester',
            'academic_year' => 'e.academic_year',
            'status' => 'e.status',
        ];

        $sortColumn = $sortable[$sortBy] ?? 'e.id';
        $query->orderBy($sortColumn, $sortDir);

        if ($sortColumn !== 'e.id') {
            $query->orderBy('e.id', 'desc');
        }

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

        if ($semester !== null && $semester !== '' && (string)$semester !== 'ALL') {
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


        $search = trim((string) $request->query('search', ''));
        if ($search !== '') {
            $like = '%' . str_replace(['%', '_'], ['\%', '\_'], $search) . '%';

            $query->where(function ($q) use ($like) {
                $q->where('s.nim', 'ILIKE', $like)
                    ->orWhere('s.name', 'ILIKE', $like)
                    ->orWhere('c.code', 'ILIKE', $like);
            });
        }

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