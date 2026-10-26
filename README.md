# Vols pas chers — Projet Docker Cloud

Site très simple : on donne une ville de départ, une ou plusieurs destinations et une période,
il affiche les vols triés du moins cher au plus cher.

| Service | Techno | Rôle |
|---|---|---|
| `front` | React (Vite) servi par Node | Formulaire de recherche |
| `back` | Symfony 7.4 sur PHP-FPM 8.3 | API `GET /api/flights` |
| `proxy` | Nginx | Point d'entrée unique : `/` → front, `/api` → back |

Toutes les images partent d'`alpine:3.22` et installent elles-mêmes leurs dépendances (aucune image applicative de Docker Hub).

## Lancer

```sh
docker compose up -d --build
```

Puis ouvrir http://localhost:8088.

Par défaut les vols sont factices (`FLIGHT_PROVIDER=mock`). Pour de vrais vols, avec un lien direct vers la réservation
de chaque billet, créer un token gratuit sur travelpayouts.com puis un fichier `.env` à la racine (jamais commité) :

```sh
FLIGHT_PROVIDER=travelpayouts
TRAVELPAYOUTS_TOKEN=votre_token
```
