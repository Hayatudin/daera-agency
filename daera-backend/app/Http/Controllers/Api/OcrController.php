<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class OcrController extends Controller
{
    private const COUNTRY_MAP = [
        'ETH' => 'Ethiopia', 'KEN' => 'Kenya', 'UGA' => 'Uganda', 'TZA' => 'Tanzania',
        'NGA' => 'Nigeria', 'GHA' => 'Ghana', 'EGY' => 'Egypt', 'ZAF' => 'South Africa',
        'IND' => 'India', 'PAK' => 'Pakistan', 'BGD' => 'Bangladesh', 'LKA' => 'Sri Lanka',
        'NPL' => 'Nepal', 'PHL' => 'Philippines', 'IDN' => 'Indonesia', 'MMR' => 'Myanmar',
        'SAU' => 'Saudi Arabia', 'ARE' => 'United Arab Emirates', 'KWT' => 'Kuwait',
        'QAT' => 'Qatar', 'BHR' => 'Bahrain', 'OMN' => 'Oman', 'JOR' => 'Jordan',
        'USA' => 'United States', 'GBR' => 'United Kingdom', 'CAN' => 'Canada',
        'SOM' => 'Somalia', 'SDN' => 'Sudan', 'SSD' => 'South Sudan', 'ERI' => 'Eritrea',
        'DJI' => 'Djibouti', 'CMR' => 'Cameroon', 'COD' => 'DR Congo', 'MDG' => 'Madagascar',
    ];

    public function parsePassport(Request $request)
    {
        $ocrText = $request->input('ocrText');

        if (!$ocrText || !is_string($ocrText)) {
            return response()->json(['error' => 'No OCR text provided'], 400);
        }

        $mrz = $this->findMrzLines($ocrText);

        if (!$mrz) {
            return response()->json(['error' => 'MRZ not detected. Use clearer passport image.'], 422);
        }

        [$line1, $line2] = $mrz;

        $issuingCountry = str_replace('<', '', substr($line1, 2, 3));
        $nameField = substr($line1, 5);
        $parts = explode('<<', $nameField);

        $surname = $this->cleanName($parts[0] ?? '');
        $givenNames = '';

        if (count($parts) > 1) {
            $givenNames = $this->cleanName($parts[1]);
        }

        $surname = strtoupper($surname);
        $givenNames = strtoupper($givenNames);
        
        if (preg_match('/^(.)\1{3,}$/', preg_replace('/\s/', '', $givenNames))) {
            $givenNames = '';
        }

        $passportNumber = str_replace('<', '', substr($line2, 0, 9));
        $nationality = str_replace('<', '', substr($line2, 10, 3));
        $dobRaw = str_replace('<', '', substr($line2, 13, 6));
        $genderRaw = $line2[20] ?? '';
        $expiryRaw = str_replace('<', '', substr($line2, 21, 6));

        $gender = '';
        if ($genderRaw === 'M') {
            $gender = 'Male';
        } elseif ($genderRaw === 'F') {
            $gender = 'Female';
        }

        $dateOfBirth = $this->formatDate($dobRaw);
        $dateOfExpiry = $this->formatDate($expiryRaw);

        $natCode = $nationality ?: $issuingCountry;
        $nationalityFull = self::COUNTRY_MAP[$natCode] ?? $natCode;

        return response()->json([
            'passportNumber' => $passportNumber,
            'surname' => $surname,
            'givenNames' => $givenNames,
            'dateOfBirth' => $dateOfBirth,
            'gender' => $gender,
            'nationality' => $nationalityFull,
            'dateOfExpiry' => $dateOfExpiry,
        ]);
    }

    private function cleanDateRaw(string $raw): string
    {
        if (!$raw) return '';

        $cleaned = strtoupper($raw);
        $cleaned = str_replace(['O', 'I', 'Z'], ['0', '1', '2'], $cleaned);
        $cleaned = preg_replace('/[^0-9]/', '', $cleaned);
        
        return substr($cleaned, 0, 6);
    }

    private function formatDate(string $raw): string
    {
        $cleaned = $this->cleanDateRaw($raw);

        if (strlen($cleaned) !== 6) return '';

        $year = (int) substr($cleaned, 0, 2);
        $month = (int) substr($cleaned, 2, 2);
        $day = (int) substr($cleaned, 4, 2);

        if ($year < 0 || $month < 1 || $month > 12 || $day < 1 || $day > 31) {
            return '';
        }

        $fullYear = $year > 30 ? 1900 + $year : 2000 + $year;

        return sprintf('%d-%02d-%02d', $fullYear, $month, $day);
    }

    private function normalizeLine(string $raw): string
    {
        $cleaned = strtoupper($raw);
        $cleaned = preg_replace(['/ /', '/[^A-Z0-9<]/'], ['', ''], $cleaned);
        $cleaned = preg_replace('/<+[A-Z]?<+/', '<<', $cleaned);

        if (strlen($cleaned) >= 44) {
            return substr($cleaned, 0, 44);
        }
        return str_pad($cleaned, 44, '<');
    }

    private function mrzScore(string $raw): int
    {
        $cleaned = strtoupper(preg_replace('/[^A-Z0-9<]/i', '', $raw));
        $score = 0;
        $len = strlen($cleaned);

        if ($len >= 40 && $len <= 48) {
            $score += 30;
        } elseif ($len >= 35 && $len <= 52) {
            $score += 10;
        } else {
            return 0;
        }

        $brackets = substr_count($cleaned, '<');
        $score += min($brackets * 3, 30);

        preg_match_all('/\d/', $cleaned, $digitsMatches);
        $digits = count($digitsMatches[0]);
        $score += min($digits * 2, 20);

        if (preg_match('/REPUBLIC|PASSPORT|FEDERAL/i', $raw)) {
            $score -= 50;
        }

        return $score;
    }

    private function findMrzLines(string $text): ?array
    {
        $rawLines = array_filter(array_map('trim', explode("\n", $text)));
        $scored = [];

        foreach ($rawLines as $index => $line) {
            $score = $this->mrzScore($line);
            if ($score > 0) {
                $scored[] = [
                    'line' => $line,
                    'index' => $index,
                    'score' => $score,
                    'cleaned' => strtoupper(preg_replace('/[^A-Z0-9<]/i', '', $line)),
                ];
            }
        }

        usort($scored, fn($a, $b) => $b['score'] <=> $a['score']);

        foreach ($scored as $l1) {
            if (!str_starts_with($l1['cleaned'], 'P')) continue;

            foreach ($scored as $l2) {
                if ($l2['index'] <= $l1['index']) continue;

                preg_match_all('/\d/', $l2['cleaned'], $digitMatches);
                $digitCount = count($digitMatches[0]);
                
                if ($digitCount >= 6) {
                    $line1 = $this->normalizeLine($l1['cleaned']);
                    $line2 = $this->normalizeLine($l2['cleaned']);

                    if (strlen($line1) === 44 && strlen($line2) === 44) {
                        return [$line1, $line2];
                    }
                }
            }
        }

        return null;
    }

    private function cleanName(string $name): string
    {
        if (!$name) return '';

        $name = preg_replace('/<+/', ' ', $name);
        $name = preg_replace('/[^A-Z ]/i', '', $name);
        $name = preg_replace('/\s+/', ' ', $name);
        
        return trim($name);
    }
}
