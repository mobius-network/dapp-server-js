module.exports = (domainFn) => {
  return (req, res, next) => {
    let allowedDomain =
      req.webtaskContext.meta.NETWORK === 'public' ? domainFn(req) : '*';

    res.header("Access-Control-Allow-Origin", allowedDomain);
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  };
};
