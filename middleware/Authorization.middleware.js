const Authorization = (roles) => {
  return (req, res, next) => {
    if (roles.includes(req.headers.role)) {
      next();
    } else {
      return res.status(401).send({
        msg: "Un-Authorized, You are not authorized to access this route.",
      });
    }
  };
};

module.exports = Authorization;
