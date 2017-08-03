import * as express from 'express';
import * as path from 'path';
var favicon = require('serve-favicon');
import * as logger from 'morgan';
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
import * as moment from 'moment';
import * as fs from 'fs';
import * as fileUpload from 'express-fileupload';

import * as Config from './config';

var app = express();

app.set('views', path.join(__dirname, '../views'));
app.set('view engine', 'pug');

logger.token('datelocaldebug', (req, res) => { return moment().format('D/M HH:mm:ss'); });
app.use(logger(':remote-addr :remote-user [:datelocaldebug] ":method :status :url HTTP/:http-version" :response-time ms :res[content-length]'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(fileUpload({
    safeFileNames: true, preserveExtension: 20,
    limits: { fileSize: 1024 * 1024 * 10 }
}));

app.use(express.static(Config.Configuration.webpageFolder));
app.use(Config.InitializeRoutes());

// Special case
app.use('/random', (req, res) => {
    let images = Config.getAllPossibleImages();
    res.render('random', { url: Config.Configuration.websiteUrl, image: images[Math.floor(Math.random() * images.length)] });
});
app.post('/api/upload', (req, res) => {
    if (!req['files']) {
        return res.status(400);
    }
    req['files'].file.mv(path.join('C:/Users/Joakim/Pictures/User Uploads', req['files'].file.name), (err) => {
        if (err) { return console.log(err); }
        console.log('File ' + req['files'].file.name + ' uploaded.');
    });
    res.sendStatus(200);
});

// Default to Angular page
app.get('/*', (req, res) => {
    res.sendFile(path.join(Config.Configuration.webpageFolder, 'index.html'));
});

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    next(err);
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

module.exports = app;
export { app };
