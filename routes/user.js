const express = require('express');
const db = require('../models');
const { makeResponse } = require('../util');
const { Op } = require("sequelize");
const { isLoggedIn } = require('./middleware');

const router = express.Router();

router.patch('/nickname', isLoggedIn, async (req, res, next) => {
  try {
    const exist = await db.User.count({
      where: {
        nickName: {
          [Op.eq]: req?.body?.nickName
        }
      },
    })
    console.log(exist);
    if (exist > 0) {
      throw "중복된 닉네임입니다."
    }
    await db.sequelize.transaction(async (t) => {
      //* 트랜잭션 설정
      await db.User.update(
        {
          nickName: req?.body?.nickName
        },
        {
          where: {
            id: {
              [Op.eq]: req?.user?.id
            }
          },
          transaction: t // 이 쿼리를 트랜잭션 처리
        }
      );

      const user = await db.User.findOne({
        attributes: { exclude: ['password'] },
        where: {
          id: {
            [Op.eq]: req?.user?.id
          }
        },
        transaction: t // 이 쿼리를 트랜잭션 처리
      })

      res.send(makeResponse({ data: user }));
    })
  } catch (err) {
    console.log(err);
    return res.json(
      makeResponse({
        resultCode: -1,
        resultMessage: err?.message ?? "닉네임 변경 중 오류가 발생했습니다.",
      })
    );
  }
});

router.patch('/commentNoticeYsno', isLoggedIn, async (req, res, next) => {
  try {
    //* 트랜잭션 설정
    await db.sequelize.transaction(async (t) => {
      await db.User.update(
        {
          commentNoticeYsno: req?.body?.commentNoticeYsno
        },
        {
          where: {
            id: {
              [Op.eq]: req?.user?.id
            }
          },
          transaction: t // 이 쿼리를 트랜잭션 처리
        }
      );

      const user = await db.User.findOne({
        attributes: { exclude: ['password'] },
        where: {
          id: {
            [Op.eq]: req?.user?.id
          }
        },
        transaction: t // 이 쿼리를 트랜잭션 처리
      })

      res.send(makeResponse({ data: user }));
    })
  } catch (err) {
    return res.json(
      makeResponse({
        resultCode: -1,
        resultMessage: "댓글알림 사용여부 변경 중 오류가 발생했습니다.",
      })
    );
  }
});

router.patch('/newPostNoticeYsno', isLoggedIn, async (req, res, next) => {
  try {
    //* 트랜잭션 설정
    await db.sequelize.transaction(async (t) => {
      await db.User.update(
        {
          newPostNoticeYsno: req?.body?.newPostNoticeYsno
        },
        {
          where: {
            id: {
              [Op.eq]: req?.user?.id
            }
          },
          transaction: t // 이 쿼리를 트랜잭션 처리
        }
      );

      const user = await db.User.findOne({
        attributes: { exclude: ['password'] },
        where: {
          id: {
            [Op.eq]: req?.user?.id
          }
        },
        transaction: t // 이 쿼리를 트랜잭션 처리
      })

      res.send(makeResponse({ data: user }));
    })
  } catch (err) {
    return res.json(
      makeResponse({
        resultCode: -1,
        resultMessage: "새글 소식 알림 사용여부 변경 중 오류가 발생했습니다.",
      })
    );
  }
});


module.exports = router;