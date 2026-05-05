// @ts-nocheck
const express = require('express');
const db = require('../models');
const { literal, fn, col, Op, QueryTypes } = require("sequelize");
const { makeResponse } = require('../util');
const {isEmpty} = require("../util/common");

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const nickname = req.query.nickname;
    const permission = {};
    let userWhere = null;

    if(isEmpty(nickname)) {
      permission[Op.eq] = "public";
    } else {
      /* 비공개 포스트 필터링 */
      if (req?.user?.nickName === nickname) {
        permission[Op.not] = null;
      } else {
        permission[Op.eq] = "public";
      }
      // nickname 존재 여부에 따른 조건부 where 객체 생성
      userWhere = nickname ? { nickName: { [Op.eq]: nickname } } : null;
    }

    console.log(nickname)

    const totalCount = await db.Post.count({
      include: [
        {
          model: db.User,
          where: userWhere,
          required: !!nickname,
        },
      ],
      where: {
        dltYsno: {
          [Op.eq]: 'N'
        },
        permission: permission,
      }
    });
    const hashtagAll = await db.sequelize.query(
      'SELECT "ALL" as "id", "전체보기" as "hashtagName", :totalCount as "postCount" FROM dual',
      {
        replacements: { totalCount: totalCount },
        type: QueryTypes.SELECT
      }
    );
    const hashtags = await db.Hashtag.findAll({
      attributes: ['id', 'hashtagName', [fn('COUNT', col('Posts->PostHashtag.PostId')), 'postCount']],
      include: {
        model: db.Post,
        require: true,
        attributes: [],
        through: {
          attributes: []
        },
        include: {
          model: db.User,
          where: userWhere,
          required: !!nickname,
          attributes: ["id", "email", "nickName", "profileImg"],
        },
        where: {
          dltYsno: {
            [Op.eq]: 'N'
          },
          permission: permission,
        }
      },
      order: [
        ['createdAt', 'DESC'],
      ],
      group: ['id', 'hashtagName'],
      having: literal('count(`Posts->PostHashtag`.`PostId`) > 0')
    })

    res.send(makeResponse({ data: [...hashtagAll, ...hashtags], totalCount: totalCount }));
  } catch (err) {
    console.error(err);
    next(err);
  }
});


module.exports = router;