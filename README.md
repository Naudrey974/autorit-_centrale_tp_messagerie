# Autorité centrale (broker / tracker) – TP Messagerie

Serveur qui sert d'annuaire, comme un DNS : il retient les `id = url` des pairs et les distribue.
Il ne transmet aucun message et n'enregistre pas les connexions.

## Lancer

```bash
npm install
npm start
```

Le port par défaut est **4000**. Pour en changer : `PORT=5000 npm start`.

## Routes

| Méthode | Route | Rôle | Réponses |
|---|---|---|---|
| `POST` | `/register` | Inscrit un pair, ou met à jour son adresse | `201` nouveau pair, `200` déjà connu, `400` si `id` ou `url` manque |
| `DELETE` | `/unregister/{id}` | Retire un pair | `204` retiré, `404` inconnu |
| `GET` | `/pairs` | Outil : affiche les pairs avec leur présence (`en ligne` / `hors ligne`) | `200` |

Corps de `POST /register` (avec `Content-Type: application/json`) :

```json
{ "id": "Audrey", "url": "https://..." }
```

Réponse de `POST /register` : la liste des pairs en ligne.

```json
[
  { "id": "Audrey", "url": "https://..." },
  { "id": "Laurie", "url": "https://..." }
]
```

## Diffusion aux autres pairs

- Nouveau pair ou changement d'adresse : le broker envoie `POST /register` `{ id, url }` à tous les autres.
- Pair retiré : les autres reçoivent `DELETE /unregister/{id}`.

## Présence

- Toutes les 10 s, le broker ping chaque pair avec `GET /health` (sans `Origin`).
- 5 échecs de suite → le pair passe `hors ligne` et les autres reçoivent `DELETE /unregister/{id}`.
- S'il répond à nouveau ou refait un `/register`, il repasse `en ligne` et les autres reçoivent `/register`.
- Un pair peut aussi se retirer lui-même avec `DELETE /unregister/{id}`.

## Limites connues

- Aucune vérification d'identité : on peut s'inscrire sous n'importe quel prénom, ou désinscrire quelqu'un d'autre.
- Deux pairs avec le même prénom : le dernier inscrit écrase l'autre.
- Tout est en mémoire, donc un redémarrage du broker vide la liste.

## Tester

```bash
curl -X POST http://localhost:4000/register \
  -H "Content-Type: application/json" \
  -d '{"id":"Audrey","url":"http://localhost:3000"}'

curl http://localhost:4000/pairs

curl -X DELETE http://localhost:4000/unregister/Audrey
```
