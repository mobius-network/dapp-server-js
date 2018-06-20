const fs = require( 'fs');
const path = require( 'path');
const { promisify } = require('util');
const pug = require("pug");
const Mobius = require("@mobius-network/mobius-client-js");
const StellarSdk = require("stellar-sdk");

const axios = require( 'axios');
const dotenv = require( 'dotenv');
const inquirer = require( 'inquirer');

const appKeypair = StellarSdk.Keypair.random();

const appDomain = "flappy.mobius.network";

const writeFile = promisify(fs.writeFile);
const mobius = new Mobius.Client();

const ui = new inquirer.ui.BottomBar();

const appConfig = readConfig();
const questions = [
  {
    type: 'list',
    name: 'NETWORK',
    message: 'What network will your DApp operate on?',
    choices: [
      {
        key: 't',
        value: 'testnet',
        name: StellarSdk.Networks.TESTNET,
      },
      {
        key: 'p',
        value: 'public',
        name: StellarSdk.Networks.PUBLIC,
      }
    ],
    default: appConfig.NETWORK
  },
  {
    type: 'input',
    name: 'APP_KEY',
    message: 'What is your DApp secret key?',
    default: appConfig.APP_KEY,
    validate: ensureAccount,
  },
  {
    type: 'input',
    name: 'APP_NAME',
    message: 'What is your DApp name?',
    default: appConfig.APP_NAME,
  },
  {
    type: 'input',
    name: 'APP_DOMAIN',
    message: 'What is your DApp domain?',
    default: appConfig.APP_DOMAIN,
  },
];

inquirer.prompt(questions).then(async (answers) => {
  await writeConfig(answers);
  const userKeypair = await setupUserAccount(answers.APP_KEY);
  await writeDevPage(Object.assign({userKeypair: userKeypair}, answers));
  ui.updateBottomBar("All set! Open dev.html file to play with your server!");
});


function readConfig() {
  const envFile = path.resolve(process.cwd(), '.env');
  const secretsFile = path.resolve(process.cwd(), '.secrets');
  const config = {
    APP_KEY: StellarSdk.Keypair.random().secret(),
    APP_NAME: "Flappy Bird",
    APP_DOMAIN: "flappy.mobius.network",
    NETWORK: "testnet",
  };

  if (fs.existsSync(envFile)) {
    Object.assign(config, dotenv.parse(fs.readFileSync(envFile)));
  }

  if (fs.existsSync(secretsFile)) {
    Object.assign(config, dotenv.parse(fs.readFileSync(secretsFile)));
  }

  return config;
}

async function writeConfig(config) {
  const {APP_KEY, ...cfg} = config;
  return Promise.all([
    writeFile(".env", Object.entries(cfg).map(kv => kv.join('=')).join("\n")),
    writeFile(".secrets", `APP_KEY=${APP_KEY}`),
  ])
}

async function fundMobi(addr, amount) {
  return axios.post(
    'https://mobius.network/api/stellar/friendbot',
    { addr: addr, amount: amount }
  );
}

async function setupUserAccount(appSecret) {
  ui.updateBottomBar("Generating users's account...");

  const appKeypair = StellarSdk.Keypair.fromSecret(appSecret);
  const userKeypair = StellarSdk.Keypair.random();

  return fundMobi(userKeypair.secret(), 1000)
    .then(() => {
      Mobius.Blockchain.AddCosigner.call(userKeypair, appKeypair)
    })
    .then(() => { return userKeypair });
}

async function writeDevPage(config) {
  const dev = pug.compileFile("dev.pug", {});
  writeFile("dev.html", dev({
    appKeypair: StellarSdk.Keypair.fromSecret(config.APP_KEY),
    userKeypair: config.userKeypair,
    mobius
  }));
}

async function ensureAccount(seed, { NETWORK }) {
  let keypair, account;

  const pubnet = NETWORK === 'public';
  mobius.network = pubnet ? StellarSdk.Networks.PUBLIC : StellarSdk.Networks.TESTNET;
  try {
    keypair = StellarSdk.Keypair.fromSecret(seed);
  } catch(err) {
    return `Invalid Stellar secret: ${err}`
  }
  try {
    ui.updateBottomBar('Checking account on the network...');
    account = await Mobius.Blockchain.AccountBuilder.build(keypair);
  } catch(err) {
    if (pubnet) {
      return "Account doesn't exist!"
    }
    ui.updateBottomBar('Creating account...');
    await Mobius.Blockchain.FriendBot.call(keypair);
    account = await Mobius.Blockchain.AccountBuilder.build(keypair);
  }

  if (!account.trustlineExists()) {
    if (pubnet) {
      return "Account doesn't have MOBI trustline";
    }
    ui.updateBottomBar('Creating MOBI trustline...');
    await Mobius.Blockchain.CreateTrustline.call(keypair);
    ui.updateBottomBar('Reloading account...');
    await account.reload();
  }

  if (account.balance() < 10) {
    if (pubnet) {
      return "Account MOBI balance is < 10";
    }
    ui.updateBottomBar('Funding account with 1000 MOBI...');

    await fundMobi(keypair.publicKey(), 1000);
  }

  ui.updateBottomBar('');
  return true;
}
