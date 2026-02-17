<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\Seeder;

class EnrollmentSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $now = now();

        $studentIds = DB::table('students')->pluck('id')->all();
        $courseIds  = DB::table('courses')->pluck('id')->all();

        if (empty($studentIds) || empty($courseIds)) {
            $this->command?->warn('Students/Courses empty. Run StudentSeeder & CourseSeeder first.');
            return;
        }

        $statuses = ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'];
        $years = ['2024/2025', '2025/2026'];

        $rows = [];
        $used = []; // untuk jaga unique kombinasi

        while (count($rows) < 200) {
            $studentId = $studentIds[array_rand($studentIds)];
            $courseId = $courseIds[array_rand($courseIds)];
            $academicYear = $years[array_rand($years)];
            $semester = random_int(1, 2);

            $key = "{$studentId}|{$courseId}|{$academicYear}|{$semester}";
            if (isset($used[$key])) {
                continue;
            }
            $used[$key] = true;

            $rows[] = [
                'student_id' => $studentId,
                'course_id' => $courseId,
                'academic_year' => $academicYear,
                'semester' => $semester,
                'status' => $statuses[array_rand($statuses)],
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        DB::table('enrollments')->insert($rows);
    }
}