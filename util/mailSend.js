const nodemailer = require("nodemailer");

exports.mailSend = async ({ receiverEmails, subject, template }) => {
  // 본인 Gmail 계정
  const EMAIL = "endia9858@gmail.com";
  const EMAIL_PW = "onoybeebixsrlhym";

  // transport 생성
  let transport = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: EMAIL,
      pass: EMAIL_PW,
    },
  });

  // 전송할 email 내용 작성
  let mailOptions = {
    from: EMAIL,
    to: receiverEmails,
    cc: receiverEmails,   //숨은참조 ( 대량메일 발송 시 받는사람 본인만 표시 )
    bcc: receiverEmails,  //숨은참조 ( 대량메일 발송 시 받는사람 본인만 표시 )
    subject: subject,
    html: template,
  };

  // email 전송
  await transport
    .sendMail(mailOptions)
    .then(() => {
      return;
    })
    .catch((err) => {
      console.error(err);
      return err;
    });
}