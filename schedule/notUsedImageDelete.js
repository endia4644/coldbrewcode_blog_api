const db = require("../models");
const { Op } = require("sequelize");
const fs = require("fs");

module.exports = async () => {
  try {
    let curr = new Date();
    curr.setHours(curr.getHours() - 12);

    //* 트랜잭션 설정
    await db.sequelize.transaction(async (t) => {
      const notUsedImages = await db.Image.findAll({
        attributes: ['fileName'],
        where: {
          saveYsno: {
            [Op.eq]: 0
          },
          createdAt: {
            [Op.lte]: curr
          }
        },
        transaction: t,
      })

      if (notUsedImages) {
        notUsedImages.map((item) => {
          // 파일이 존재할경우 ture 없으면 false
          try {
            if (fs.existsSync("uploads/" + item.fileName)) {
              // 파일이 존재할경우 삭제
              fs.unlinkSync("uploads/" + item.fileName);
              console.log(item.fileName);
            }
          } catch (err) {
            return err;
          }
        })

        // Image 테이블에서도 삭제된 파일 정보 삭제
        await db.Image.destroy({
          where: {
            saveYsno: {
              [Op.eq]: 0
            },
            createdAt: {
              [Op.lte]: curr
            }
          },
          transaction: t,
        });
      }
    })
  } catch (err) {
    console.log(err);
  }
}