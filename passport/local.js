const passport = require("passport");
const { Strategy: LocalStrategy } = require("passport-local");
const db = require("../models");
const bcrypt = require("bcrypt");

module.exports = () => {
  passport.use(
    new LocalStrategy(
      {
        usernameField: "email", //req.body.email
        passwordField: "password", //req.body.password
      },
      async (email, password, done) => {
        try {
          const exUser = await db.User.findOne({ where: { email: email, dltYsno: 'N' } });
          if (!exUser) {
            return done(null, false, {
              message: "아이디나 비밀번호를 다시 확인해주세요.",
            });
          }
          const result = await bcrypt.compare(password, exUser.password);
          if (result) {
            return done(null, exUser);
          } else {
            return done(null, false, { message: "아이디나 비밀번호를 다시 확인해주세요." });
          }
        } catch (err) {
          console.error(err);
          return done(err);
        }
      }
    )
  );
};
