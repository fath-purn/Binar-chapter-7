require('dotenv').config();

const Sentry = require("@sentry/node");
const { ProfilingIntegration } = require("@sentry/profiling-node");
const express = require("express");
const morgan = require('morgan');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const {PORT = 3000, SENTRI_DSN} = process.env;

app.use(morgan('dev'));
app.use(express.json());
app.set('view engine', 'ejs');

io.on('connection', (socket) => {
  console.log('a user connected');
});

Sentry.init({
  dsn: SENTRI_DSN,
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.Express({ app }),
    new ProfilingIntegration(),
  ],
  tracesSampleRate: 1.0,
  profilesSampleRate: 1.0,
});

app.use(Sentry.Handlers.requestHandler());

app.use(Sentry.Handlers.tracingHandler());

const userRouter = require('./routes/user.routes');
app.use('/', userRouter);

const authRouter = require('./routes/auth.routes');
app.use('/api/v1/auth', authRouter);

app.use(Sentry.Handlers.errorHandler());

app.use(function onError(err, req, res, next) {
  res.statusCode = 500;
  res.end(res.sentry + "\n");
});

app.listen(PORT, () => console.log(`Example app listening on port ${PORT}!`));
module.exports.io = io;