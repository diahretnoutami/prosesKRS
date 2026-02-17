<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\EnrollmentController;

Route::get('/enrollments', [EnrollmentController::class, 'index']);