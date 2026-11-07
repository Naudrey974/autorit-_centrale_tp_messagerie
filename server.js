const express = require("express");
const axios = require("axios");
const PORT = process.env.PORT || 4000;
const TIMEOUT = 15000;
const DELAI_VERIFICATION = 10000;
const MAX_ECHECS = 5;
const app = express();
const pairs = {};

function nettoyer(adresse) {
  return adresse && adresse.replace(/\/+$/, "");
}

function pairValide(body) {
  return typeof body.id === "string" && body.id !== "" && typeof body.url === "string" && body.url !== "";
}

function listeEnLigne() {
  return Object.values(pairs)
    .filter((pair) => pair.statut === "en ligne")
    .map((pair) => ({ id: pair.id, url: pair.url }));
}

function prevenirLesAutres(id, envoi) {
  Object.values(pairs).forEach((pair) => {
    if (pair.id === id || pair.statut !== "en ligne") return;
    envoi(pair.url).catch((error) => {
      console.log("Impossible de prévenir " + pair.id + " : " + error.message);
    });
  });
}

function annoncerArrivee(id) {
  const { url } = pairs[id];
  prevenirLesAutres(id, (urlPair) => axios.post(urlPair + "/register", { id: id, url: url }, { timeout: TIMEOUT }));
}

function annoncerDepart(id) {
  prevenirLesAutres(id, (urlPair) => axios.delete(urlPair + "/unregister/" + encodeURIComponent(id), { timeout: TIMEOUT }));
}

async function verifierPair(id) {
  const url = pairs[id].url;

  try {
    await axios.get(url + "/health", { timeout: TIMEOUT });
    if (!pairs[id] || pairs[id].url !== url) return;

    pairs[id].echecs = 0;
    if (pairs[id].statut === "hors ligne") {
      pairs[id].statut = "en ligne";
      console.log("De retour en ligne : " + id);
      annoncerArrivee(id);
    }
  } catch (error) {
    if (!pairs[id] || pairs[id].url !== url || pairs[id].statut === "hors ligne") return;

    pairs[id].echecs = pairs[id].echecs + 1;
    console.log("Pas de réponse de " + id + " (" + pairs[id].echecs + "/" + MAX_ECHECS + ")");
    if (pairs[id].echecs >= MAX_ECHECS) {
      pairs[id].statut = "hors ligne";
      console.log("Hors ligne : " + id);
      annoncerDepart(id);
    }
  }
}

app.post("/register", express.json(), (req, res) => {
  if (!pairValide(req.body)) return res.sendStatus(400);

  const id = req.body.id;
  const url = nettoyer(req.body.url);
  const dejaConnu = Boolean(pairs[id]);
  const changement = !dejaConnu || pairs[id].url !== url || pairs[id].statut !== "en ligne";

  pairs[id] = { id: id, url: url, statut: "en ligne", echecs: 0 };

  if (changement) {
    console.log((dejaConnu ? "Mise à jour : " : "Nouveau pair : ") + id + " (" + url + ")");
    annoncerArrivee(id);
  }

  res.status(dejaConnu ? 200 : 201).json(listeEnLigne());
});

app.delete("/unregister/:id", (req, res) => {
  const id = req.params.id;
  if (!pairs[id]) return res.sendStatus(404);

  console.log("Pair désinscrit : " + id);
  annoncerDepart(id);
  delete pairs[id];
  res.sendStatus(204);
});

app.get("/pairs", (req, res) => {
  res.json(Object.values(pairs).map((pair) => ({ id: pair.id, url: pair.url, statut: pair.statut })));
});

app.use((err, req, res, next) => {
  console.log("Erreur serveur : " + err.message);
  res.sendStatus(err.status || 500);
});

setInterval(() => {
  Object.keys(pairs).forEach(verifierPair);
}, DELAI_VERIFICATION);

app.listen(PORT, () => {
  console.log("Autorité démarrée sur le port " + PORT);
});
