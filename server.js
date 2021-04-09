// const dotenv = require('dotenv');
// dotenv.config({ path: './config.env' });
require('dotenv').config({
  path: './config.env',
});
const mongoose = require('mongoose');

// eslint-disable-next-line no-unused-vars
process.on('uncaughtException', (err) => {
  console.log(err.name, err.message);
  console.log('UNCAUGHT EXEPTION! 💥 Shutting down...');
  process.exit(1);
});
/*
## 'uncaughtException'
-- どこにもキャッチされずにprocessまで来てしまったエラーをキャッチ。
-- NodeJSのデフォルト（上記のようにハンドリングしない場合）では、このようなエラーはスタックトレースに出力して終了。
-- リスナーの関数はerrだけ。
-- on() methodの前に起きたエラーはキャッチできないのでcodeのtopに置く
-- this handler is not executed asynchronously, so we don't need server.close(...)
*/

const app = require('./app');

// console.log(app.get('env'));
// console.log(process.env);

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

mongoose
  // .connect(process.env.DATABASE_LOCAL, {  // local database
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
    // useUnifiedTopology: true, をいれないと下記のwarningがでる
    // (node:7191) [MONGODB DRIVER] Warning: Current Server Discovery and Monitoring engine is deprecated, and will be removed in a future version. To use the new Server Discover and Monitoring engine, pass option { useUnifiedTopology: true } to the MongoClient constructor.
  })
  .then(() => {
    // console.log(con.connections);
    console.log('DB connection successful');
  });
// .catch((err) => console.log('Cannot connect to the DB'));

//:: =============== Start the server =============== :://
const port = process.env.PORT || 8080;

const server = app.listen(port, () => {
  console.log(`App running on port ${port}...`);
});

//:: =============== Error Handling =============== :://

// eslint-disable-next-line no-unused-vars
process.on('unhandledRejection', (err) => {
  console.log(err.name, err.message);
  console.log('UNHANDLED REJECTION! 💥 Shutting down...');
  // server.close() gives some time to the server to finish all the request that are still pending or being handled at the time, and only after that the server is basically killed.
  server.close(() => {
    process.exit(1);
    // 0 = success , 1 = uncaught exception
  });
});
/*
## 'unhandledRejection'
-- handle all the promise rejection in the process
-- unhandledRejectionはPromiseがrejectされた時にいつでも発行される。
-- 普通はpromise.catch()とかasync/awaitだとtry-catchでキャッチされるが、どこにもキャッチされなかった場合に呼ばれる。
-- どのpromiseでrejectされたのかを追跡する（try-catchを入れ忘れている箇所の特定）のに役立つ。
*/

// config for Heroku server
// Heroku server shuts down the application every 24 hours by sending a signal.
// SIGTERM is a signal that is used to cause a program to stop running.
process.on('SIGTERM', () => {
  console.log('👏 SIGTERM received. Shutting down gracefully...');
  // handle the currently pending request before closing the server -> avoid abrupt shut down
  server.close(() => {
    console.log('💥 Process terminated!');
  });
  // do not need process.exit() manually because SIGTERM itself will cause the application to shut down
});
