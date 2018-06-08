const express = require('express');
const jwt = require('jsonwebtoken');

const Mobius = require("@mobius-network/mobius-client-js");

const authApp = express();
module.exports = authApp;

authApp.use(express.json());
authApp.use(express.urlencoded({ extended: true }));

authApp.get("/", (req, res) => {
  const { APP_KEY } = req.webtaskContext.secrets;
  res.send(Mobius.Auth.Challenge.call(APP_KEY))
});

authApp.post("/", (req, res) => {
  const { APP_KEY, APP_DOMAIN } = req.webtaskContext.secrets;

  try {
    const token = new Mobius.Auth.Token(
      APP_KEY,
      req.query.xdr,
      req.query.public_key
    );
    token.validate();

    const payload = {
      sub: token._address,
      jti: token.hash("hex").toString(),
      iss: 'https://' + APP_DOMAIN + '/',
      iat: parseInt(token.timeBounds.minTime, 10),
      exp: parseInt(token.timeBounds.maxTime, 10),
    };

    res.send(jwt.sign(payload, APP_KEY));
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});


