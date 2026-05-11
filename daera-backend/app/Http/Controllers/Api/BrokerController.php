<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Broker;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class BrokerController extends Controller
{
    public function index()
    {
        try {
            $brokers = Broker::with(['candidates:id,given_names,surname,passport_number,broker_id'])
                ->withCount('candidates')
                ->orderBy('name', 'asc')
                ->get();

            return response()->json($brokers->map(fn($b) => $this->formatBroker($b)));
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to fetch brokers'], 500);
        }
    }

    public function store(Request $request)
    {
        try {
            $name = $request->input('name');
            if (!$name) {
                return response()->json(['error' => 'Broker name is required'], 400);
            }

            $broker = Broker::create([
                'id'   => Str::random(25),
                'name' => trim($name),
            ]);

            $broker->loadCount('candidates');

            return response()->json($this->formatBroker($broker));
        } catch (\Illuminate\Database\QueryException $e) {
            if ($e->errorInfo[1] == 1062) {
                return response()->json(['error' => 'A broker with this name already exists'], 400);
            }
            return response()->json(['error' => 'Failed to create broker. Please try again.'], 500);
        }
    }

    public function show(string $id)
    {
        $broker = Broker::with(['candidates'])->withCount('candidates')->find($id);
        if (!$broker) return response()->json(['error' => 'Not found'], 404);
        return response()->json($this->formatBroker($broker));
    }

    public function destroy(string $id)
    {
        try {
            Broker::findOrFail($id)->delete();
            return response()->json(['success' => true]);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    private function formatBroker(Broker $b): array
    {
        return [
            'id' => $b->id,
            'name' => $b->name,
            'createdAt' => $b->created_at?->toIso8601String(),
            'candidates' => $b->candidates,
            '_count' => [
                'candidates' => $b->candidates_count ?? 0,
            ],
        ];
    }
}
