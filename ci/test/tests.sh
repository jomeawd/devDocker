#!/bin/sh
# Tests de bout en bout : chaque requête passe par le proxy, comme un vrai navigateur.

# PID 1 ignore SIGTERM par défaut : on l'intercepte pour s'arrêter proprement.
trap 'echo "test : SIGTERM reçu, arrêt"; exit 143' TERM INT

passed=0
failed=0

# check <nom> <code HTTP attendu> <chemin> [filtre jq qui doit être vrai]
check() {
    name=$1 expected=$2 path=$3 filter=$4
    body=$(mktemp)
    code=$(curl -s -o "$body" -w '%{http_code}' --max-time "$TEST_TIMEOUT" "$TARGET_URL$path")
    if [ "$code" = "$expected" ] && { [ -z "$filter" ] || jq -e "$filter" "$body" > /dev/null 2>&1; }; then
        echo "  ok    $name"
        passed=$((passed + 1))
    else
        echo "  ÉCHEC $name (HTTP $code, attendu $expected)"
        failed=$((failed + 1))
    fi
    rm -f "$body"
}

check "le front renvoie la page"           200 /
check "le front a une route /health"       200 /health
check "page inconnue -> 404"               404 /nexiste-pas
check "l'API répond ok"                    200 /api/health '.status == "ok"'
check "recherche d'aéroport par nom"       200 '/api/airports?q=paris' 'map(.code) | index("PAR") != null'
check "recherche par code IATA"            200 '/api/airports?q=bcn' '.[0].code == "BCN"'
check "recherche trop courte -> vide"      200 '/api/airports?q=p' 'length == 0'
check "vols sans paramètres -> 400"        400 /api/flights '.error != null'
check "vols avec dates inversées -> 400"   400 '/api/flights?origin=PAR&destinations=BCN&from=2030-02-01&to=2030-01-01' '.error != null'

echo "test : $passed réussi(s), $failed échoué(s)"
[ "$failed" -eq 0 ]
