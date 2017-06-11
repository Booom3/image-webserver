import * as express from 'express';
var router = express.Router();
import * as path from 'path';

class returnDataFormat {
    id: string;
    fullpath: string;
    type: string;
}
class returnJSONFormat {
    data: returnDataFormat[] = [];
}
export function CreateImageRoute (apiRouteName: string, staticRouteName: string,
    imageList: () => string[]): express.Router {
        router.get(apiRouteName, (req, res) => {
            let files: string[] = imageList();
            var ret: returnJSONFormat = new returnJSONFormat();
            for (let i = 0; i < 9; i++) {
                let fileName: string = files[Math.floor(Math.random() * files.length)];
                let ext: string = path.extname(fileName);
                let filetype: string;
                switch (ext) {
                    case '.webm':
                    case '.mp4':
                        filetype = 'video';
                        break;

                    default:
                        filetype = 'image';
                        break;
                }
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