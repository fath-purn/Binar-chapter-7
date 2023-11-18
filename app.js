require('dotenv').config();

// You can also use CommonJS `require('@sentry/node')` instead of `import`
const Sentry = require("@sentry/node");
const { ProfilingIntegration } = require("@sentry/profiling-node");
const express = require("express");
const morgan = require('morgan');
const {PORT = 3000, SENTRI_DSN} = process.env;

const app = express();

app.use(morgan('dev'));
app.use(express.json());
app.set('view engine', 'ejs');

Sentry.init({
  dsn: SENTRI_DSN,
  integrations: [
    // enable HTTP calls tracing
    new Sentry.Integrations.Http({ tracing: true }),
    // enable Express.js middleware tracing
    new Sentry.Integrations.Express({ app }),
    new ProfilingIntegration(),
  ],
  // Performance Monitoring
  tracesSampleRate: 1.0,
  // Set sampling rate for profiling - this is relative to tracesSampleRate
  profilesSampleRate: 1.0,
});

// The request handler must be the first middleware on the app
app.use(Sentry.Handlers.requestHandler());

// TracingHandler creates a trace for every incoming request
app.use(Sentry.Handlers.tracingHandler());

app.get('/', (req, res, next) => {
  res.render('templates/activation-email', { name: 'Joko', url: 'https://google.com' });
});

const authRouter = require('./routes/auth.routes');
app.use('/api/v1/auth', authRouter);


// The error handler must be registered before any other error middleware and after all controllers
app.use(Sentry.Handlers.errorHandler());

// Optional fallthrough error handler
app.use(function onError(err, req, res, next) {
  // The error id is attached to `res.sentry` to be returned
  // and optionally displayed to the user for support.
  res.statusCode = 500;
  res.end(res.sentry + "\n");
});

app.listen(PORT, () => console.log(`Example app listening on port ${PORT}!`));