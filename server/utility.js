import os from 'os';

export function elementToSpineScap(element) {
    let scap = "";
    let ids = 0;

    let topCorner = elementTopCorner(element);

    let width = Math.max(...element.strokes.map(s => s.path.map(p => p.x)).flat()) - topCorner.x;
    let height = Math.max(...element.strokes.map(s => s.path.map(p => p.y)).flat()) - topCorner.y;
    let size = element.strokes.map(s => s.size).reduce((a, b) => a + b, 0) / element.strokes.length;

    scap += "#" + Math.round(width) + "\t" + Math.round(height) + os.EOL;
    scap += "@" + size + os.EOL;

    element.strokes.forEach(stroke => {
        scap += "{" + os.EOL;
        scap += "\t#" + (++ids)
            + "\t" + "0" + os.EOL; // The group id has to start at 0 otherwise stroke strip doesn't work.
        stroke.path.forEach(p => {
            scap += "\t" + (p.x - topCorner.x) + "\t" + (p.y - topCorner.y) + "\t0" + os.EOL;
        })
        scap += "}" + os.EOL;
    })
    return scap;
}

export function elementsToScap(elements, idMap) {
    let strokes = elements.map(e => e.strokes).flat();
    let width = Math.max(...strokes.map(s => s.path.map(p => p.x)).flat());
    let height = Math.max(...strokes.map(s => s.path.map(p => p.y)).flat());
    let size = strokes.map(s => s.size).reduce((a, b) => a + b, 0) / strokes.length;
    let data = elements.map(e => e.strokes.map(s => {
        return {
            elementId: e.id,
            strokeId: s.id,
            path: samplePath(s.path, 5),
            creationTime: s.creationTime,
        }
    })).flat().sort((a, b) => a.creationTime - b.creationTime);

    let scap = "";
    scap += "#" + Math.round(width) + "\t" + Math.round(height) + os.EOL;
    scap += "@" + size + os.EOL;

    data.forEach(item => {
        scap += "{" + os.EOL;
        scap += "\t#" + idMap.getMapping(item.strokeId) + "\t" + idMap.getMapping(item.elementId) + os.EOL;
        item.path.forEach(p => {
            scap += "\t" + p.x + "\t" + p.y + "\t0" + os.EOL;
        })
        scap += "}" + os.EOL;
    })
    return scap;
}

export function elementTopCorner(element) {
    return element.strokes.map(s => s.path).flat().reduce((curr, point) => {
        if (point.x < curr.x) curr.x = point.x;
        if (point.y < curr.y) curr.y = point.y;
        return curr;
    }, { x: Infinity, y: Infinity });
}


function samplePath(path, sampleRate) {
    let result = []
    for (let i = 0; i < path.length - 1; i += sampleRate) {
        result.push(path[i])
    }
    result.push(path[path.length - 1]);
    return result;
}

export function scapToPath(scap, topCorner) {
    let lines = scap.split("{")[1].split("}")[0].split(os.EOL);
    return lines.slice(1, lines.length).map(line => {
        let x = line.split("\t")[1];
        let y = line.split("\t")[2];
        return { x: parseFloat(x) + topCorner.x, y: parseFloat(y) + topCorner.y };
    }).filter(p => !isNaN(p.x) && !isNaN(p.y));
}

export function svgToPath(svg) {
    let values = svg.split("d=")[1].split("/>")[0].split(" ");
    let path = [];
    for (let i = 0; i < values.length; i += 3) {
        let x = parseFloat(values[i + 1]);
        let y = parseFloat(values[i + 2]);
        if (!isNaN(x) && !isNaN(y)) {
            path.push({ x, y })
        }
    }
    return path;
}

export function alignSVGPath(path, element) {
    let elementPoints = element.strokes.map(s => s.path).flat();
    let elementTopCorner = elementPoints.reduce((curr, point) => {
        if (point.x < curr.x) curr.x = point.x;
        if (point.y < curr.y) curr.y = point.y;
        return curr;
    }, { x: Infinity, y: Infinity });
    let elementBottomCorner = elementPoints.reduce((curr, point) => {
        if (point.x > curr.x) curr.x = point.x;
        if (point.y > curr.y) curr.y = point.y;
        return curr;
    }, { x: -Infinity, y: -Infinity });

    let elementCenter = {
        x: (elementTopCorner.x + elementBottomCorner.x) / 2,
        y: (elementTopCorner.y + elementBottomCorner.y) / 2,
    }

    return path.map(p => {
        return {
            x: p.x + elementCenter.x,
            y: p.y + elementCenter.y,
        };
    })
}

export function scapToMerge(scap, idMap) {
    let tags = scap.split("{" + os.EOL).slice(1).map(stroke => {
        return stroke.split(os.EOL)[0].split("\t").slice(1);
    })
    let groups = {};
    tags.forEach(tag => {
        if (!groups[tag[1]]) groups[tag[1]] = [];
        groups[tag[1]].push(idMap.getId(tag[0].substring(1)))
    })
    return Object.values(groups);
}

export function log() {
    (console).log(...arguments);
}

export function IdMap() {
    let counter = 0;
    let map = {};
    let reverseMap = {};
    this.getMapping = function (id) {
        if (!map[id]) {
            let mapping = counter++
            map[id] = mapping;
            reverseMap[mapping] = id;
        }
        return map[id];
    }
    this.getId = function (mapping) {
        return reverseMap[mapping];
    }
}