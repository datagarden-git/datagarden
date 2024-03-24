import fs from 'fs';

import { dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));

const SCAP_FOLDER = __dirname + '/scaps/'

export async function writeScap(filename, contents) {
    try {
        fs.writeFileSync(SCAP_FOLDER + filename, contents, err => err ? console.error(err) : null);
    } catch (e) {
        console.error(e);
    }
}

export async function readOutput(filename) {
    try {
        return fs.readFileSync(SCAP_FOLDER + filename, 'utf8');
    } catch (e) {
        console.error(e);
        return "";
    }
}

export async function deleteScap(filename) {
    try {
        fs.unlinkSync(SCAP_FOLDER + filename, 'utf8');
    } catch (e) {
        console.error(e);
    }
}

export async function createScapOutFolder(folderName) {
    try {
        if (!fs.existsSync(SCAP_FOLDER + folderName)) {
            fs.mkdirSync(SCAP_FOLDER + folderName);
        }
    } catch (e) {
        console.error(e);
    }
}

export async function deleteScapOutFolder(folderName) {
    try {
        fs.rmSync(SCAP_FOLDER + folderName, { recursive: true, force: true });
    } catch (e) {
        console.error(e);
    }
}