import { spawn } from 'child_process'
import * as utility from "./utility.js"
import * as config from "../app_config.js"

import { dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));

export function runStrokeStrip(scapFilename, outFolder) {
    return new Promise((resolve) => {
        utility.log("Spinning up StrokeStrip");
        try {
            const cpp = spawn(config.STROKE_STRIP_EXE, ["-i", __dirname + "/scaps/" + scapFilename, "-o", __dirname + "/scaps/" + outFolder + "/"]);

            // collect output from console
            cpp.stdout.on('data', function (data) {
                text = data.toString();
                lines = text.split(/\r?\n/)
                lines.forEach(line => {
                    utility.log(line);
                })
            });

            // collect the error messages
            cpp.stderr.on('data', function (data) {
                utility.log("cpp script encountered an error: ");
                utility.log(data.toString());
            })

            // all done, return value. 
            cpp.on('close', (code) => {
                utility.log("Strokestrip script completed with exit code " + code);
                resolve();
            });

            cpp.on("error", function (error) {
                console.error(error)
            })

            cpp.on("exit", function () {
                utility.log("Strokestrip finished.")
                resolve();
            })
        } catch (e) {
            console.error(e);
            resolve();
        }
    })
}

export function runStripMaker(scapFilename) {
    return new Promise(resolve => {
        utility.log("Spinning up StripMaker");
        try {
            const cpp = spawn(config.STRIP_MAKER_EXE, ["-i", __dirname + "/scaps/" + scapFilename, "-o", __dirname + "/scaps"]);

            // collect output from console
            cpp.stdout.on('data', function (data) {
                text = data.toString();
                lines = text.split(/\r?\n/)
                lines.forEach(line => {
                    utility.log(line);
                })
            });

            // collect the error messages
            cpp.stderr.on('data', function (data) {
                utility.log("cpp script encountered an error: ");
                utility.log(data.toString());
            })

            // all done, return value. 
            cpp.on('close', (code) => {
                utility.log("StripMaker script completed with exit code " + code);
                resolve();
            });

            cpp.on("error", function (error) {
                console.error(error)
            })

            cpp.on("exit", function () {
                resolve();
                utility.log("StripMaker finished.")
            })
        } catch (e) {
            console.error(e);
            resolve();
        }
    })
}