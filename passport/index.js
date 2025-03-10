// @ts-nocheck
const passport = require("passport");
const local = require("./local");
const db = require("../models");

module.exports = () => {
  passport.serializeUser((user, done) => {
    return done(null, user.id);
  });

  /* 모든 요청에 실행됨  */
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await db.User.findOne({ where: { id, dltYsno: 'N' } });
      return done(null, user); //req.user, req.isAuthenticated() === true
    } catch (err) {
      console.error(err);
      return done(err);
    }
  });
  local();
};
