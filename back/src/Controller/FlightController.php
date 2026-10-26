<?php

namespace App\Controller;

use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Contracts\HttpClient\HttpClientInterface;

class FlightController
{
    // Compagnies tirées au hasard pour les vols fictifs du mode démo (le mode réel accepte toutes les compagnies).
    private const MOCK_AIRLINES = ['Ryanair', 'easyJet', 'Vueling', 'Transavia', 'Air France', 'Lufthansa', 'TAP', 'ITA Airways'];

    #[Route('/api/health')]
    public function health(): JsonResponse
    {
        return new JsonResponse(['status' => 'ok']);
    }

    // Recherche d'une ville par nom, pays ou code IATA : /api/airports?q=barce
    #[Route('/api/airports')]
    public function airports(Request $request): JsonResponse
    {
        $q = mb_strtolower(trim($request->query->get('q', '')));
        if (strlen($q) < 2) {
            return new JsonResponse([]);
        }

        $exact = [];
        $startsWith = [];
        $contains = [];
        foreach ($this->cities() as $city) {
            $name = mb_strtolower($city['city']);
            if (strtolower($city['code']) === $q) {
                $exact[] = $city;
            } elseif (str_starts_with($name, $q)) {
                $startsWith[] = $city;
            } elseif (str_contains($name, $q) || str_contains(mb_strtolower($city['country']), $q)) {
                $contains[] = $city;
            }
        }

        return new JsonResponse(array_slice([...$exact, ...$startsWith, ...$contains], 0, 8));
    }

    // Exemple : /api/flights?origin=PAR&destinations=BCN,LIS&from=2026-11-01&to=2026-11-30&minNights=3&maxNights=7
    // Sans minNights/maxNights : aller simple. Sinon aller-retour, avec le retour le moins cher entre min et max nuits.
    // Ou bien returnDate=2026-11-08 : aller-retour avec une date de retour exacte.
    #[Route('/api/flights')]
    public function search(Request $request, HttpClientInterface $http): JsonResponse
    {
        $origin = strtoupper($request->query->get('origin', ''));
        $destinations = array_filter(explode(',', strtoupper($request->query->get('destinations', ''))));
        $from = $request->query->get('from', '');
        $to = $request->query->get('to', '');
        $minNights = (int) $request->query->get('minNights', 0);
        $maxNights = max($minNights, (int) $request->query->get('maxNights', 0));
        $returnDate = $request->query->get('returnDate', '');

        if (!$origin || !$destinations || !$from || !$to) {
            return new JsonResponse(['error' => 'Remplissez tous les champs.'], 400);
        }
        if ($from > $to) {
            return new JsonResponse(['error' => 'La date de début doit être avant la date de fin.'], 400);
        }

        $flights = [];
        $missing = [];
        foreach ($destinations as $destination) {
            $found = $_SERVER['FLIGHT_PROVIDER'] === 'travelpayouts'
                ? $this->travelpayouts($http, $origin, $destination, $from, $to, $minNights, $maxNights, $returnDate)
                : $this->mock($origin, $destination, $from, $to, $minNights, $maxNights, $returnDate);

            $count = count($flights);
            foreach ($found as $flight) {
                if ($flight['date'] >= $from && $flight['date'] <= $to) {
                    $flight['originCity'] = $this->cities()[$origin]['city'] ?? $origin;
                    $flight['city'] = $this->cities()[$destination]['city'] ?? $destination;
                    $flights[] = $flight;
                }
            }

            // Aucun prix connu pour cette destination : on propose une recherche en direct sur Aviasales.
            if (count($flights) === $count) {
                $back = $returnDate ?: ($maxNights > 0 ? date('Y-m-d', strtotime("$from +$minNights days")) : null);
                $missing[] = [
                    'destination' => $destination,
                    'city' => $this->cities()[$destination]['city'] ?? $destination,
                    'link' => 'https://www.aviasales.com/search/'.$origin.date('dm', strtotime($from)).$destination
                        .($back ? date('dm', strtotime($back)) : '').'1',
                ];
            }
        }

        usort($flights, fn ($a, $b) => $a['price'] <=> $b['price']);

        // Le premier vol trouvé pour une destination est le moins cher, puisque la liste est triée.
        $cheapestByDestination = [];
        foreach ($flights as $flight) {
            $cheapestByDestination[$flight['destination']] ??= $flight;
        }

        return new JsonResponse([
            'provider' => $_SERVER['FLIGHT_PROVIDER'],
            'cheapestByDestination' => array_values($cheapestByDestination),
            'missing' => $missing,
            'flights' => $flights,
        ]);
    }

    // Toutes les villes du monde ayant un aéroport (données Travelpayouts), indexées par code IATA.
    private function cities(): array
    {
        static $cities = null;
        if ($cities === null) {
            $list = json_decode(file_get_contents(__DIR__.'/../../data/cities.json'), true);
            $cities = array_column($list, null, 'code');
        }

        return $cities;
    }

    // Mode démo : lien Google Flights vers les vrais vols de ce trajet à ces dates (les vols fictifs n'ont pas de page).
    private function bookingLink(string $origin, string $destination, string $date, ?string $returnDate): string
    {
        $query = "Flights from $origin to $destination on $date".($returnDate ? " returning $returnDate" : ' one way');

        return 'https://www.google.com/travel/flights?hl=fr&curr=EUR&q='.rawurlencode($query);
    }

    // Un trajet (aller ou retour) : date, heures, durée, escales et compagnie.
    private function leg(string $departureAt, int $duration, int $stops, string $airline): array
    {
        $departure = new \DateTime($departureAt);

        return [
            'date' => $departure->format('Y-m-d'),
            'departure' => $departure->format('H:i'),
            'arrival' => $departure->modify("+$duration minutes")->format('H:i'),
            'duration' => $duration,
            'stops' => $stops,
            'airline' => $airline,
        ];
    }

    // Noms des compagnies aériennes à partir de leur code IATA (données Travelpayouts), ex : FR => Ryanair.
    private function airlineName(string $code): string
    {
        static $airlines = null;
        $airlines ??= json_decode(file_get_contents(__DIR__.'/../../data/airlines.json'), true);

        return $airlines[$code] ?? $code;
    }

    // Vraie API : prix les moins chers trouvés récemment par Aviasales, mois par mois sur la période.
    private function travelpayouts(HttpClientInterface $http, string $origin, string $destination, string $from, string $to, int $minNights, int $maxNights, string $returnDate): array
    {
        $flights = [];
        for ($month = substr($from, 0, 7); $month <= substr($to, 0, 7); $month = date('Y-m', strtotime("$month-01 +1 month"))) {
            $query = [
                'origin' => $origin,
                'destination' => $destination,
                'departure_at' => $month,
                'one_way' => $maxNights > 0 || $returnDate ? 'false' : 'true',
                'currency' => 'eur',
                'limit' => 1000,
                'token' => $_SERVER['TRAVELPAYOUTS_TOKEN'],
            ];
            if ($returnDate) {
                $query['return_at'] = $returnDate;
            }

            $data = $http->request('GET', 'https://api.travelpayouts.com/aviasales/v3/prices_for_dates', ['query' => $query])->toArray();

            foreach ($data['data'] as $f) {
                $airline = $this->airlineName($f['airline']);
                $outbound = $this->leg($f['departure_at'], $f['duration_to'] ?? $f['duration'] ?? 0, $f['transfers'], $airline);
                $return = null;
                if (isset($f['return_at'])) {
                    $return = $this->leg($f['return_at'], $f['duration_back'] ?? 0, $f['return_transfers'] ?? 0, $airline);
                    $return['nights'] = (int) ((strtotime($return['date']) - strtotime($outbound['date'])) / 86400);
                    // On ne garde que les retours à la date demandée, ou dont la durée de séjour est dans la plage.
                    $ok = $returnDate
                        ? $return['date'] === $returnDate
                        : $return['nights'] >= $minNights && $return['nights'] <= $maxNights;
                    if (!$ok) {
                        continue;
                    }
                }

                $flights[] = ['origin' => $origin, 'destination' => $destination] + $outbound + [
                    'return' => $return,
                    'price' => $f['price'],
                    'seller' => $f['gate'] ?? null,
                    // Lien vers ce billet précis sur Aviasales, prêt à être réservé.
                    'link' => 'https://www.aviasales.com'.$f['link'],
                ];
            }
        }

        return $flights;
    }

    // Mode démo : 1 à 3 vols fictifs par jour, toujours les mêmes pour une même recherche.
    private function mock(string $origin, string $destination, string $from, string $to, int $minNights, int $maxNights, string $returnDate): array
    {
        $flights = [];
        for ($day = $from; $day <= $to; $day = date('Y-m-d', strtotime("$day +1 day"))) {
            // Avec une date de retour exacte, l'aller doit partir avant.
            if ($returnDate && $day >= $returnDate) {
                break;
            }
            mt_srand(crc32($origin.$destination.$day));

            $count = mt_rand(1, 3);
            for ($i = 0; $i < $count; ++$i) {
                $outbound = $this->mockLeg($day);
                // Aller-retour : on teste chaque durée de séjour possible et on garde le retour le moins cher.
                $return = null;
                if ($returnDate) {
                    $nights = (int) ((strtotime($returnDate) - strtotime($day)) / 86400);
                    $return = $this->mockLeg($returnDate) + ['nights' => $nights];
                }
                for ($nights = $minNights; !$returnDate && $maxNights > 0 && $nights <= $maxNights; ++$nights) {
                    $leg = $this->mockLeg(date('Y-m-d', strtotime("$day +$nights days"))) + ['nights' => $nights];
                    if (!$return || $leg['price'] < $return['price']) {
                        $return = $leg;
                    }
                }

                $price = $outbound['price'] + ($return['price'] ?? 0);
                unset($outbound['price'], $return['price']);

                $flights[] = ['origin' => $origin, 'destination' => $destination] + $outbound + [
                    'return' => $return,
                    'price' => $price,
                    'link' => $this->bookingLink($origin, $destination, $day, $return['date'] ?? null),
                ];
            }
        }

        return $flights;
    }

    // Mode démo : un trajet fictif (heure, durée, escale, compagnie et prix aléatoires) pour ce jour.
    private function mockLeg(string $day): array
    {
        $stops = mt_rand(0, 3) === 0 ? 1 : 0;
        $time = sprintf('%s %02d:%02d', $day, mt_rand(6, 21), mt_rand(0, 11) * 5);
        $airline = self::MOCK_AIRLINES[mt_rand(0, count(self::MOCK_AIRLINES) - 1)];

        return $this->leg($time, mt_rand(70, 200) + $stops * 90, $stops, $airline) + ['price' => mt_rand(29, 260) - $stops * 20];
    }
}
