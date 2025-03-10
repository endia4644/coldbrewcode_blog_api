// @ts-nocheck
const express = require("express");
const { isLoggedIn } = require("./middleware");
const db = require("../models");
const { Op, literal, fn, col } = require("sequelize");
const { makeResponse } = require("../util");

const router = express.Router();

router.post("/", isLoggedIn, async (req, res, next) => {
  try {
    //* 트랜잭션 설정
    await db.sequelize.transaction(async (t) => {
      let series = null;
      if (req.body.seriesName) {
        series = await findSeriesIdBySeriesName(req.body.seriesName, t);
      }
      const newPost = await db.Post.create(
        {
          postName: req.body.postName,
          postContent: req.body.postContent,
          postDescription: req.body.postDescription,
          postThumbnail: req.body.postThumbnail,
          likeCnt: 0,
          permission: req.body.permission,
          dltYsno: "N",
          UserId: req.user.id,
        },
        {
          transaction: t, // 이 쿼리를 트랜잭션 처리
        }
      );
      if (series?.id) {
        await createSeriesPost(series.id, newPost.id, t);
      }
      if (req.body.hashtags) {
        /* 해시태그 테이블 INSERT  */
        const hashtags = await Promise.all(
          req.body.hashtags.map((tag) =>
            db.Hashtag.findOrCreate({
              where: { hashtagName: tag },
              transaction: t, // 이 쿼리를 트랜잭션 처리
            })
          )
        );
        /* 매핑 테이블 INSERT  */
        await Promise.all(
          hashtags.map((r) =>
            db.PostHashtag.create(
              {
                PostId: newPost?.id,
                HashtagId: r[0]?.dataValues?.id,
              },
              {
                transaction: t, // 이 쿼리를 트랜잭션 처리
              }
            )
          )
        );
      }
      /* 사용한 이미지의 저장여부를 변경해준다. */
      if (req.body.imageIds.length > 0) {
        await db.Image.update(
          {
            saveYsno: true,
            PostId: newPost?.id ?? null,
            TempPostId: null,
          },
          {
            where: {
              id: {
                [Op.in]: req.body.imageIds,
              },
            },
            transaction: t, // 이 쿼리를 트랜잭션 처리
          }
        );
      }
      /* 임시 저장을 마저 작성한 경우 기존 임시 포스트는 삭제한다. */
      if (req?.body?.tempId) {
        await db.TempPost.destroy({
          where: {
            id: {
              [Op.eq]: req?.body?.tempId,
            },
          },
          transaction: t, // 이 쿼리를 트랜잭션 처리
        });
        await db.TempPostHashtag.destroy({
          where: {
            TempPostId: {
              [Op.eq]: req?.body?.tempId,
            },
          },
          transaction: t, // 이 쿼리를 트랜잭션 처리
        });
        await db.TempSeriesPost.destroy({
          where: {
            TempPostId: {
              [Op.eq]: req?.body?.tempId,
            },
          },
          transaction: t, // 이 쿼리를 트랜잭션 처리
        });
      }
      const fullPost = await db.Post.findOne({
        where: { id: newPost.id },
        transaction: t, // 이 쿼리를 트랜잭션 처리
        include: [
          {
            model: db.User,
            attributes: ["id", "email", "nickName", "profileImg"],
          },
        ],
        transaction: t, // 이 쿼리를 트랜잭션 처리
      });
      return res.send(makeResponse({ data: fullPost }));
    });
  } catch (err) {
    console.error(err);
    return res.json(
      makeResponse({
        resultCode: -1,
        resultMessage: "게시글 작성 중 오류가 발생했습니다.",
      })
    );
  }
});

router.patch("/", isLoggedIn, async (req, res, next) => {
  try {
    //* 트랜잭션 설정
    await db.sequelize.transaction(async (t) => {
      let series = null;
      /* 기존 시리즈가 있는 경우 */
      if (req.body.seriesOriId) {
        /* 선택된 시리즈가 있는 경우 */
        if (req.body.seriesName) {
          /* 선택된 시리즈가 기존과 다른 경우 
             1. 기존 시리즈 인덱스 조회
             2. 기존 시리즈 데이터 삭제
             3. 삭제된 시리즈보다 인덱스가 낮은 컬럼 업데이트
           */
          if (req.body.seriesName !== req.body.seriesOriName) {
            series = await findSeriesIdBySeriesName(req.body.seriesName, t);
            const seriesPost = await findSeriesIdx(
              req.body.seriesOriId,
              req.body.postId,
              t
            );
            await upleteSeriesPost(
              req.body.seriesOriId,
              req.body.postId,
              seriesPost?.dataValues?.idx,
              t
            );
            if (series?.id) {
              await createSeriesPost(series.id, req.body.postId, t);
            }
          }
        } else {
          /* 선택된 시리즈가 없는 경우 (시리즈 삭제) */
          const seriesPost = await findSeriesIdx(
            req.body.seriesOriId,
            req.body.postId,
            t
          );
          await upleteSeriesPost(
            req.body.seriesOriId,
            req.body.postId,
            seriesPost?.dataValues?.idx,
            t
          );
        }
        /* 기존 시리즈가 없는 경우 */
      } else {
        /* 선택된 시리즈가 있는 경우 */
        if (req.body.seriesName) {
          series = await findSeriesIdBySeriesName(req.body.seriesName, t);
          if (series?.id) {
            await createSeriesPost(series.id, req.body.postId, t);
          }
        }
      }
      /* 수정된 해시태그가 있는 경우 */
      if (req.body.hashtags) {
        /* 기존 게시글,해시태그 매핑 모두 삭제 */
        deleteHashtagAllByPostId(req.body.postId, t);
        /* 해시태그 테이블 SELECT OR INSERT  */
        const hashtags = await Promise.all(
          req.body.hashtags.map((tag) =>
            db.Hashtag.findOrCreate({
              where: { hashtagName: tag },
              transaction: t, // 이 쿼리를 트랜잭션 처리
            })
          )
        );
        /* 매핑 테이블 INSERT  */
        await Promise.all(
          hashtags.map((r) =>
            db.PostHashtag.create(
              {
                PostId: req.body.postId,
                HashtagId: r[0]?.dataValues?.id,
              },
              {
                transaction: t, // 이 쿼리를 트랜잭션 처리
              }
            )
          )
        );
      } else {
        /* 수정된 해시태그가 없는 경우 */
        const hashtag = await db.PostHashtag.findAll({
          where: {
            PostId: {
              [Op.eq]: req.body.postId,
            },
          },
          transaction: t, // 이 쿼리를 트랜잭션 처리
        });
        /* 게시글에 해시태그가 있는 경우 */
        if (hashtag) {
          /* 기존 게시글,해시태그 매핑 모두 삭제 */
          deleteHashtagAllByPostId(req.body.postId, t);
        }
      }
      /* 포스트의 기존 이미지의 사용여부를 N으로 변경한다. */
      await db.Image.update(
        {
          saveYsno: false,
          PostId: null,
        },
        {
          where: {
            PostId: {
              [Op.eq]: req.body.postId,
            },
          },
          transaction: t, // 이 쿼리를 트랜잭션 처리
        }
      );
      /* 사용한 이미지의 저장여부를 변경해준다. */
      if (req.body.imageIds.length > 0) {
        await db.Image.update(
          {
            saveYsno: true,
            PostId: req.body.postId ?? null,
          },
          {
            where: {
              id: {
                [Op.in]: req.body.imageIds,
              },
            },
            transaction: t, // 이 쿼리를 트랜잭션 처리
          }
        );
      }
      /* 임시저장 된 게시글을 완성한 경우 */
      if (req.body.tempId) {
        /* 게시글 메인데이터를 업데이트 */
        await db.Post.update(
          {
            postName: req.body.postName,
            postContent: req.body.postContent,
            postDescription: req.body.postDescription,
            postThumbnail: req.body.postThumbnail,
            permission: req.body.permission,
            TempPostId: null,
          },
          {
            where: {
              id: {
                [Op.eq]: req.body.postId,
              },
            },
            transaction: t, // 이 쿼리를 트랜잭션 처리
          }
        );
        await db.TempPost.destroy({
          where: {
            id: {
              [Op.eq]: req.body.tempId,
            },
          },
          transaction: t, // 이 쿼리를 트랜잭션 처리
        });
        /* 일반적인 포스트 수정의 경우 */
      } else {
        /* 게시글 메인데이터를 업데이트 */
        await db.Post.update(
          {
            postName: req.body.postName,
            postContent: req.body.postContent,
            postDescription: req.body.postDescription,
            postThumbnail: req.body.postThumbnail,
            permission: req.body.permission,
          },
          {
            where: {
              id: {
                [Op.eq]: req.body.postId,
              },
            },
            transaction: t, // 이 쿼리를 트랜잭션 처리
          }
        );
      }
      res.send(makeResponse({ data: "OK" }));
    });
  } catch (err) {
    console.error(err);
    res.json(
      makeResponse({
        resultCode: -1,
        resultMessage: "게시글 수정 중 오류가 발생했습니다.",
      })
    );
  }
});

router.get("/", async (req, res, next) => {
  try {
    let hashtag = req.query.hashtag;
    const postId = {};
    const search = req.query.search;
    const postName = {};
    const postIdList = [];
    const permission = {};
    let mainWhere = null;
    let countWhere = null;
    /* 태그 조회인 경우 */
    if (hashtag) {
      hashtag = await db.Hashtag.findAll({
        attributes: ["id"],
        where: {
          id: req.query.hashtag,
        },
        include: {
          model: db.Post,
          through: { attributes: [] },
        },
      });
      /* 해시태그 관계 테이블에서 조회한 postId 리스트에 주입 */
      hashtag?.[0]?.Posts.map((post) => postIdList.push(post.id));
      postId[Op.in] = postIdList;
    } else {
      postId[Op.not] = null;
    }

    /* 비공개 포스트 필터링 */
    if (req?.user?.userType === "admin") {
      permission[Op.not] = null;
    } else {
      permission[Op.eq] = "public";
    }

    /* 검색 조회인 경우 */
    if (search) {
      // 검색어를 띄어쓰기 기준으로 나누어 단어로 구분한다.
      let searchQuery = null;

      let searchTextList = search.split(" ");
      // 검색 단어 개수가 1개 이상인 경우
      if (searchTextList.length > 1) {
        searchQuery = literal(
          `match(postContent, postName, postDescription) against("${search}" IN BOOLEAN MODE)`
        );
      } else {
        searchQuery = literal(
          `match(postContent, postName, postDescription) against("${search}*" IN BOOLEAN MODE)`
        );
      }
      // 게시글 조회 쿼리에서 사용하는 조건문
      mainWhere = {
        searchQuery,
        id: postId,
        permission: permission,
        dltYsno: {
          [Op.eq]: "N",
        },
      };
      // 게시글 갯수 조회 쿼리에서 사용하는 조건문
      countWhere = {
        searchQuery,
        id: postId,
        dltYsno: {
          [Op.eq]: "N",
        },
      };
    } else {
      // 게시글 조회 쿼리에서 사용하는 조건문
      mainWhere = {
        id: postId,
        permission: permission,
        dltYsno: {
          [Op.eq]: "N",
        },
      };
      // 게시글 갯수 조회 쿼리에서 사용하는 조건문
      countWhere = {
        id: postId,
        dltYsno: {
          [Op.eq]: "N",
        },
      };
    }

    const posts = await db.Post.findAll({
      where: mainWhere,
      attributes: [
        "id",
        "postContent",
        "postName",
        "postDescription",
        "postThumbnail",
        "permission",
        "dltYsno",
        "createdAt",
        "updatedAt",
        [
          literal(
            '(SELECT COUNT(1) FROM Comments WHERE Comments.PostId = Post.id AND Comments.dltYsno = "N")'
          ),
          "commentCount",
        ],
        [
          literal(
            `(SELECT COUNT(1) FROM postlikeusers WHERE UserId = ${
              req?.user?.id ?? 0
            } AND PostId = Post.id)`
          ),
          "likeYsno",
        ],
        [
          literal(
            `(SELECT COUNT(1) FROM postlikeusers WHERE PostId = Post.id)`
          ),
          "likeCount",
        ],
      ],
      include: [
        {
          model: db.User,
          attributes: ["id", "email", "nickName", "profileImg"],
        },
        {
          model: db.Hashtag,
          required: false,
          attributes: ["id", "hashtagName"],
          through: { attributes: [] },
        },
      ],
      order: [["createdAt", "DESC"]],
      offset: parseInt(req.query.offset) || 0,
      limit: parseInt(req.query.limit, 10) || 8,
    });
    const postCnt = await db.Post.count({
      where: countWhere,
    });
    return res.send(makeResponse({ data: posts, totalCount: postCnt }));
  } catch (err) {
    console.error(err);
    return res.json(
      makeResponse({
        resultCode: -1,
        resultMessage: "게시글 조회 중 오류가 발생했습니다",
      })
    );
  }
});

router.get("/temp", isLoggedIn, async (req, res, next) => {
  try {
    const posts = await db.TempPost.findAll({
      where: {
        PostId: {
          [Op.is]: null,
        },
      },
      attributes: [
        "id",
        "postId",
        "postContent",
        "postName",
        "postDescription",
        "postThumbnail",
        "permission",
        "dltYsno",
        "createdAt",
        "updatedAt",
      ],
      include: [
        {
          model: db.User,
          attributes: ["id", "email", "nickName", "profileImg"],
        },
        {
          model: db.TempHashtag,
          required: false,
          attributes: ["id", "hashtagName"],
          through: { attributes: [] },
        },
      ],
      order: [["createdAt", "DESC"]],
      offset: parseInt(req.query.offset) || 0,
      limit: parseInt(req.query.limit, 10) || 8,
    });
    const postCnt = await db.TempPost.count({
      where: {
        PostId: {
          [Op.is]: null,
        },
      },
    });
    return res.send(makeResponse({ data: posts, totalCount: postCnt }));
  } catch (err) {
    console.error(err);
    return res.json(
      makeResponse({
        resultCode: -1,
        resultMessage: "임시글 조회 중 오류가 발생했습니다",
      })
    );
  }
});

router.post("/temp", isLoggedIn, async (req, res, next) => {
  try {
    //* 트랜잭션 설정
    await db.sequelize.transaction(async (t) => {
      let series = null;
      if (req.body.seriesName) {
        series = await db.Series.findOne({
          attributes: ["id"],
          where: {
            seriesName: {
              [Op.eq]: req.body.seriesName,
            },
          },
          transaction: t, // 이 쿼리를 트랜잭션 처리
        });
      }
      /* 기존 임시 포스트에 작성되어있던 임시 포스트 삭제 ( 자동 저장 케이스 ) */
      await db.TempPost.destroy({
        where: {
          id: {
            [Op.eq]: req?.body?.tempId,
          },
        },
        transaction: t, // 이 쿼리를 트랜잭션 처리
      });
      /* 기존 포스트에 작성되어있던 임시 포스트 삭제 */
      await db.TempPost.destroy({
        where: {
          PostId: {
            [Op.eq]: req?.body?.postId,
          },
        },
        transaction: t, // 이 쿼리를 트랜잭션 처리
      });
      const newTempPost = await db.TempPost.create(
        {
          postName: req.body.postName,
          postContent: req.body.postContent,
          postDescription: req.body.postDescription,
          postThumbnail: req.body.postThumbnail,
          permission: req.body.permission,
          dltYsno: "N",
          UserId: req.user.id,
          PostId: req?.body?.postId,
        },
        {
          transaction: t, // 이 쿼리를 트랜잭션 처리
        }
      );
      /* 기존 포스트를 임시저장한 경우 매핑처리 */
      if (req?.body?.postId) {
        /* 기존 포스트에 작성되어있던 임시 포스트 삭제 */
        await db.Post.update(
          {
            TempPostId: newTempPost?.id,
          },
          {
            where: {
              id: {
                [Op.eq]: req?.body?.postId,
              },
            },
            transaction: t, // 이 쿼리를 트랜잭션 처리
          }
        );
      }
      if (series?.id) {
        const tempIdx = await db.TempSeriesPost.findOne({
          attributes: [[fn("MAX", col("idx")), "currentidx"]],
          where: {
            SeriesId: series?.id,
          },
          transaction: t, // 이 쿼리를 트랜잭션 처리
        });
        await db.TempSeriesPost.create(
          {
            idx: tempIdx?.dataValues?.currentidx
              ? Number(tempIdx?.dataValues?.currentidx) + 1
              : 1,
            TempPostId: newTempPost?.id,
            SeriesId: series?.id,
          },
          {
            transaction: t, // 이 쿼리를 트랜잭션 처리
          }
        );
      }
      if (req.body.hashtags) {
        /* 해시태그 테이블 INSERT  */
        const hashtags = await Promise.all(
          req.body.hashtags.map((tag) =>
            db.TempHashtag.findOrCreate({
              where: { hashtagName: tag },
              transaction: t, // 이 쿼리를 트랜잭션 처리
            })
          )
        );
        /* 매핑 테이블 INSERT  */
        await Promise.all(
          hashtags.map((r) =>
            db.TempPostHashtag.create(
              {
                TempPostId: newTempPost?.id,
                TempHashtagId: r[0]?.dataValues?.id,
              },
              {
                transaction: t, // 이 쿼리를 트랜잭션 처리
              }
            )
          )
        );
      }
      /* 사용한 이미지의 저장여부를 변경해준다. */
      if (req.body.imageIds.length > 0) {
        await db.Image.update(
          {
            saveYsno: true,
            TempPostId: newTempPost?.id ?? null,
          },
          {
            where: {
              id: {
                [Op.in]: req.body.imageIds,
              },
            },
            transaction: t, // 이 쿼리를 트랜잭션 처리
          }
        );
      }
      res.send(makeResponse({ data: newTempPost?.id }));
    });
  } catch (err) {
    console.error(err);
    return res.json(
      makeResponse({
        resultCode: -1,
        resultMessage: "임시글 작성 중 오류가 발생했습니다.",
      })
    );
  }
});

router.get("/temp/:id", isLoggedIn, async (req, res, next) => {
  const postId = {};
  /* 기존 포스트 임시저장 조회 경우 */
  if (req?.query?.id) {
    postId[Op.eq] = req?.query?.id;
  } else {
    postId[Op.is] = null;
  }
  try {
    const post = await db.TempPost.findOne({
      where: {
        id: {
          [Op.eq]: req.params.id,
        },
        PostId: postId,
      },
      attributes: [
        "id",
        ["PostId", "postId"],
        "postContent",
        "postName",
        "postDescription",
        "postThumbnail",
        [
          literal(
            `(SELECT id FROM images WHERE TempPostId = ${req.params.id} AND fileName = TempPost.postThumbnail)`
          ),
          "postThumbnailId",
        ],
        "permission",
        "dltYsno",
      ],
      include: [
        {
          model: db.User,
          attributes: ["id", "email", "nickName"],
        },
        {
          model: db.TempHashtag,
          attributes: [["hashtagName", "key"], "hashtagName"],
          required: false,
          through: {
            attributes: [],
          },
        },
        {
          model: db.Series,
          required: false,
          attributes: ["id", "seriesName"],
          through: {
            attributes: [],
          },
        },
      ],
    });
    return res.send(makeResponse({ data: post }));
  } catch (err) {
    console.error(err);
    return res.json(
      makeResponse({
        resultCode: -1,
        resultMessage: "임시글 삭제 중 오류가 발생했습니다.",
      })
    );
  }
});

router.delete("/temp/:id", isLoggedIn, async (req, res, next) => {
  try {
    await db.sequelize.transaction(async (t) => {
      await db.TempPost.destroy({
        where: {
          id: {
            [Op.eq]: req.params.id,
          },
        },
        transaction: t, // 이 쿼리를 트랜잭션 처리
      });
      await db.TempPostHashtag.destroy({
        where: {
          TempPostId: {
            [Op.eq]: req.params.id,
          },
        },
        transaction: t, // 이 쿼리를 트랜잭션 처리
      });
      await db.TempSeriesPost.destroy({
        where: {
          TempPostId: {
            [Op.eq]: req.params.id,
          },
        },
        transaction: t, // 이 쿼리를 트랜잭션 처리
      });
    });
    return res.send(makeResponse({ data: "OK" }));
  } catch (err) {
    console.error(err);
    return res.json(
      makeResponse({
        resultCode: -1,
        resultMessage: "게시글 삭제 중 오류가 발생했습니다.",
      })
    );
  }
});

router.get("/like", async (req, res, next) => {
  try {
    const posts = await db.Post.findAll({
      attributes: [
        "id",
        "postContent",
        "postName",
        "postDescription",
        "postThumbnail",
        "permission",
        "dltYsno",
        "createdAt",
        "updatedAt",
        [
          literal(
            '(SELECT COUNT(1) FROM Comments WHERE Comments.PostId = Post.id AND Comments.dltYsno = "N")'
          ),
          "commentCount",
        ],
        [
          literal(
            `(SELECT COUNT(1) FROM postlikeusers WHERE PostId = Post.id)`
          ),
          "likeCount",
        ],
      ],
      include: [
        {
          model: db.User,
          attributes: ["id", "email", "nickName", "profileImg"],
        },
        {
          model: db.Hashtag,
          required: false,
          attributes: ["id", "hashtagName"],
          through: { attributes: [] },
        },
        {
          model: db.User,
          attributes: [],
          as: "likedUser",
          required: true,
          through: {
            attributes: [],
            where: {
              UserId: req?.user?.id,
            },
          },
        },
      ],
      order: [["createdAt", "DESC"]],
      offset: parseInt(req.query.offset) || 0,
      limit: parseInt(req.query.limit, 10) || 8,
    });
    const totalCount = await db.Post.count({
      include: [
        {
          model: db.User,
          attributes: [],
          as: "likedUser",
          required: true,
          through: {
            attributes: [],
            where: {
              UserId: req?.user?.id,
            },
          },
        },
      ],
    });
    return res.send(makeResponse({ data: posts, totalCount }));
  } catch (err) {
    console.error(err);
    return res.json(
      makeResponse({
        resultCode: -1,
        resultMessage: "관심글 조회 중 오류가 발생했습니다.",
      })
    );
  }
});

router.get("/detail/:id", async (req, res, next) => {
  try {
    const post = await db.Post.findOne({
      where: {
        id: req.params.id,
      },
      attributes: [
        "id",
        "postContent",
        "postName",
        "postDescription",
        "postThumbnail",
        [
          literal(
            `(SELECT id FROM images WHERE PostId = Post.id AND fileName = Post.postThumbnail)`
          ),
          "postThumbnailId",
        ],
        "permission",
        "dltYsno",
        [
          literal(`(SELECT id FROM tempposts WHERE PostId = Post.id)`),
          "TempPostId",
        ],
      ],
      include: [
        {
          model: db.User,
          attributes: ["id", "email", "nickName", "profileImg"],
        },
        {
          model: db.Hashtag,
          required: false,
          attributes: [["hashtagName", "key"], "hashtagName"],
          through: {
            attributes: [],
          },
        },
        {
          model: db.Series,
          required: false,
          attributes: ["id", "seriesName", "seriesThumbnail"],
          through: {
            attributes: [],
          },
        },
      ],
    });
    return res.send(makeResponse({ data: post }));
  } catch (err) {
    console.error(err);
    return res.json(
      makeResponse({
        resultCode: -1,
        resultMessage: "게시글 상세내역 조회 중 오류가 발생했습니다.",
      })
    );
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    await db.sequelize.transaction(async (t) => {
      const postType = req?.query?.postType ?? "post";
      const post = await db.Post.findOne({
        where: {
          id: {
            [Op.eq]: req.params.id,
          },
          dltYsno: {
            [Op.eq]: "N",
          },
        },
        transaction: t, // 이 쿼리를 트랜잭션 처리
        include: [
          {
            model: db.User,
            attributes: ["id", "email", "nickName", "profileImg"],
          },
          {
            model: db.Hashtag,
            required: false,
          },
          {
            model: db.User,
            attributes: [],
            as: "likedUser",
            through: {
              attributes: [],
            },
          },
          {
            model: db.Series,
            required: false,
            attributes: ["id", "seriesThumbnail"],
            through: { attributes: [] },
          },
        ],
        order: [["createdAt", "DESC"]],
      });
      if (post) {
        const likes = await post.getLikedUser();
        const likeCurrentUser = req?.user?.id
          ? await post.hasLikedUser(req.user)
          : false;
        const commentCount = await db.Comment.count({
          where: {
            PostId: {
              [Op.eq]: req.params.id,
            },
            dltYsno: {
              [Op.eq]: "N",
            },
          },
          transaction: t, // 이 쿼리를 트랜잭션 처리
        });
        const series = await db.SeriesPost.findOne({
          attributes: ["SeriesId", "idx"],
          where: {
            PostId: {
              [Op.eq]: req.params.id,
            },
          },
        });
        let next = null;
        let prev = null;
        let nextOp = {};
        let prevOp = {};
        /* 시리즈 인 경우 처리 케이스 */
        if (postType === "series") {
          const nextPost = await db.SeriesPost.findOne({
            attributes: ["PostId"],
            where: {
              SeriesId: {
                [Op.eq]: series.SeriesId,
              },
              idx: {
                [Op.gt]: series.idx,
              },
            },
            transaction: t, // 이 쿼리를 트랜잭션 처리
            order: [["idx", "ASC"]],
          });
          nextOp[Op.eq] = nextPost?.PostId;
          const prevPost = await db.SeriesPost.findOne({
            attributes: ["PostId"],
            where: {
              SeriesId: {
                [Op.eq]: series.SeriesId,
              },
              idx: {
                [Op.lt]: series.idx,
              },
            },
            transaction: t, // 이 쿼리를 트랜잭션 처리
            order: [["idx", "DESC"]],
          });
          prevOp[Op.eq] = prevPost?.PostId;
        } else {
          nextOp[Op.gt] = req.params.id;
          prevOp[Op.lt] = req.params.id;
        }
        next = await db.Post.findOne({
          attributes: ["id", "postName"],
          where: {
            id: nextOp,
            dltYsno: {
              [Op.eq]: "N",
            },
          },
          transaction: t, // 이 쿼리를 트랜잭션 처리
          order: [["id", "ASC"]],
        });
        prev = await db.Post.findOne({
          attributes: ["id", "postName"],
          where: {
            id: prevOp,
            dltYsno: {
              [Op.eq]: "N",
            },
          },
          transaction: t, // 이 쿼리를 트랜잭션 처리
          order: [["id", "DESC"]],
        });
        post.set("next", next);
        post.set("prev", prev);
        post.set("likeCount", likes.length);
        post.set("likeYsno", likeCurrentUser);
        post.set("commentCount", commentCount);
      }
      return res.send(makeResponse({ data: post }));
    });
  } catch (err) {
    console.error(err);
    return res.json(
      makeResponse({
        resultCode: -1,
        resultMessage: "게시글 단건 조회 중 오류가 발생했습니다.",
      })
    );
  }
});

router.post("/:id/like", isLoggedIn, async (req, res, next) => {
  try {
    await db.PostLikeUser.create({
      PostId: req.params.id,
      UserId: req.user.id,
    });
    return res.send(makeResponse({ data: "OK" }));
  } catch (err) {
    console.error(err);
    return res.json(
      makeResponse({
        resultCode: -1,
        resultMessage: "관심글 등록 중 오류가 발생했습니다.",
      })
    );
  }
});

router.delete("/:id/like", isLoggedIn, async (req, res, next) => {
  try {
    await db.PostLikeUser.destroy({
      where: {
        PostId: req.params.id,
        UserId: req.user.id,
      },
    });
    return res.send(makeResponse({ data: "OK" }));
  } catch (err) {
    console.error(err);
    return res.json(
      makeResponse({
        resultCode: -1,
        resultMessage: "관심글 취소 중 오류가 발생했습니다.",
      })
    );
  }
});

router.get("/:id/content", async (req, res, next) => {
  try {
    if (req?.query?.postType !== "temp") {
      const post = await db.Post.findOne({
        where: {
          id: req.params.id,
        },
        attributes: ["id", "postContent", "postThumbnail"],
      });
      /* 컨텐츠 영역에서 사용한 이미지 정보 조회 */
      const images = await db.Image.findAll({
        where: {
          PostId: {
            [Op.eq]: post?.id,
          },
          saveYsno: {
            [Op.eq]: 1,
          },
          fileName: {
            [Op.ne]: post?.postThumbnail,
          },
        },
      });
      return res.send(
        makeResponse({
          data: {
            postContent: post?.postContent,
            images: images,
          },
        })
      );
    } else {
      const post = await db.TempPost.findOne({
        where: {
          id: req.params.id,
        },
        attributes: ["id", "postContent", "postThumbnail"],
      });
      /* 컨텐츠 영역에서 사용한 이미지 정보 조회 */
      const images = await db.Image.findAll({
        where: {
          TempPostId: {
            [Op.eq]: post?.id,
          },
          saveYsno: {
            [Op.eq]: 1,
          },
          fileName: {
            [Op.ne]: post?.postThumbnail,
          },
        },
      });
      return res.send(
        makeResponse({
          data: {
            postContent: post?.postContent,
            images: images,
          },
        })
      );
    }
  } catch (err) {
    console.error(err);
    return res.json(
      makeResponse({
        resultCode: -1,
        resultMessage: "게시글 내용 조회 중 오류가 발생했습니다.",
      })
    );
  }
});

router.delete("/:id", isLoggedIn, async (req, res, next) => {
  try {
    await db.sequelize.transaction(async (t) => {
      await db.Post.update(
        { dltYsno: "Y", seriesId: null },
        {
          where: {
            id: {
              [Op.eq]: req.params.id,
            },
          },
          transaction: t, // 이 쿼리를 트랜잭션 처리
        }
      );
      const deletePost = await db.SeriesPost.findOne({
        where: {
          PostId: {
            [Op.eq]: req.params.id,
          },
        },
        transaction: t, // 이 쿼리를 트랜잭션 처리
        attributes: ["SeriesId", "idx"],
      });
      if (deletePost?.SeriesId) {
        await db.SeriesPost.destroy({
          where: {
            SeriesId: {
              [Op.eq]: deletePost.SeriesId,
            },
            PostId: {
              [Op.eq]: req.params.id,
            },
          },
          transaction: t, // 이 쿼리를 트랜잭션 처리
        });
        await db.SeriesPost.update(
          {
            idx: literal("idx -1"),
          },
          {
            where: {
              Seriesid: {
                [Op.eq]: deletePost.SeriesId,
              },
              idx: {
                [Op.gt]: deletePost?.idx,
              },
            },
            transaction: t, // 이 쿼리를 트랜잭션 처리
          }
        );
        const seriesCount = await db.SeriesPost.count({
          where: {
            SeriesId: {
              [Op.eq]: deletePost.SeriesId,
            },
          },
          transaction: t, // 이 쿼리를 트랜잭션 처리
        });
        if (seriesCount === 0) {
          await db.Series.destroy({
            where: {
              id: deletePost.SeriesId,
            },
            transaction: t, // 이 쿼리를 트랜잭션 처리
          });
        }
      }
    });
    return res.send(makeResponse({ data: "SUCCESS" }));
  } catch (err) {
    console.error(err);
    return res.json(
      makeResponse({
        resultCode: -1,
        resultMessage: "게시글 삭제 중 오류가 발생했습니다.",
      })
    );
  }
});

module.exports = router;

/**
 *
 * @param {*} seriesId
 * @param {*} postId
 * @param {*} t
 * @returns {object} seriesPost
 * @description 시리즈에서 해당하는 포스트의 목차순서를 조회합니다.
 */
async function findSeriesIdx(seriesId, postId, t) {
  const seriesPost = await db.SeriesPost.findOne({
    attributes: ["idx"],
    where: {
      SeriesId: {
        [Op.eq]: seriesId,
      },
      PostId: {
        [Op.eq]: postId,
      },
    },
    transaction: t, // 이 쿼리를 트랜잭션 처리
  });

  return seriesPost;
}

async function findSeriesIdBySeriesName(seriesName, t) {
  return await db.Series.findOne({
    attributes: ["id"],
    where: {
      seriesName: {
        [Op.eq]: seriesName,
      },
    },
    transaction: t, // 이 쿼리를 트랜잭션 처리
  });
}

/**
 *
 * @param {*} seriesId
 * @param {*} postId
 * @param {*} t
 * @description 시리즈, 포스트 연관 테이블 INSERT 함수
 */
async function createSeriesPost(seriesId, postId, t) {
  const idx = await db.SeriesPost.findOne({
    attributes: [[fn("MAX", col("idx")), "currentidx"]],
    where: {
      SeriesId: seriesId,
    },
    transaction: t, // 이 쿼리를 트랜잭션 처리
  });
  await db.SeriesPost.create(
    {
      idx: idx?.dataValues?.currentidx
        ? Number(idx?.dataValues?.currentidx) + 1
        : 1,
      PostId: postId,
      SeriesId: seriesId,
    },
    {
      transaction: t, // 이 쿼리를 트랜잭션 처리
    }
  );
}

/**
 *
 * @param {*} seriesId
 * @param {*} postId
 * @param {*} idx
 * @param {*} t
 * @description 시리즈, 포스트 연관 테이블 UPDATE, DELETE 함수
 */
async function upleteSeriesPost(seriesId, postId, idx, t) {
  await db.SeriesPost.destroy({
    where: {
      SeriesId: {
        [Op.eq]: seriesId,
      },
      PostId: {
        [Op.eq]: postId,
      },
    },
    transaction: t, // 이 쿼리를 트랜잭션 처리
  });
  await db.SeriesPost.update(
    {
      idx: literal("idx -1"),
    },
    {
      where: {
        SeriesId: {
          [Op.eq]: seriesId,
        },
        idx: {
          [Op.gt]: idx,
        },
      },
      transaction: t, // 이 쿼리를 트랜잭션 처리
    }
  );
}

async function deleteHashtagAllByPostId(postId, t) {
  await db.PostHashtag.destroy({
    where: {
      PostId: {
        [Op.eq]: postId,
      },
    },
    transaction: t, // 이 쿼리를 트랜잭션 처리
  });
}
