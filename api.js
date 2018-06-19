const express = require('express');
const expressJwt = require('express-jwt');

// const StellarSdk = require("stellar-sdk");
const Mobius = require("@mobius-network/mobius-client-js");

const apiApp = express();
module.exports = apiApp;

apiApp.use(express.json());
apiApp.use(express.urlencoded({ extended: true }));

apiApp.use((req, res, next) => {
  const { APP_KEY } = req.webtaskContext.secrets;
  const { APP_DOMAIN } = req.webtaskContext.meta;

  expressJwt({
    secret: APP_KEY,
    issuer: `https://${APP_DOMAIN}/`,
    algorithms: ['HS256'],
    getToken
  })(req, res, next);
});

apiApp.get("/test", (req, res) => {
  console.log("User: ", req.user.sub);
  res.json({ user: req.user });
});

apiApp.get("/balance", async (req, res, next) => {
  try {
    const { APP_KEY } = req.webtaskContext.secrets;
    const dapp = await Mobius.AppBuilder.build(APP_KEY, req.user.sub);

    res.json({balance: dapp.userBalance});
  } catch (e) {
    next(e);
  }
});

apiApp.get("/charge", async (req, res, next) => {
  try {
    const { APP_KEY } = req.webtaskContext.secrets;
    const dapp = await Mobius.AppBuilder.build(APP_KEY, req.user.sub);

    const amount = req.query.amount

    if (amount === null || isNaN(amount)) {
      return res.status(400).json({
        error: "Invalid amount"
      })
    }

    const response = await dapp.pay(req.query.amount, req.query.target_address)
    res.json({
      status: "ok",
      tx_hash: response.hash,
      balance: dapp.userBalance
    });
  } catch (e) {
    next(e);
  }
});

apiApp.use(logErrors);
apiApp.use(errorHandler);

function getToken(req) {
  if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
    return req.headers.authorization.split(' ')[1];
  } else if (req.query && req.query.token) {
    return req.query.token;
  }
  return null;
}

function logErrors(err, req, res, next) {
  console.error(err);
  next(err);
}

function errorHandler(err, req, res, next) {
  res.status(500);
  res.json({ error: "Internal server error" });
}
