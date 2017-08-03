import * as RetrieveImages from './route-generators/api/retrieve-images';
import * as express from 'express';
import * as Router from 'express-promise-router';
import * as fs from 'fs';
import 'reflect-metadata';
import * as ClassValidator from 'class-validator';
import * as ClassTransformer from 'class-transformer';
import * as util from 'util';
import * as path from 'path';
import * as crypto from 'crypto';
import * as pug from 'pug';

// Configuration file read and validation
namespace ConfigFormat {
    export class Base {
        @ClassValidator.IsDefined()
        webpageFolder: string;
        @ClassValidator.IsDefined()
        websiteUrl: string;
        @ClassValidator.IsDefined()
        @ClassValidator.ValidateNested()
        @ClassTransformer.Type(() => DBConnect)
        dbConnect: DBConnect;
    }
    export class DBConnect {
        @ClassValidator.IsDefined()
        host: string;
        @ClassValidator.IsDefined()
        user: string;
        @ClassValidator.IsDefined()
        password: string;
        @ClassValidator.IsDefined()
        database: string;
        @ClassValidator.IsDefined()
        port: number;
    }
}
var configuration: ConfigFormat.Base, configFile;
try {
    configFile = fs.readFileSync(process.env.CONFIG_FILE || 'webserver-configuration.json', 'utf8');
}
catch (ex) {
    console.error(ex.message);
    process.exit();
}
let configurationPlain = JSON.parse(configFile);
configuration = ClassTransformer.plainToClass<ConfigFormat.Base, object>(ConfigFormat.Base, configurationPlain);
let errors = ClassValidator.validateSync(configuration)
if (errors.length > 0) {
    console.error("JSON validation failed. Errors: ", util.inspect(errors, { depth: null} ));
    process.exit();
}
export { configuration as Configuration };

// Image parsing stuff

export function isImage(file: string): boolean {
    return fileType(file) === 'image';
}
export function fileType(file: string): string {
    let ret: string;
    let ext: string = path.extname(file);
    switch (ext) {
        case '.webm':
        case '.mp4':
            ret = 'video';
            break;

        default:
            ret = 'image';
            break;
    }
    return ret;
}

// Route stuff

import * as db from './db/index';

let allRoutesImages: (() => string[])[] = [];

async function getRoute(route) {
    const { rows } = await db.query(
        "SELECT directory FROM routes WHERE route = $1",
        [route]
    );
    
    if (rows)
        return rows[0];
    else
        return null;
}
async function getRouteWithFlags(route) {
    const { rows } = await db.query(
        "SELECT * FROM routes INNER JOIN route_flags ON route_flags.route = routes.route WHERE routes.route = $1",
        [route]
    );
                                
    if (rows)
        return rows[0];
    else
        return null;
}

function getImagesWithStaticRouteFromDir(directory, staticRoute): string[] {
    return fs.readdirSync(directory).filter((f) => isImage(f)).
        map((m) => (staticRoute + '/' + m));
}

function getRandomIndexMeta(image) {
    let index = fs.readFileSync(path.join(configuration.webpageFolder, 'index.html'), 'utf8');
    return index.replace('<meta name="prerender">', pug.renderFile('./views/random-prerender.pug', { image: image }));
}
function getUploadIndexMeta(image) {
    let index = fs.readFileSync(path.join(configuration.webpageFolder, 'index.html'), 'utf8');
    return index.replace('<meta name="prerender">', pug.renderFile('./views/upload-prerender.pug', { image: image }));
}

function getRandomImage(directory, route) {
    let images = getImagesWithStaticRouteFromDir(directory, '/static/' + route);
    return images[Math.floor(Math.random() * images.length)];
}

export function InitializeRoutes(): express.Router {
    let router = new Router();

    
    router.use('/static/:route', async (req, res, next) => {
        let row = await getRoute(req.params.route);
        if (!row)
            return next();

        return express.static(row.directory)(req, res, next);
    });

    router.use('/random/:route', async (req, res, next) => {
        let row = await getRoute(req.params.route);
        if (!row) 
            return next();

        let image = getRandomImage(row.directory, req.params.route);
        return res.send(getRandomIndexMeta(image));
        // return res.render('random', { image: images[Math.floor(Math.random() * images.length)]});
    });

    class returnDataFormat {
        id: string;
        fullpath: string;
        type: string;
    }
    class returnJSONFormat {
        data: returnDataFormat[] = [];
    }

    router.use('/api/:route', async (req, res, next) => {
        let row = await getRoute(req.params.route);
        if (!row) 
            return next();

        let files: string[] = fs.readdirSync(row.directory);
        var ret: returnJSONFormat = new returnJSONFormat();
        for (let i = 0; i < 9; i++) {
            let fileName: string = files[Math.floor(Math.random() * files.length)];
            let filetype: string = fileType(fileName);
            ret.data.push({
                id: fileName,
                fullpath: '/static/' + req.params.route + '/' + fileName,
                type: filetype
            });
        }
        res.json(ret);
    });

    router.get('/upload/:route', async (req, res, next) => {
        let row = await getRouteWithFlags(req.params.route);
        if (!row)
            return next();

        if (!row.accepts_uploads)
            return next();

        let image = getRandomImage(row.directory, req.params.route);
        return res.send(getUploadIndexMeta(image));
    });
    router.post('/upload/:route', async (req, res, next) => {
        let row = await getRouteWithFlags(req.params.route);
        if (!row)
            return next();

        if (!row.accepts_uploads)
            return next();

        if (!req['files']) {
            return res.status(400);
        }
        let file = req['files'].file;
        const hash = crypto.createHash('sha256');
        hash.update(file.data.toString());
        let fileExt = path.extname(file.name);
        let fileName = hash.digest('hex') + fileExt;
        let filePath = path.join(row.directory, fileName);
        if (!fs.existsSync(filePath)) {
            req['files'].file.mv(filePath, (err) => {
                if (err) { return console.log(err); }
                console.log('File ' + req['files'].file.name + ' uploaded.');
            });
        }
        else {
            console.log('File ' + fileName + ' is a duplicate. Ignoring.');
        }
        res.sendStatus(200);
    });

    return router;
}

export function getAllPossibleImages(): string[] {
    let ret: string[] = [];
    allRoutesImages.forEach((val) => {
        ret = ret.concat(val());
    });
    return ret;
}