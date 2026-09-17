"""API Flask pour le projet lentIA — point d'entrée.

Rôles répartis entre modules :
- config.py       : configuration (variables d'environnement)
- db.py           : accès Postgres (écriture des relevés, historique)
- mqtt_ingest.py  : abonnement MQTT, persistance en base, diffusion temps réel
- realtime.py     : pub/sub en mémoire entre mqtt_ingest et les routes WebSocket
- routes.py       : routes HTTP REST (santé, liste des capteurs, historique)
- ws.py           : routes WebSocket (une par capteur, temps réel)
- automation.py   : évaluation périodique des règles d'automatisation
"""

from flask import Flask, send_from_directory

import automation
import mqtt_ingest
import ws
from routes import bp as routes_bp


def create_app():
    app = Flask(__name__, static_folder="static", template_folder="templates")
    app.register_blueprint(routes_bp)
    ws.register(app)

    @app.route("/")
    def index():
        return send_from_directory(app.template_folder, "index.html")

    return app


app = create_app()

if __name__ == "__main__":
    mqtt_ingest.start()
    automation.start()
    app.run(host="0.0.0.0", port=5000, threaded=True)
