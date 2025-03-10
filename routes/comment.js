// @ts-nocheck
const express = require("express");
const { isLoggedIn } = require("./middleware");
const db = require("../models");
const sequelize = require("sequelize");
const { makeResponse } = require("../util");
const router = express.Router();
const { Op } = require("sequelize");

router.post("/", isLoggedIn, async (req, res, next) => {
  try {
    await db.sequelize.transaction(async (t) => {
      await db.Comment.create(
        {
          commentContent: req.body.commentContent,
          commentDepth: req.body.commentDepth,
          dltYsno: "N",
          UserId: req.user.id,
          PostId: req.body.postId,
          ParentId: req.body.parentId,
        },
        {
          transaction: t,
        }
      );
      let comments = await getComment({ parentId: req.body.parentId, postId: req.body.postId, t });
      return res.send(makeResponse({ data: comments }));
    });
  } catch (err) {
    console.error(err);
    next("댓글 등록 중 오류가 발생했습니다");
  }
});

router.get("/", async (req, res, next) => {
  try {
    const comments = await db.Comment.findAll({
      where: {
        PostId: {
          [Op.eq]: req.query.postId,
        },
        commentDepth: {
          [Op.eq]: 0, // 게시글에서는 1단계 댓글만 조회한다.
        },
      },
      attributes: [
        "id",
        "commentContent",
        "commentDepth",
        [
          sequelize.literal(
            `(SELECT COUNT("ParentId") FROM Comments WHERE Comments.id = Comments.ParentId})`
          ),
          "childCount",
        ],
        "createdAt",
        "updatedAt",
        "dltYsno",
      ],
      include: [
        {
          model: db.User,
          attributes: ["id", "email", "nickName", "profileImg"],
        },
      ],
    });
    res.send(makeResponse({ data: comments }));
  } catch (err) {
    console.error(err);
    next("댓글 조회 중 오류가 발생했습니다");
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    await db.sequelize.transaction(async (t) => {
      let comments = await getComment({ parentId: req.params.id, postId: req.query.postId, t });;
      res.send(makeResponse({ data: comments }));
    });
  } catch (err) {
    console.error(err);
    next("댓글 조회 중 오류가 발생했습니다");
  }
});

router.patch("/:id", isLoggedIn, async (req, res, next) => {
  try {
    await db.sequelize.transaction(async (t) => {
      await db.Comment.update(
        { commentContent: req.body.commentContent },
        {
          where: {
            id: {
              [Op.eq]: req.params.id,
            },
            UserId: {
              [Op.eq]: req.user.id,
            },
          },
          transaction: t,
        }
      );
      const comments = await getComment({ parentId: req.body.parentId, postId: req.body.postId, t });
      res.send(makeResponse({ data: comments }));
    })
  } catch (err) {
    console.error(err);
    next("댓글 수정 중 오류가 발생했습니다");
  }
});

router.delete("/:id", isLoggedIn, async (req, res, next) => {
  try {
    await db.sequelize.transaction(async (t) => {
      await db.Comment.update(
        { dltYsno: "Y" },
        {
          where: {
            id: req.params.id,
          },
          transaction: t,
        }
      );
      const comments = await getComment({ parentId: req.query.parentId, postId: req.query.postId, t });
      res.send(makeResponse({ data: comments }));
    })
  } catch (err) {
    console.error(err);
    next("댓글 삭제 중 오류가 발생했습니다");
  }
});

async function getComment({ parentId, postId, t }) {
  let comments = null;
  if (!parentId || Number(parentId) === 0) {
    comments = await db.Comment.findAll({
      where: {
        PostId: {
          [Op.eq]: postId,
        },
        commentDepth: {
          [Op.eq]: 0, // 게시글에서는 1단계 댓글만 조회한다.
        },
      },
      attributes: [
        "id",
        "commentContent",
        "commentDepth",
        "createdAt",
        "updatedAt",
        "dltYsno",
        [
          sequelize.literal(
            `(SELECT COUNT(1) FROM Comments WHERE ParentId = Comment.id AND dltYsno = 'N')`
          ),
          "childCount",
        ],
      ],
      include: [
        {
          model: db.User,
          attributes: ["id", "email", "nickName", "profileImg"],
        },
        {
          /* 대댓글을 조회한다. */
          model: db.Comment,
          as: "childComment",
          required: false,
          /* 
          서브쿼리로 조회된 댓글의 대댓글 갯수를 조회한다. 
          1단계 댓글인 경우 2단계 댓글의 수만 조회한다. ( 3단계 수는 가져오지 않는다. )
        */
          attributes: [
            "id",
            "dltYsno",
            [
              sequelize.literal(
                `(SELECT COUNT(1) FROM Comments WHERE ParentId = childComment.id AND dltYsno = 'N')`
              ),
              "childCount",
            ],
          ],
          order: [["id", "DESC"]],
        },
      ],
      transaction: t,
    });
  } else {
    comments = await db.Comment.findOne({
      where: {
        id: parentId,
      },
      attributes: [
        "id",
        "commentContent",
        "commentDepth",
        "createdAt",
        "updatedAt",
        "dltYsno",
        [
          sequelize.literal(
            `(SELECT COUNT(1) FROM Comments WHERE ParentId = Comment.id AND dltYsno = 'N')`
          ),
          "childCount",
        ],
      ],
      include: [
        {
          model: db.User,
          attributes: ["id", "email", "nickName", "profileImg"],
        },
        {
          /* 대댓글을 조회한다. */
          model: db.Comment,
          as: "childComment",
          required: false,
          /* 
          서브쿼리로 조회된 댓글의 대댓글 갯수를 조회한다. 
          1단계 댓글인 경우 2단계 댓글의 수만 조회한다. ( 3단계 수는 가져오지 않는다. )
        */
          attributes: [
            "id",
            "commentContent",
            "commentDepth",
            "createdAt",
            "updatedAt",
            "dltYsno",
            [
              sequelize.literal(
                `(SELECT COUNT(1) FROM Comments WHERE ParentId = childComment.id AND dltYsno = 'N')`
              ),
              "childCount",
            ],
          ],
          include: [
            {
              model: db.User,
              attributes: ["id", "email", "nickName", "profileImg"],
            },
          ],
          order: [["id", "DESC"]],
        },
      ],
      transaction: t,
    });
  }

  return comments;
}

module.exports = router;