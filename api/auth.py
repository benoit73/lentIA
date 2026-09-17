"""Vérification des ID tokens Google Sign-In (OpenID Connect) : protège les
routes REST (décorateur `require_auth`) et les routes WebSocket (fonction
`verify_token` appelée directement, un WebSocket ne portant pas de header
Authorization lors du handshake côté navigateur)."""

from functools import wraps

from flask import g, jsonify, request
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

from config import ALLOWED_EMAILS, GOOGLE_CLIENT_ID

_google_request = google_requests.Request()


def verify_token(token):
    """Vérifie un ID token Google : signature, audience (GOOGLE_CLIENT_ID),
    email vérifié, et présence dans ALLOWED_EMAILS si cette liste n'est pas
    vide. Retourne les claims du token si valide, sinon None."""
    if not token:
        return None

    try:
        claims = id_token.verify_oauth2_token(token, _google_request, GOOGLE_CLIENT_ID)
    except ValueError:
        return None

    if not claims.get("email_verified"):
        return None

    email = claims.get("email", "").lower()
    if ALLOWED_EMAILS and email not in ALLOWED_EMAILS:
        return None

    return claims


def require_auth(view):
    """Décorateur pour les routes REST : exige un header
    `Authorization: Bearer <id_token>` valide, place les claims dans
    `flask.g.user`."""

    @wraps(view)
    def wrapped(*args, **kwargs):
        header = request.headers.get("Authorization", "")
        token = header[len("Bearer "):] if header.startswith("Bearer ") else None
        claims = verify_token(token)
        if claims is None:
            return jsonify({"error": "authentification requise"}), 401
        g.user = claims
        return view(*args, **kwargs)

    return wrapped
