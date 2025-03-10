// @ts-nocheck
const express = require("express");
const passport = require("passport");
const db = require("../models");
const bcrypt = require("bcrypt");
const { isLoggedIn, isNotLoggedIn } = require("./middleware");
const router = express.Router();
const { makeResponse } = require("../util");
const { mailSend } = require("../util/mailSend");


router.post("/signup", isNotLoggedIn, async (req, res, next) => {
  try {
    const hash = await bcrypt.hash(req.body.password, 12);
    await db.sequelize.transaction(async (t) => {
      const exUser = await db.User.findOne({
        where: {
          email: req.body.email,
        },
        transaction: t, // 이 쿼리를 트랜잭션 처리
      });
      if (exUser) {
        // 이미 회원가입 되어있으면
        return res.json(
          makeResponse({
            resultCode: -1,
            resultMessage: "이미 가입된 회원입니다.",
          })
        );
      }
      const exNickName = await db.User.findOne({
        where: {
          nickName: req.body.nickName,
        },
        transaction: t, // 이 쿼리를 트랜잭션 처리
      });
      if (exNickName) {
        // 이미 회원가입 되어있으면
        return res.json(
          makeResponse({
            resultCode: -1,
            resultMessage: "중복된 별명입니다.",
          })
        );
      }
      await db.User.create(
        {
          email: req.body.email,
          password: hash,
          userType: "user",
          nickName: req.body.nickName,
          introduce: req.body.introduce,
          profileImg: "",
          commentNoticeYsno: "N",
          newPostNoticeYsno: "N",
          dltYsno: "N",
        },
        {
          transaction: t, // 이 쿼리를 트랜잭션 처리
        }
      );

      await db.Email.destroy({
        where: {
          address: req.body.email,
        },
        transaction: t, // 이 쿼리를 트랜잭션 처리
      });

      return res.send(
        makeResponse({
          data: "OK",
        })
      );
    });
  } catch (err) {
    console.error(err?.message);
    next("null");
  }
});

router.get("/email", isNotLoggedIn, async (req, res, next) => {
  try {
    if (!req?.query?.id) {
      return res.json(
        makeResponse({
          resultCode: -1,
          data: "NOTFIND",
          resultMessage: "필수값이 누락되었습니다.",
        })
      );
    }

    const email = await db.Email.findOne({
      attributes: ["address"],
      where: {
        id: req?.query?.id,
      },
    });

    res.send(makeResponse({ data: email ?? "NOTFIND" }));
  } catch (err) {
    return res.json(
      makeResponse({
        resultCode: -1,
        resultMessage: "오류가 발생했습니다.",
      })
    );
  }
});

router.post("/email", isNotLoggedIn, async (req, res, next) => {
  try {
    if (!req?.body?.email) {
      return res.json(
        makeResponse({
          resultCode: -1,
          resultMessage: "필수값이 누락되었습니다.",
        })
      );
    }

    const id = randomString();

    const newEmail = await db.Email.create({
      id: id,
      address: req.body.email,
    });

    const href = `${process.env.FO_URL}/blog/register/${id}`;

    const template = `
          <div>
            <div style="max-width: 100%; width: 400px; margin: 0 auto; padding: 1rem; text-align: justify; background: #f8f9fa; border: 1px solid #dee2e6; box-sizing: border-box; border-radius: 4px; color: #868e96; margin-top: 0.5rem; box-sizing: border-box;" id="ext-gen1043"><b style="black">안녕하세요!</b> 회원가입을 계속하시려면 하단의 링크를 클릭하세요. 만약에 실수로 요청하셨거나, 본인이 요청하지 않았다면, 이 메일을 무시하세요.</div>
            <a href="${href}" style="width: 400px; text-decoration: none; text-align:center; display:block; margin: 0 auto; margin-top: 1rem; background: #845ef7; padding-top: 1rem; color: white; font-size: 1.25rem; padding-bottom: 1rem; font-weight: 600; border-radius: 4px;" target="_blank">계속하기</a>
            <div style="text-align: center; margin-top: 1rem; color: #868e96; font-size: 0.85rem;">
            <div>위 버튼을 클릭하시거나, 다음 링크를 열으세요:<br>
              <a style="color: #b197fc;" href="${href}" target="_blank">${href}</a></div>
              <br>
              <div>이 링크는 24시간동안 유효합니다.</div>
            </div>
          </div>
        `;

    const subject = "ColdBrewCode 회원가입";

    try {
      await mailSend({ receiverEmails: req.body.email, subject, template });
    } catch (err) {
      return res.send(
        makeResponse({
          resultCode: -1,
          resultMessage: "메일 전송 중 오류가 발생했습니다.",
        })
      );
    }
    return res.send(makeResponse({ data: newEmail }));
  } catch (err) {
    console.error(err);
    next(err);
  }
});

router.post("/login", isNotLoggedIn, (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) {
      console.error(err);
      return next(err);
    }
    if (info) {
      return res.json(
        makeResponse({ resultCode: -1, resultMessage: info.message })
      );
    }
    return req.login(user, async (err) => {
      //세선에다 사용자 정보 저장
      if (err) {
        console.error(err);
        return next(err);
      }
      return res.send(
        makeResponse({
          data: {
            id: user.id,
            email: user.email,
            nickName: user.nickName,
            introduce: user.introduce,
            userType: user.userType,
            profileImg: user.profileImg,
            commentNoticeYsno: user.commentNoticeYsno,
            newPostNoticeYsno: user.newPostNoticeYsno,
          },
        })
      );
    });
  })(req, res, next);
});

router.get("/logout", isLoggedIn, (req, res) => {
  if (req.isAuthenticated()) {
    req.logout((done) => {
      if (done) {
        return res.status(500).send(
          makeResponse({
            resultCode: -1,
            resultMessage: "로그아웃이 실패하였습니다.",
          })
        );
      } else {
        req.session.destroy(null); // 선택사항
        return res.send(
          makeResponse({ resultMessage: "로그아웃 되었습니다." })
        );
      }
    });
  }
});

router.patch("/signout", isLoggedIn, async (req, res) => {
  if (req.isAuthenticated()) {
    try {
      // 트랜잭션 설정
      await db.sequelize.transaction(async (t) => {
        const user = await db.User.findOne({
          attributes: ['email'],
          where: {
            id: req?.user?.id
          },
          transaction: t // 트랜잭션 적용
        })
        // 프로필 이미지를 삭제가능하게 변경한다.
        await db.Image.update(
          {
            UserId: null,
            saveYsno: 'N'
          },
          {
            where: {
              UserId: req?.user?.id
            },
            transaction: t // 트랜잭션 적용
          }
        )
        // 유저 정보를 삭제처리한다.
        await db.User.update(
          {
            email: req?.user?.id,
            password: user?.email,
            profileImg: null,
            dltYsno: 'Y'
          },
          {
            where: {
              id: req?.user?.id
            },
            transaction: t // 트랜잭션 적용
          }
        )
      })
    } catch (err) {
      return res.json(
        makeResponse({
          resultCode: -1,
          resultMessage: "회원탈퇴 중 오류가 발생했습니다.",
        })
      );
    }
    req.logout((done) => {
      if (done) {
        return res.status(500).send(
          makeResponse({
            resultCode: -1,
            resultMessage: "회원탈퇴 중 오류가 발생했습니다.",
          })
        );
      } else {
        req.session.destroy(null); // 선택사항
        return res.send(
          makeResponse({ data: "OK", resultMessage: "회원탈퇴 되었습니다." })
        );
      }
    });
  }
});

router.get("/user", async (req, res, next) => {
  try {
    const user = await db.User.findOne({
      where: { id: req?.user?.id ?? null },
      attributes: [
        "id",
        "email",
        "nickName",
        "userType",
        "profileImg",
        "commentNoticeYsno",
        "newPostNoticeYsno",
      ],
    });
    return res.json(makeResponse({ data: user ?? "NOTFIND" }));
  } catch (err) {
    return res.json(
      makeResponse({
        resultCode: -1,
        resultMessage: "오류가 발생했습니다.",
      })
    );
  }
});

function randomString() {
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";
  const stringLength = 12;
  let randomstring = "";
  for (let i = 0; i < stringLength; i++) {
    const rnum = Math.floor(Math.random() * chars.length);
    randomstring += chars.substring(rnum, rnum + 1);
  }
  return randomstring;
}

module.exports = router;
