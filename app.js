const cors = require("cors");
const passport = require("passport");
const express = require("express");
const session = require("express-session");
const cookie = require("cookie-parser");
const morgan = require("morgan");
const dotenv = require("dotenv");
const hpp = require("hpp");
const helmet = require("helmet");
const schedule = require('node-schedule');
const redis = require("redis");
const RedisStore = require("connect-redis")(session);
const client = redis.createClient();

const db = require("./models");
const passportConfig = require("./passport");
const authRouter = require("./routes/auth");
const postRouter = require("./routes/post");
const commentRouter = require("./routes/comment");
const seriesRouter = require("./routes/series");
const hashtagRouter = require("./routes/hashtag");
const imageRouter = require("./routes/image");
const userRouter = require("./routes/user");
const { makeResponse } = require("./util");

/* 스케쥴러 호출 함수 */
const newPostSend = require("./schedule/newPostSend");
const commentNotice = require("./schedule/commentNoticeSend");
const notUsedImageDelete = require("./schedule/notUsedImageDelete");

const app = express();

//* Redis 연결
// redis[s]://[[username][:password]@][host][:port][/db-number]
const redisClient = redis.createClient({ legacyMode: true }); // legacy 모드 반드시 설정 !!
redisClient.on('connect', () => {
  console.info('Redis connected!');
});
redisClient.on('error', (err) => {
  console.error('Redis Client Error', err);
});
redisClient.connect().then(); // redis v4 연결 (비동기)
const redisCli = redisClient.v4; // 기본 redisClient 객체는 콜백기반인데 v4버젼은 프로미스 기반이라 사용

//* 세션 쿠키 미들웨어 
app.use(cookie(process.env.COOKIE_SECRET));
const sessionOption = {
  resave: false,
  saveUninitialized: true,
  secret: process.env.COOKIE_SECRET,
  cookie: {
    httpOnly: true,
    secure: false,
  },
  // @ts-ignore
  store: new RedisStore({ client: redisClient, prefix: 'session:' }), // 세션 데이터를 로컬 서버 메모리가 아닌 redis db에 저장하도록 등록
};
app.use(session(sessionOption));

const prod = process.env.NODE_ENV === "production";
dotenv.config();
db.sequelize.sync(); // {force: true}
passportConfig();

if (prod) {
  app.use(hpp());
  app.use(helmet());
  app.use(morgan("combined"));
  app.use(
    cors({
      origin: process.env.FO_URL,
      credentials: true,
    })
  );
} else {
  app.use(morgan("dev"));
  app.use(
    cors({
      origin: true,
      credentials: true,
    })
  );
}

app.use("/", express.static("uploads"));
app.use(express.json({ limit: 5000000 }));
app.use(express.urlencoded({ extended: false }));
app.use(passport.initialize());
app.use(passport.session());

app.use("/auth", authRouter);
app.use("/post", postRouter);
app.use("/comment", commentRouter);
app.use("/series", seriesRouter);
app.use("/hashtag", hashtagRouter);
app.use("/image", imageRouter);
app.use("/user", userRouter);

app.use(function (error, req, res, next) {
  // 에러 헨들링
  res.send(
    makeResponse({
      resultCode: -1,
      resultMessage:
        error !== "null" && error ? error : "서비스 오류가 발생했습니다",
    })
  );
});

app.listen(3085, () => {
  console.log(`백엔드 서버 ${3085}번 포트에서 작동중.`);
  if (process.env.NODE_ENV === 'production') {
    schedule.scheduleJob('*/12 * * *', function () {
      // newPostSend();
      // commentNotice();
      notUsedImageDelete();
    });
  }
});
