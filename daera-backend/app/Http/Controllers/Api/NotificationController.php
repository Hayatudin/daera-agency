<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index()
    {
        try {
            $notifications = Notification::orderBy('created_at', 'desc')->limit(50)->get();
            return response()->json($notifications);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to fetch notifications'], 500);
        }
    }

    public function patch(Request $request)
    {
        try {
            if ($request->input('markAllRead')) {
                Notification::where('is_read', false)->update(['is_read' => true]);
                return response()->json(['success' => true]);
            }

            if ($id = $request->input('id')) {
                $notification = Notification::findOrFail($id);
                $notification->update(['is_read' => true]);
                return response()->json($notification);
            }

            return response()->json(['error' => 'Invalid request'], 400);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to update notification'], 500);
        }
    }
}
