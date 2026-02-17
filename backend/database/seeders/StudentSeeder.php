<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\Seeder;

class StudentSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $now = now();

        $students = [];
        for ($i = 1; $i <= 50; $i++) {
            $nim = str_pad((string) $i, 10, '0', STR_PAD_LEFT);

            $students[] = [
                'nim' => $nim,
                'name' => "Student {$i}",
                'email' => "student{$i}@example.com",
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        DB::table('students')->insert($students);
    }
}