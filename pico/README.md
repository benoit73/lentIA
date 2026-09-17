# Firmware Pico W — câblage

Résumé des broches utilisées par `main.py`. Tout est déjà câblé/testé sauf
mention contraire ; les valeurs viennent directement du code (source de
vérité si ça diverge un jour de ce fichier).

## Capteurs (via MCP3004, SPI0)

| Capteur                    | Canal MCP3004 | Topic MQTT                          | Statut |
|-----------------------------|:-------------:|--------------------------------------|--------|
| Température (LM35)          | 0             | `lentia/sensors/temperature`         | câblé  |
| Humidité du sol              | 1             | `lentia/sensors/soil_humidity`       | câblé  |
| Luminosité                   | 2             | `lentia/sensors/luminosity`          | câblé  |
| *(libre)*                    | 3             | —                                     | libre  |
| Humidité de l'air             | —             | `lentia/sensors/air_humidity`        | **pas câblé** (envoie `null`) |

Bus SPI0 vers le MCP3004 :

| Signal | Broche Pico |
|--------|:-----------:|
| SCK    | GP2         |
| MOSI   | GP3         |
| MISO   | GP4         |
| CS     | GP5         |

Le canal 3 du MCP3004 est libre — c'est le candidat naturel pour l'humidité
de l'air une fois le capteur en main (adapter `lire_mcp3004(3)` +
`readings["air_humidity"]` dans `main.py`).

## Capteur de niveau (HC-SR04)

| Signal | Broche Pico | Rôle                                             |
|--------|:-----------:|---------------------------------------------------|
| TRIG   | GP0         | Déclenche la mesure                                |
| ECHO   | GP1         | Retour d'écho, distance capteur → surface de l'eau |

Topic : `lentia/sensors/water_level`. Calibrer `RESERVOIR_FULL_CM` /
`RESERVOIR_EMPTY_CM` dans `main.py` selon la profondeur réelle du réservoir.

## Actionneurs (relais)

| Actionneur   | Broche Pico | Topic de commande                     | Statut |
|--------------|:-----------:|-----------------------------------------|--------|
| Lumière      | GP16        | `lentia/actuators/light/set`           | **pas câblé** |
| Chauffage    | GP17        | `lentia/actuators/heating/set`         | **pas câblé** |
| Arrosage     | GP18        | `lentia/actuators/watering/set`        | **pas câblé** |
| Ventilation  | GP19        | `lentia/actuators/ventilation/set`     | **pas câblé** |

Le firmware écoute déjà ces topics et pilote la broche correspondante
(`ACTUATOR_PINS` dans `main.py`) — il ne manque que le câblage des relais.
Aucun retour matériel : l'état affiché côté dashboard est celui de la
dernière commande envoyée, pas une confirmation physique.
