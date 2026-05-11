<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BrokerController;
use App\Http\Controllers\Api\CandidateController;
use App\Http\Controllers\Api\GeneratedCVController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\QuickRegistrationController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::middleware('api')->group(function () {
    \Log::info('API route file loaded');
});

Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);

// Authenticated Routes
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/session', [AuthController::class, 'session']);

    // Candidates
    Route::get('/candidates', [CandidateController::class, 'index']);
    Route::get('/candidates/{id}', [CandidateController::class, 'show']);
    Route::post('/candidates', [CandidateController::class, 'store']);
    Route::put('/candidates/{id}', [CandidateController::class, 'update']);
    Route::patch('/candidates/{id}', [CandidateController::class, 'patch']);
    Route::delete('/candidates/{id}', [CandidateController::class, 'destroy']);
    Route::patch('/candidates/{id}/deadline', [CandidateController::class, 'updateDeadline']);

    Route::get('/search/candidates', [CandidateController::class, 'search']);

    // Users
    Route::get('/users', function () {
        return response()->json(\App\Models\User::all());
    });
    Route::get('/users/{id}', function ($id) {
        return response()->json(\App\Models\User::find($id));
    });
    Route::delete('/users/{id}', function ($id) {
        \App\Models\User::destroy($id);
        return response()->json(['success' => true]);
    });

    // Account
    Route::patch('/account/profile', function (\Illuminate\Http\Request $request) {
        $request->user()->update($request->only(['name']));
        return response()->json($request->user());
    });
    Route::patch('/account/password', function (\Illuminate\Http\Request $request) {
        $user = $request->user();
        if (!\Illuminate\Support\Facades\Hash::check($request->currentPassword, $user->password)) {
            return response()->json(['error' => 'Incorrect password'], 400);
        }
        $user->update(['password' => \Illuminate\Support\Facades\Hash::make($request->newPassword)]);
        return response()->json(['success' => true]);
    });

    // Brokers
    Route::get('/brokers', [BrokerController::class, 'index']);
    Route::get('/brokers/{id}', [BrokerController::class, 'show']);
    Route::post('/brokers', [BrokerController::class, 'store']);
    Route::delete('/brokers/{id}', [BrokerController::class, 'destroy']);

    // Notifications
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::patch('/notifications', [NotificationController::class, 'patch']);

    // Quick Registrations
    Route::get('/quick-registrations', [QuickRegistrationController::class, 'index']);
    Route::post('/quick-registrations', [QuickRegistrationController::class, 'store']);
    Route::get('/quick-registrations/{id}', [QuickRegistrationController::class, 'show']);

    // Generated CVs
    Route::get('/generated-cvs', [GeneratedCVController::class, 'index']);
    Route::post('/generated-cvs', [GeneratedCVController::class, 'store']);
    Route::patch('/generated-cvs/{id}', [GeneratedCVController::class, 'update']);
    Route::delete('/generated-cvs/{id}', [GeneratedCVController::class, 'destroy']);

    // Complex Logic (OCR & CV Gen)
    Route::post('/ocr/passport', [\App\Http\Controllers\Api\OcrController::class, 'parsePassport']);
    Route::post('/cv/generate', [\App\Http\Controllers\Api\CvController::class, 'generate']);
});
