const db = require("../models");
const { Op } = require("sequelize");
const fs = require("fs");

module.exports = async () => {
  try {
    let curr = new Date();
    curr.setDate(curr.getDate() - 7);

    console.log(`[CLEANUP START] 기준 시간: ${curr.toISOString()} (7일 이전 데이터 삭제)`);

    //* 트랜잭션 설정
    await db.sequelize.transaction(async (t) => {
      const notUsedImages = await db.Image.findAll({
        attributes: ['fileName', 'createdAt', 'id'], // ID와 생성일도 가져옴
        where: {
          saveYsno: 0,
          createdAt: {[Op.lte]: curr}
        },
        transaction: t,
      });

      if (notUsedImages.length > 0) {
        console.log(`[TARGET FOUND] 삭제 대상 개수: ${notUsedImages.length}개`);

        for (const item of notUsedImages) {
          const filePath = "uploads/" + item.fileName;
          try {
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
              console.log(`[DELETED] 파일명: ${item.fileName} | 생성일: ${item.createdAt} | DB_ID: ${item.id}`);
            } else {
              console.warn(`[FILE NOT FOUND] DB에는 있으나 실제 파일 없음: ${item.fileName}`);
            }
          } catch (err) {
            console.error(`[ERROR] 파일 삭제 실패 (${item.fileName}):`, err);
          }
        }

        const deleteCount = await db.Image.destroy({
          where: {
            saveYsno: 0,
            createdAt: {[Op.lte]: curr}
          },
          transaction: t,
        });
        console.log(`[DB CLEANUP] Image 테이블 ${deleteCount}개 레코드 삭제 완료`);
      } else {
        console.log(`[SKIP] 삭제할 대상이 없습니다.`);
      }
    });
  } catch (err) {
    console.error("[CRITICAL ERROR] 이미지 정리 프로세스 중 오류 발생:", err);
  }
}