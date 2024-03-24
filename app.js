import express from 'express';
import bodyParser from 'body-parser';
import * as utility from './server/utility.js';
import * as fileHandler from './server/file_handler.js';
import * as cppConnector from './server/cpp_connector.js';
import * as config from "./app_config.js";

import { dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
// Required to send and recieve JSON
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }));

let mIdMap = new utility.IdMap();

utility.log("************* Starting the server *************")

const port = 3333;

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/local/index.html');
});

// Everything in the local folder can be accessed via /filename
app.use('/', express.static(__dirname + '/local'));

/************************
 *  Fairy module requests  *
 ************************/
app.post('/getspine', function (req, res) {
    let element = req.body;
    if (!element.strokes) {
        res.status(400).send("Error! Invalid element provided!");
        return;
    }

    let scap = utility.elementToSpineScap(element);
    let filename = element.id + ".scap";
    let outFoldername = element.id;
    let outFile = outFoldername + "/" + element.id + "_fit.scap";

    fileHandler.writeScap(filename, scap)
        .then(() => fileHandler.createScapOutFolder(outFoldername))
        .then(() => cppConnector.runStrokeStrip(filename, outFoldername))
        .then(() => fileHandler.readOutput(outFile))
        .then(outScap => {
            let path = utility.scapToPath(outScap, utility.elementTopCorner(element));
            res.status(200).send(path);
        }).catch(error => {
            console.error(error);
            res.status(500).send();
        }).then(() => {
            if (!config.DEBUG) {
                fileHandler.deleteScap(filename);
                fileHandler.deleteScapOutFolder(outFoldername);
            }
        });
});

// Start the application
app.listen(port);
