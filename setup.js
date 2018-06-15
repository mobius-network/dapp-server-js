const fs = require("fs");
const pug = require("pug");
const Mobius = require("@mobius-network/mobius-client-js");
const StellarSdk = require("stellar-sdk");

// Compile template.pug, and render a set of data
const dev = pug.compileFile("dev.pug");

const appKeypair = StellarSdk.Keypair.random();
const appDomain = "flappy.mobius.network";

const mobius = new Mobius.Client();
mobius.network = StellarSdk.Networks.TESTNET;

fs.writeFileSync(".env", `APP_DOMAIN=${appDomain}\nNETWORK=test\n`);
fs.writeFileSync(".secrets", `APP_KEY=${appKeypair.secret()}`);
fs.writeFileSync("dev.html", dev( {
  APP_KEY: appKeypair.secret(),
  APP_DOMAIN: appDomain,
  mobius
} ));
