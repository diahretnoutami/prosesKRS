# KRS / Enrollment Single Page CRUD (Full Stack)

## Demo
- App URL: ...
- (Optional) Demo account: ...
- Export: tombol Export di halaman utama / endpoint: ...

## Tech Stack
- Frontend: Vite
- Backend: Laravel
- DB: PostgreSql

## Features
- CRUD Enrollments (KRS) + relasi Students & Courses
- Create menggunakan 1 transaksi yang melibatkan 3 tabel (students, courses, enrollments)
- Server-side pagination, sorting, quick filter, live search, advanced filter (AND/OR)
- Export seluruh data (hingga 5.000.000 rows) sesuai filter/query
- Seeder >= 5.000.000 rows

## Database 
### Schema
- students(id, nim, name, email, created_at, updated_at)
- courses(id, code, name, credits, created_at, updated_at)
- enrollments(id, student_id FK, course_id FK, academic_year, semester, status,created_at, updated_at)

### Relations (FK)
- enrollments.student_id → students.id (ON UPDATE CASCADE, ON DELETE RESTRICT)
- enrollments.course_id → courses.id (ON UPDATE CASCADE, ON DELETE RESTRICT)

### Uniqueness
- students.nim UNIQUE
- students.email UNIQUE
- courses.code UNIQUE
- enrollments UNIQUE (student_id, course_id, academic_year, semester)

### Check Constraints (DB-level validation)
- enrollments.academic_year must match YYYY/YYYY
- enrollments.semester in {1,2}
- enrollments.status in {DRAFT, SUBMITTED, APPROVED, REJECTED}

### Indexes (performa untuk 5 juta baris)
- idx_enrollments_student (student_id)
- idx_enrollments_course (course_id)
- idx_enrollments_term_status (academic_year, semester, status)

## Delete & Update
### Delete: Hard Delete (hanya enrollment)
Delete menggunakan hard delete pada tabel enrollments. Aksi ini hanya menghapus relasi KRS (enrollment) tanpa mempengaruhi master data students/courses.

### Update (hanya enrollment)
Delete menggunakan hard delete pada tabel enrollments. Aksi ini hanya menghapus relasi KRS (enrollment) tanpa mempengaruhi master data students/courses. course_id bisa diganti (artinya pindah mata kuliah) tetapi tidak mengubah data course. 

## Setup Local
### Prerequisites
Berikut versi yang dipakai saat development:
- PHP **8.2.30**
- Composer **2.5.8**
- Node.js **v22.14.0**
- npm **10.9.2**
- PostgreSQL **16.11**

### 1) clone repo
```bash
git clone https://github.com/diahretnoutami/prosesKRS
cd prosesKRS
```

### Backend Setup
### 2) Konfigurasi env
``` cd backend
cp .env.example .env
```

edit .env:
```
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=pcrtest
DB_USERNAME=postgres
DB_PASSWORD=yourpassword
```

### 3) Install dependencies & generate app key
``` composer install
php artisan key:generate
```

### 4) Create Database (via psql)
```psql -U postgres
CREATE DATABASE pcrtest;
```

### 5) Migration
```php artisan migrate```

### 6) Seeder
```php artisan db:seed --class=StudentSeeder```
```php artisan db:seed --class=CourseSeeder```
```php -d memory_limit=2048M artisan db:seed --class=EnrollmentSeeder```

verifikasi:
```psql -U postgres -d pcrtest -c "SELECT COUNT(*) FROM enrollments;"```

### 7) Run Backend
```php artisan serve```

### Frontend setup
### 8) Install dependencies
``cd frontend
npm install``

### 9) Run frontend
```npm run dev```
