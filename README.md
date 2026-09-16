# lentIA — stack MQTT / API / dashboard

Stack Docker pour le projet scolaire lentIA (suivi d'un bac de lentilles avec
Raspberry Pi, capteurs et réseau de neurones).

## Composants

| Service            | Rôle                                                                 | Port(s)      |
|---------------------|-----------------------------------------------------------------------|--------------|
| `mosquitto`         | Broker MQTT                                                           | 1883, 9001 (WebSocket) |
| `postgres`          | Base de données des relevés                                           | 5432         |
| `api`               | Flask : s'abonne au MQTT, enregistre en base, expose l'API REST, sert le dashboard | 5000         |
| `mqtt-test-client`  | Publie des données aléatoires (à remplacer par le vrai Pico W)        | —            |

## Format des messages MQTT

Un topic par capteur, sous le préfixe `lentia/sensors/` :

| Topic                          | Capteur                  |
|---------------------------------|---------------------------|
| `lentia/sensors/soil_humidity`  | Humidité du sol            |
| `lentia/sensors/air_humidity`   | Humidité de l'air           |
| `lentia/sensors/temperature`    | Température                |
| `lentia/sensors/luminosity`     | Luminosité                 |
| `lentia/sensors/water_level`    | Niveau du réservoir d'eau  |

Chaque message ne contient que la valeur JSON du capteur (pas d'objet), par
exemple `21.3` sur `lentia/sensors/temperature`, ou `null` si le capteur
n'est pas encore câblé :

```
lentia/sensors/temperature   -> 21.3
lentia/sensors/soil_humidity -> 45.2
lentia/sensors/air_humidity  -> null
```

L'API s'abonne au wildcard `lentia/sensors/+` et enregistre une ligne en base
par message reçu (les autres colonnes restent `NULL` sur cette ligne — un
message ne porte la valeur que d'un seul capteur). Ton firmware Pico W n'a
qu'à publier sur ces mêmes topics, avec `null` pour les capteurs pas encore
câblés, pour remplacer le client de test.

## Lancer le stack

```bash
docker compose up --build
```

Puis ouvrir : http://localhost:5000

- Historique : chargé depuis Postgres via `/api/readings`.
- Temps réel : le dashboard se connecte directement au broker en MQTT over
  WebSocket (port 9001) et met à jour les cartes/graphes à chaque message.

Pour arrêter : `docker compose down` (ajouter `-v` pour aussi supprimer les
données stockées).

## API REST

- `GET /api/readings?limit=200` — historique (plus ancien → plus récent)
- `GET /api/readings/latest` — dernier relevé enregistré
- `GET /api/config` — infos de connexion MQTT pour le front (host/port websocket, topic)
- `GET /api/health` — healthcheck

## Où brancher le vrai matériel

Remplace (ou coupe) le service `mqtt-test-client` et fais publier ton Pico W
directement sur les topics `lentia/sensors/<capteur>`, sur
`<ip-du-serveur>:1883`, avec le même format (une valeur JSON par message).
Rien d'autre à changer : l'API et le dashboard fonctionnent déjà avec
n'importe quelle source qui respecte ce format.

## Notes

- Authentification MQTT désactivée (`allow_anonymous true`) pour rester simple
  en développement/démo. À sécuriser (utilisateur/mot de passe ou certificats)
  avant un usage exposé sur Internet.
- Les identifiants Postgres (`lentia` / `lentia`) sont volontairement simples
  pour un projet scolaire ; à changer si le stack est exposé publiquement.
