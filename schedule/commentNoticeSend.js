const db = require("../models");
const { Op } = require("sequelize");
const { mailSend } = require("../util/mailSend");

module.exports = async () => {
  try {
    let curr = new Date();
    curr.setHours(curr.getHours() - 1);

    const subscriber = await db.User.findOne({
      attributes: ['email', 'id'],
      where: {
        commentNoticeYsno: 'Y',
      }
    })

    if (subscriber) {
      const newComment = await db.Comment.findAll({
        attributes: ['commentContent', 'createdAt'],
        where: {
          createdAt: {
            [Op.gte]: curr
          }
        },
        include: [
          {
            model: db.User,
            attributes: ["id", "nickName", "profileImg"],
            where: {
              id: {
                [Op.ne]: subscriber?.id
              }
            }
          },
          {
            model: db.Post,
            attributes: ["id", "postName"],
          }
        ]
      })
      newComment.map(item => {
        const href = `${process.env.FO_URL}/${item?.Post?.id}`;
        console.log(item?.User?.profileImg);
        const template = `
        <div
          style="font-family: 'Noto Sans KR', cursive; content: 'NotoSans' !important; width: 400px; margin-left: auto; margin-right: auto;" >
        <div>
          <h3>새로운 답글이 등록되었습니다.</h3>
        </div>
        <div style="max-width:100%;width:600px;margin:0 auto">
          <span class="im">
            <div style="margin-top:0.5rem">
              <a href="${href}" style="color:#495057;text-decoration:none;font-weight:600;font-size:1.125rem" target="_blank">${item?.Post?.postName}</a>
            </div>
            <div style="font-weight:400;margin-top:0.5rem;font-size:1.75rem"></div>
            <div style="width:100%;height:1px;background:#e9ecef;margin-top:2rem;margin-bottom:2rem"></div>
          </span>
          <div style="display:-webkit-flex;display:-ms-flexbox;display:flex">
            <div>
              <a href="${href}" target="_blank">
              ${item?.User?.profileImg &&
          `
                <img style="height:64px;width:64px;display:block;border-radius:32px"
                  src="${process.env.BO_URL}/${item.profileImg}"
                  class="CToWUd" data-bit="iit">
                `
          }
              ${!item?.User?.profileImg &&
          `
                <img style="height:64px;width:64px;display:block;border-radius:32px"
                  src="https://ci6.googleusercontent.com/proxy/aKXf8qOIiwNnadEvqjt5wF9VAi15aMgBHsvuYW5dxlP6YDfI95_4o8FVhOxrQ9D3Xo1w3zZLGaykSA2nds4c7K-p7ZMFVIeyh8m-KSHuvQwLVTanpynyVZuec1Kj48eBZrC6rHeIQn4EryoEa2qmtUDfdayNxm7H6322KlQ=s0-d-e1-ft#https://velog.velcdn.com/images/endia4644/profile/12343e35-f536-4675-8594-acc435f3ef9e/social_profile.jpeg"
                  class="CToWUd" data-bit="iit">
                `
          }
              </a>
            </div>
            <div style="margin-left:1.5rem;color:#495057">
              <div style="margin-bottom:0.5rem">
                <a href="${href}" style="text-decoration:none;color:#212529;font-weight:600" target="_blank">${item?.User?.nickName}</a>
              </div>
              <div style="margin:0;color:#495057">
                <p>${item?.commentContent}</p>

              </div><span class="im">
                <div style="font-size:0.875rem;color:#adb5bd;margin-top:1.5rem">
                  ${item?.createdAt}
                </div>
                <a href="${href}"
                  style="outline:none;border:none;background:#845ef7;color:white;padding-top:0.5rem;padding-bottom:0.5rem;font-size:1rem;font-weight:600;display:inline-block;background:#845ef7;padding-left:1rem;padding-right:1rem;margin-top:1rem;border-radius:4px;text-decoration:none"
                  target="_blank">답글
                  달기</a>
              </span>
            </div>
          </div>
        </div>
        <div style="width:100%;height:1px;background:#e9ecef;margin-top:2rem;margin-bottom:2rem"></div>
       `
        // mailSend({ receiverEmails: subscriber?.email, subject: '새 글 알림', template });
      })
    }
  } catch (err) {
    console.log(err);
  }
}

function elapsedTime(date) {
  const start = new Date(date);
  const end = new Date(); // 현재 날짜

  const diff = end.getTime() - start.getTime(); // 경과 시간

  const times = [
    { time: "분", milliSeconds: 1000 * 60 },
    { time: "시간", milliSeconds: 1000 * 60 * 60 },
    { time: "일", milliSeconds: 1000 * 60 * 60 * 24 },
    { time: "개월", milliSeconds: 1000 * 60 * 60 * 24 * 30 },
    { time: "년", milliSeconds: 1000 * 60 * 60 * 24 * 365 },
  ].reverse();

  // 년 단위부터 알맞는 단위 찾기
  for (const value of times) {
    const betweenTime = Math.floor(diff / value.milliSeconds);

    // 큰 단위는 0보다 작은 소수 단위 나옴
    if (betweenTime > 0) {
      return `${betweenTime}${value.time} 전`;
    }
  }

  // 모든 단위가 맞지 않을 시
  return "방금 전";
}
