import * as RetrieveImages from './route-generators/api/retrieve-images';
import * as express from 'express';
var router = express.Router();
import * as fs from 'fs';
import 'reflect-metadata';
import * as ClassValidator from 'class-validator';
import * as ClassTransformer from 'class-transformer';
import * as util from 'util';

namespace ConfigFormat {
    export class Base {
        @ClassValidator.IsDefined()
        webpageFolder: string;
        @ClassValidator.IsDefined()        
        @ClassValidator.ValidateNested()
        @ClassTransformer.Type(() => ImageFolder)
        imageFolders: ImageFolder[];
    }
    export class ImageFolder {
        @ClassValidator.IsDefined()
        directory: string;
        @ClassValidator.IsDefined()
        route: string;
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

export function InitializeRoutes(): express.Router {
    configuration.imageFolders.forEach((val) => {
        let apiRoute = '/api/' + val.route, staticRoute = '/static/' + val.route
        router.use(RetrieveImages.CreateImageRoute(apiRoute, staticRoute, () =>{
            return fs.readdirSync(val.directory);
        }));
        router.use(staticRoute, express.static(val.directory));
    });
    return router;
}