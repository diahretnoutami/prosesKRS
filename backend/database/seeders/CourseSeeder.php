<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\Seeder;

class CourseSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $now = now();

        $courses = [];
        for ($i = 1; $i <= 20; $i++) {
            $code = 'IF' . str_pad((string) $i, 3, '0', STR_PAD_LEFT);

            $courses[] = [
                'code' => $code,
                'name' => "Course {$code}",
                'credits' => ($i % 6) + 1,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        DB::table('courses')->insert($courses);
    }
}