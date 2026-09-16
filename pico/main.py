from machine import Pin, SPI
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


connect_wifi()
mqtt = connect_mqtt()

while True:
    brut = lire_mcp3004(0)  # canal 0 - LM35
    tension = brut * 3.3 / 1023
    temperature = tension * 100

    brut_hum = lire_mcp3004(1)  # canal 1 - humidite du sol
    humidite = (brut_hum / 1023) * 100

    print("Brut:", brut, "| Tension:", tension, "V | Temp:", temperature, "C",
          "|| Brut hum:", brut_hum, "| Humidite:", humidite, "%")

    # Un topic par capteur (lentia/sensors/<capteur>), une valeur JSON par
    # message. None -> "null" pour les capteurs pas encore cables (l'API les
    # enregistre alors comme NULL en base plutot que de ne rien envoyer).
    readings = {
        "temperature": round(temperature, 1),
        "soil_humidity": round(humidite, 1),
        "air_humidity": None,   # pas encore cable
        "luminosity": None,     # pas encore cable
        "water_level": None,    # pas encore cable
    }

    for capteur, valeur in readings.items():
        try:
            mqtt.publish("%s/%s" % (MQTT_TOPIC_PREFIX, capteur), ujson.dumps(valeur))
        except OSError as e:
            print("Erreur MQTT, reconnexion...", e)
            mqtt = connect_mqtt()

    time.sleep(1)
