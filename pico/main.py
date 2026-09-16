from machine import Pin, SPI, time_pulse_us
import network
import time
import ujson
from umqtt.simple import MQTTClient

# ===== A REMPLACER =====
WIFI_SSID = "LentIA"
WIFI_PASSWORD = "Admin74!"

MQTT_BROKER = "192.168.0.103"      # IP du broker MQTT
MQTT_PORT = 1883
MQTT_CLIENT_ID = "pico_terrarium"
MQTT_USER = None                   # None si le broker n'a pas d'authentification
MQTT_PASSWORD = None
MQTT_TOPIC_PREFIX = "lentia/sensors"  # un topic par capteur : lentia/sensors/<capteur>

# HC-SR04 (niveau du reservoir) : distance capteur -> eau, en cm, a calibrer
# sur le reservoir reel.
RESERVOIR_FULL_CM = 5.0    # distance quand le reservoir est plein (eau haute, distance courte)
RESERVOIR_EMPTY_CM = 25.0  # distance quand le reservoir est vide (eau basse, distance longue)
# ========================


def connect_wifi():
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    wlan.connect(WIFI_SSID, WIFI_PASSWORD)
    print("Connexion au WiFi", end="")
    while not wlan.isconnected():
        print(".", end="")
        time.sleep(0.5)
    print("\nWiFi connecte, IP:", wlan.ifconfig()[0])
    return wlan


def connect_mqtt():
    client = MQTTClient(MQTT_CLIENT_ID, MQTT_BROKER, port=MQTT_PORT,
                         user=MQTT_USER, password=MQTT_PASSWORD)
    client.connect()
    print("Connecte au broker MQTT")
    return client


spi = SPI(0, baudrate=1000000, polarity=0, phase=0,
          sck=Pin(2), mosi=Pin(3), miso=Pin(4))
cs = Pin(5, Pin.OUT)
cs.value(1)


def lire_mcp3004(canal):
    cs.value(0)
    cmd = bytearray([1, (8 + canal) << 4, 0])
    resultat = bytearray(3)
    spi.write_readinto(cmd, resultat)
    cs.value(1)
    valeur = ((resultat[1] & 3) << 8) + resultat[2]
    return valeur


trig = Pin(0, Pin.OUT)
echo = Pin(1, Pin.IN)
trig.value(0)


def lire_distance_hcsr04():
    """Distance capteur -> obstacle (eau), en cm. None si pas d'echo (hors
    de portee ou capteur deconnecte)."""
    trig.value(0)
    time.sleep_us(2)
    trig.value(1)
    time.sleep_us(10)
    trig.value(0)
    try:
        duree_us = time_pulse_us(echo, 1, 30000)  # timeout 30ms (~5m max)
    except OSError:
        return None
    return duree_us / 58  # vitesse du son ~343 m/s, aller-retour


def distance_vers_niveau(distance_cm):
    """Convertit une distance HC-SR04 en % de remplissage du reservoir,
    borne entre 0 et 100."""
    if distance_cm is None:
        return None
    plage = RESERVOIR_EMPTY_CM - RESERVOIR_FULL_CM
    niveau = (RESERVOIR_EMPTY_CM - distance_cm) / plage * 100
    return max(0.0, min(100.0, niveau))


connect_wifi()
mqtt = connect_mqtt()

while True:
    brut = lire_mcp3004(0)  # canal 0 - LM35
    tension = brut * 3.3 / 1023
    temperature = tension * 100

    brut_hum = lire_mcp3004(1)  # canal 1 - humidite du sol
    humidite = (brut_hum / 1023) * 100

    brut_lum = lire_mcp3004(2)  # canal 2 - luminosite
    # Si le capteur est cable en pull-down (tension augmente avec la
    # lumiere), inverser en (1023 - brut_lum) / 1023 * 100.
    luminosite = (brut_lum / 1023) * 100

    distance = lire_distance_hcsr04()  # TRIG sur GP0, ECHO sur GP1
    niveau_eau = distance_vers_niveau(distance)

    print("Brut:", brut, "| Tension:", tension, "V | Temp:", temperature, "C",
          "|| Brut hum:", brut_hum, "| Humidite:", humidite, "%",
          "|| Brut lum:", brut_lum, "| Luminosite:", luminosite, "%",
          "|| Distance:", distance, "cm | Niveau eau:", niveau_eau, "%")

    # Un topic par capteur (lentia/sensors/<capteur>), une valeur JSON par
    # message. None -> "null" pour les capteurs pas encore cables (l'API les
    # enregistre alors comme NULL en base plutot que de ne rien envoyer).
    readings = {
        "temperature": round(temperature, 1),
        "soil_humidity": round(humidite, 1),
        "air_humidity": None,   # pas encore cable
        "luminosity": round(luminosite, 1),
        "water_level": round(niveau_eau, 1) if niveau_eau is not None else None,
    }

    for capteur, valeur in readings.items():
        try:
            mqtt.publish("%s/%s" % (MQTT_TOPIC_PREFIX, capteur), ujson.dumps(valeur))
        except OSError as e:
            print("Erreur MQTT, reconnexion...", e)
            mqtt = connect_mqtt()

    time.sleep(1)
