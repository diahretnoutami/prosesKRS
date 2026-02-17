<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('enrollments', function (Blueprint $table) {
            $table->id();

            $table->unsignedBigInteger('student_id');
            $table->unsignedBigInteger('course_id');

            $table->string('academic_year', 9);
            $table->unsignedSmallInteger('semester');
            $table->string('status', 10);

            $table->timestamps();

            $table->foreign('student_id', 'fk_enrollments_student')
                ->references('id')->on('students')
                ->cascadeOnUpdate()
                ->restrictOnDelete();

            $table->foreign('course_id', 'fk_enrollments_course')
                ->references('id')->on('courses')
                ->cascadeOnUpdate()
                ->restrictOnDelete();

            $table->unique(
                ['student_id', 'course_id', 'academic_year', 'semester'],
                'uq_enrollments_student_course_term'
            );

            $table->index(['academic_year', 'semester', 'status'], 'idx_enrollments_term_status');
            $table->index('student_id', 'idx_enrollments_student');
            $table->index('course_id', 'idx_enrollments_course');
        });

        DB::statement("ALTER TABLE enrollments ADD CONSTRAINT ck_enrollments_semester CHECK (semester IN (1,2))");
        DB::statement("ALTER TABLE enrollments ADD CONSTRAINT ck_enrollments_status CHECK (status IN ('DRAFT','SUBMITTED','APPROVED','REJECTED'))");
        DB::statement("ALTER TABLE enrollments ADD CONSTRAINT ck_enrollments_academic_year CHECK (academic_year ~ '^[0-9]{4}/[0-9]{4}$')");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('enrollments');
    }
};