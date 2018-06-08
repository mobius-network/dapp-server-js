const express = require('express');
const expressJwt = require('express-jwt');

// const StellarSdk = require("stellar-sdk");
// const Mobius = require("@mobius-network/mobius-client-js");

const apiApp = express();
module.exports = apiApp;

apiApp.use(express.json());
apiApp.use(express.urlencoded({ extended: true }));

apiApp.use((req, res, next) => {
  const { APP_KEY, APP_DOMAIN } = req.webtaskContext.secrets;

  expressJwt({
    secret: APP_KEY,
    issuer: `https://${APP_DOMAIN}/`,
    algorithms: ['HS256'],
    getToken
  })(req, res, next);
});

apiApp.get("/test", (req, res) => {
  console.log("User: ", req.user.sub);
  res.json({ user: req.user })
});

function getToken(req) {
  if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
    return req.headers.authorization.split(' ')[1];
  } else if (req.query && req.query.token) {
    return req.query.token;
  }
  return null;
}
