const db = require("../models");
const { Op } = require("sequelize");
const { mailSend } = require("../util/mailSend");

module.exports = async () => {
  try {
    let curr = new Date();
    let ids = "";
    curr.setHours(curr.getHours() - 1);

    const subscriber = await db.User.findAll({
      attributes: ['email'],
      where: {
        newPostNoticeYsno: 'Y',
      }
    })

    subscriber.map((item) => {
      ids = ids.concat(item?.email, ",");
    })
    ids = ids.substring(0, ids.length - 1);
    if (ids !== '') {
      const newPosts = await db.Post.findAll({
        where: {
          createdAt: {
            [Op.gte]: curr
          }
        }
      })
      newPosts.map(item => {
        const href = `${process.env.FO_URL}/blog/post/${item.id}`;
        const template = `
        <div
          style="font-family: 'Noto Sans KR', cursive; content: 'NotoSans' !important; width: 400px; margin-left: auto; margin-right: auto;">
          <div>
            <h3>새로운 글이 등록되었습니다! 지금 확인해보세요.</h3>
          </div>
          <div style="width:100%;height:1px;background:#e9ecef;margin-top:2rem;margin-bottom:2rem"></div>
          <div class="container" style="width: 330px; margin-left: auto; margin-right: auto;">
          <img src="http://t1.daumcdn.net/friends/prod/editor/dc8b3d02-a15a-4afa-a88b-989cf2a50476.jpg" alt="카카오 라이언" width="330px" height="223px" align="center" border="0">
          <div style="color: #382119 !important; margin-left: 10px; margin-top: 10px">
            <h1>sdgd</h1>
          </div>
          <div style="color: #634426 !important;">
            <h3
              style="overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 3; /* 라인수 */ -webkit-box-orient: vertical; word-wrap:break-word;  line-height: 1.2em; height: 3.6em;">
              ㅎㅎㅎㅎㅎㅎㅎㅎㅎㅎㅎㅎㅎㅎㅎㅎㅎㅎㅎㅎㅎㅎㅎㅎㅎㅎㅎㅎㅎㅎㅎㅎㅎㅎㅎㅎㅎㅎㅎㅎㅎㅎ</h3>
          </div>
          </div>
          <a href="${href}"
            style="width: 400px; text-decoration: none; text-align:center; display:block; margin: 0 auto; margin-top: 1rem; background: #634426; padding-top: 1rem; color: white; font-size: 1.25rem; padding-bottom: 1rem; font-weight: 600; border-radius: 4px;"
            target="_blank">새 글 확인하기</a>
          <div>
            <br>
            <br>
            <br>
            coldbrewCode | <a href="mailto:endia@endia.me" target="_blank">endia@endia.me</a>
            <div class="yj6qo"></div>
            <div class="adL">
            </div>
          </div>
        </div>
    `
        mailSend({ receiverEmails: ids, subject: '새 글 알림', template });
      })
    }
  } catch (err) {
    console.log(err);
  }
}