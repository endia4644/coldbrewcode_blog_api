// @ts-nocheck
const express = require('express');
const db = require('../models');
const { literal, fn, col, Op, QueryTypes } = require("sequelize");
const { makeResponse } = require('../util');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const totalCount = await db.Post.count({
      where: {
        dltYsno: {
          [Op.eq]: 'N'
        }
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
        where: {
          dltYsno: {
            [Op.eq]: 'N'
          }
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