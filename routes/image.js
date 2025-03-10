// @ts-nocheck
const express = require("express");
const multer = require("multer");
const path = require("path");
const db = require("../models");
const { Op } = require("sequelize");
const { makeResponse } = require("../util");
const { isLoggedIn } = require("./middleware");

const router = express.Router();

const upload = multer({
  storage: multer.diskStorage({
    destination(req, file, done) {
      done(null, "uploads");
    },
    filename(req, file, done) {
      const ext = path.extname(file.originalname);
      done(null, `image_${Date.now()}${ext}`);
    },
  }),
  limits: { fileSize: 20 * 1024 * 1024 },
});

router.post("/", isLoggedIn, upload.single("image"), async (req, res, next) => {
  console.log(req.body);
  try {
    const result = await db.Image.create({
      fileName: req.file.filename,
      saveYsno: false,
    });
    return res.json({ id: result.id, fileName: result.fileName });
  } catch (err) {
    return res.json(
      makeResponse({
        resultCode: -1,
        resultMessage: "게시글 작성 중 오류가 발생했습니다.",
      })
    );
  }
});

router.post("/profile", isLoggedIn, upload.single("image"), async (req, res, next) => {
  try {
    //* 트랜잭션 설정
    await db.sequelize.transaction(async (t) => {
      const image = await db.Image.findOne({
        where: {
          UserId: {
            [Op.eq]: req?.user?.id
          },
          saveYsno: {
            [Op.eq]: true
          }
        },
        transaction: t // 트랜잭션 공유
      })
      const result = await db.Image.create({
        fileName: req.file.filename,
        saveYsno: true,
        UserId: req?.user?.id
      });
      if (!image) {
        await db.Image.update(
          {
            saveYsno: false,
            UserId: null,
          },
          {
            where: {
              id: {
                [Op.eq]: image?.id
              }
            },
            transaction: t // 트랜잭션 공유
          });
      }
      await db.User.update(
        {
          profileImg: result?.fileName
        },
        {
          where: {
            id: {
              [Op.eq]: req?.user?.id
            }
          },
          transaction: t // 트랜잭션 공유
        }
      )
      const user = await db.User.findOne(
        {
          attributes: { exclude: ['password'] },
          where: {
            id: {
              [Op.eq]: req?.user?.id
            }
          },
          transaction: t // 트랜잭션 공유
        }
      )
      return res.send(makeResponse({ data: user }));
    });
  } catch (err) {
    return res.json(
      makeResponse({
        resultCode: -1,
        resultMessage: "프로필 이미지 업로드 중 오류가 발생했습니다.",
      })
    );
  }
});

router.delete("/profile", isLoggedIn, async (req, res, next) => {
  try {
    //* 트랜잭션 설정
    await db.sequelize.transaction(async (t) => {
      await db.Image.update(
        {
          UserId: null,
          saveYsno: false,
        },
        {
          where: {
            UserId: {
              [Op.eq]: req?.user?.id
            },
            saveYsno: {
              [Op.eq]: true
            }
          },
          transaction: t // 트랜잭션 공유
        })
      await db.User.update(
        {
          profileImg: null,
        },
        {
          where: {
            id: {
              [Op.eq]: req?.user?.id
            }
          },
          transaction: t // 트랜잭션 공유
        }
      )
      const user = await db.User.findOne({
        where: {
          id: {
            [Op.eq]: req?.user?.id
          }
        },
        transaction: t // 트랜잭션 공유
      })
      return res.send(makeResponse({ data: user }));
    });
  } catch (err) {
    console.log(err);
    return res.json(
      makeResponse({
        resultCode: -1,
        resultMessage: "프로필 이미지 삭제 중 오류가 발생했습니다.",
      })
    );
  }
});

module.exports = router;
