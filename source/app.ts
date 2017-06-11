import * as express from 'express';
var path = require('path');
var favicon = require('serve-favicon');
import * as logger from 'morgan';
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
import * as moment from 'moment';

import * as Config from './config';

var app = express();

app.set('views', path.join(__dirname, '../views'));
app.set('view engine', 'jade');

logger.token('datelocaldebug', (req, res) => { return moment().format('D/M HH:mm:ss'); });
app.use(logger(':remote-addr :remote-user [:datelocaldebug] ":method :status :url HTTP/:http-version" :response-time ms :res[content-length]'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

app.use(express.static(Config.Configuration.webpageFolder));
app.use(Config.InitializeRoutes());

app.use('/*', express.static(path.join(Config.Configuration.webpageFolder, 'index.html')));

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = {};
  console.error(err);

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
export { app };
