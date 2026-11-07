const express = require("express");
const axios = require("axios");

const PORT = process.env.PORT || 4000;

const TIMEOUT = 15000;
const DELAI_VERIFICATION = 10000;
const MAX_ECHECS = 5;

const app = express();

const pairs = {};

function nettoyer(adresse) {
  return adresse.replace(/\/+$/, "");
}

function pairValide(body) {
  return typeof body.id === "string" && body.id !== "" && typeof body.url === "string" && body.url !== "";
}

async function verifierPair(id) {
  const url = pairs[id].url;

  try {
    await axios.get(url + "/health", { timeout: TIMEOUT });
    if (pairs[id] && pairs[id].url === url) pairs[id].echecs = 0;
  } catch (error) {
    if (!pairs[id] || pairs[id].url !== url) return;

    pairs[id].echecs = pairs[id].echecs + 1;
    console.log("Pas de réponse de " + id + " (" + pairs[id].echecs + "/" + MAX_ECHECS + ")");
    if (pairs[id].echecs >= MAX_ECHECS) {
      console.log("Pair retiré : " + id);
      delete pairs[id];
    }
  }
}

app.post("/registre", express.json(), (req, res) => {
  if (!pairValide(req.body)) return res.sendStatus(400);

  const id = req.body.id;
  const url = nettoyer(req.body.url);
  const dejaConnu = Boolean(pairs[id]);

  pairs[id] = { id: id, url: url, publicKey: req.body.publicKey || "", echecs: 0 };
  console.log((dejaConnu ? "Pair mis à jour : " : "Nouveau pair : ") + id + " (" + url + ")");
  res.sendStatus(dejaConnu ? 204 : 201);
});

app.get("/pairs", (req, res) => {
  res.json(Object.values(pairs).map((pair) => ({ id: pair.id, url: pair.url, publicKey: pair.publicKey })));
});

setInterval(() => {
  Object.keys(pairs).forEach(verifierPair);
}, DELAI_VERIFICATION);

app.listen(PORT, () => {
  console.log("Autorité démarrée sur le port " + PORT);
});
