const fromExpress = require('webtask-tools').fromExpress;
const express = require('express');

const StellarSdk = require("stellar-sdk");
const Mobius = require("@mobius-network/mobius-client-js");

const mobius = new Mobius.Client();

const app = express();
app.enable('strict routing');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set Stellar network to use, based on webtask meta
app.use((req, res, next) => {
  network = req.webtaskContext.meta.NETWORK;
  mobius.network =
    network === 'public' ? StellarSdk.Networks.PUBLIC : StellarSdk.Networks.TESTNET;
  next();
});

app.use("/api", require("./api"));
app.use("/auth", require("./auth"));

module.exports = fromExpress(app);
