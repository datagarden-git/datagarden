
import { createCanvas as createCan } from 'canvas';
import fs from 'fs';
const RUN = Math.random();
let fileCount = 0;

import { dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));

export function createCanvas() {
    let canvas = createCan(1, 1);
    canvas.internalGetContext = canvas.getContext;

    canvas.getContext = function (type) {
        let context = canvas.internalGetContext(type);
        context.reset = function () {
            canvas.height = canvas.height;
            canvas.width = canvas.width;
            this.setTransform(createCan(1, 1).getContext("2d").getTransform());
        };
        return context;
    }

    canvas.console = {
        log: function () {
            if (!fs.existsSync(__dirname + '/dump')) {
                fs.mkdirSync(__dirname + '/dump');
            }
            let filename = __dirname + '/dump/debug' + RUN + "_" + (fileCount++) + '.png';
            (console).log("writing: " + filename);
            const out = fs.createWriteStream(filename);
            const stream = canvas.createPNGStream();
            let data;
            while (data = stream.read()) { out.write(data); }
        }
    }

    return canvas;
}