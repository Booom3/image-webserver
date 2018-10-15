import {Router} from 'express';
import * as path from 'path';
import * as Config from '../../config';

let router = Router();

class returnDataFormat {
    id: string;
    fullpath: string;
    type: string;
}
class returnJSONFormat {
    data: returnDataFormat[] = [];
}
export function CreateImageRoute (apiRouteName: string, staticRouteName: string,
    imageList: () => string[]): Router {
        router.get(apiRouteName, (req, res) => {
            let files: string[] = imageList();
            var ret: returnJSONFormat = new returnJSONFormat();
            for (let i = 0; i < 9; i++) {
                let fileName: string = files[Math.floor(Math.random() * files.length)];
                let filetype: string = Config.fileType(fileName);
                ret.data.push({
                    id: fileName,
                    fullpath: staticRouteName + '/' + fileName,
                    type: filetype
                });
            }
            res.json(ret);
    });
    return router;
}