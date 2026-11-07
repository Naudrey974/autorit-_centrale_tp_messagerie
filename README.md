# Autorité centrale – TP Messagerie

Serveur qui enregistre les adresses des pairs et les distribue à ceux qui veulent se connecter.

Chaque membre du groupe a sa propre autorité, il n'y a donc pas de protocole commun pour ces routes.
L'autorité ne transmet aucun message : une fois l'adresse obtenue, les pairs font la poignée de main directement entre eux.

## Lancer

```bash
npm install
npm start
```

Le port par défaut est **4000**. Pour en changer :

```bash
PORT=5000 npm start
```

## Routes

| Méthode | Route | Rôle | Réponses |
|---|---|---|---|
| `POST` | `/registre` | Enregistre un pair ou met à jour ses informations | `201` nouveau pair, `204` mis à jour, `400` pas d'`id` ou d'`url` |
| `GET` | `/pairs` | Renvoie la liste des pairs enregistrés | `200` |

Corps de `POST /registre` (`id` et `url` obligatoires, avec `Content-Type: application/json`) :

```json
{ "id": "Audrey", "url": "https://...", "publicKey": "base64..." }
```

Réponse de `GET /pairs` :

```json
[
  { "id": "Audrey", "url": "https://...", "publicKey": "base64..." }
]
```

L'`id` est le prénom : c'est la clé de l'annuaire. Si un pair s'annonce avec un prénom déjà connu, sa nouvelle URL remplace l'ancienne.
Le `/` final de l'URL est retiré. La liste est gardée en mémoire : elle est perdue si on redémarre l'autorité.

## Limites connues

- L'autorité ne vérifie pas les identités : n'importe qui peut s'annoncer sous un prénom et remplacer son URL.
- Deux personnes avec le même prénom ne sont pas gérées : la dernière annonce remplace la précédente.
- L'autorité n'enregistre pas les connexions et ne relaie pas les messages. Chaque serveur enregistre ses connexions, et le relais revient au broker.

## Retrait des pairs

Toutes les 10 s, l'autorité envoie `GET /health` à chaque pair enregistré, sans en-tête `Origin`.
Après 5 échecs d'affilée, le pair est retiré de la liste. Une seule réponse remet le compteur à zéro.

## Tester

```bash
curl -X POST http://localhost:4000/registre \
  -H "Content-Type: application/json" \
  -d '{"id":"Audrey","url":"http://localhost:3000","publicKey":""}'

curl http://localhost:4000/pairs
```
