import { AngleType, ChannelType, DEFAULT_CATEGORY_NAME, DimensionType, SizeType } from "../constants.js";
import { Data } from "../data_structs.js";
import { IdUtil } from "./id_util.js";
import { PathUtil } from "./path_util.js";
import { ValUtil } from "./value_util.js";
import { VectorUtil } from "./vector_util.js";

export let DataUtil = function () {
    function numToColor(num) {
        return "#" + Math.round(num).toString(16).padStart(6, "0");
    }

    function rgbToHex(r, g, b) {
        return "#" +
            r.toString(16).padStart(2, "0") +
            g.toString(16).padStart(2, "0") +
            b.toString(16).padStart(2, "0");
    }

    function rgbaToHex(r, g, b, a) {
        return "#" +
            r.toString(16).padStart(2, "0") +
            g.toString(16).padStart(2, "0") +
            b.toString(16).padStart(2, "0") +
            a.toString(16).padStart(2, "0");
    }

    function hexToRGBA(hex) {
        if (hex.length != 7 && hex.length != 9) { console.error("invalid hex", hex); return { r: 0, g: 0, b: 0, a: 0 } };
        let r = parseInt(hex.slice(1, 3), 16);
        let g = parseInt(hex.slice(3, 5), 16);
        let b = parseInt(hex.slice(5, 7), 16);
        let a = hex.length == 9 ? parseInt(hex.slice(7, 9), 16) : parseInt("FF", 16);

        return { r, g, b, a };
    }

    function closestColor(color, colorList) {
        let closestDist = colorDist(color, colorList[0]);
        let closestColor = colorList[0];
        for (const c of colorList) {
            let dist = colorDist(c, color);
            if (dist < closestDist) {
                closestDist = dist;
                closestColor = c;
            }
        }
        return closestColor;
    }

    function colorDist(c1, c2) {
        let rgba1 = DataUtil.hexToRGBA(c1);
        let rgba2 = DataUtil.hexToRGBA(c2);
        if (rgba1.a == 0 && rgba2.a == 0) return 0;
        // if only one is 0 and the other isn't, then they are the worst match. 
        if (rgba1.a == 0 || rgba2.a == 0) return Infinity;
        let rDiff = rgba1.r - rgba2.r;
        let gDiff = rgba1.g - rgba2.g;
        let bDiff = rgba1.b - rgba2.b;

        let vector = [Math.pow(rDiff, 4), Math.pow(gDiff, 4), Math.pow(bDiff, 4)]
        return Math.pow(vector.reduce((s, v) => s + v, 0), 1 / 4);
    }

    function imageDataToHex(imgData) {
        return "#" +
            imgData.data[0].toString(16).padStart(2, "0") +
            imgData.data[1].toString(16).padStart(2, "0") +
            imgData.data[2].toString(16).padStart(2, "0");
    }

    function getBoundingBox(objs) {
        // if it's not an array assume it's a single instance and carry forward.
        if (!Array.isArray(objs)) {
            objs = [objs];
        }

        let boundingBoxes;
        if (objs.every(o => o instanceof Data.Stroke)) {
            boundingBoxes = objs.map(stroke => {
                let bb = PathUtil.getBoundingBox(stroke.path);

                bb.x -= stroke.size / 2
                bb.y -= stroke.size / 2
                bb.height += stroke.size
                bb.width += stroke.size

                return bb;
            });
        } else if (objs.every(o => o instanceof Data.Element)) {
            boundingBoxes = objs.map(elem => {
                let bb = getBoundingBox(elem.strokes);
                return bb;
            });
        } else {
            console.error("Invalid array. Not a set of Elements or Strokes", objs);
            return { x: 0, y: 0, height: 1, width: 1 };
        }

        if (boundingBoxes.length == 0) {
            console.error("No valid elements to bound. ", objs);
            return null;
        }

        let x = Math.min(...boundingBoxes.map(b => b.x));
        let y = Math.min(...boundingBoxes.map(b => b.y));
        let xMax = Math.max(...boundingBoxes.map(b => b.x + b.width));
        let yMax = Math.max(...boundingBoxes.map(b => b.y + b.height));

        return { x, y, width: xMax - x, height: yMax - y, }
    }

    function overlap(bb1, bb2, tollerance = 0) {
        tollerance /= 2;
        bb1 = { x: bb1.x - tollerance, y: bb1.y - tollerance, height: bb1.height + tollerance, width: bb1.width + tollerance }
        bb2 = { x: bb2.x - tollerance, y: bb2.y - tollerance, height: bb2.height + tollerance, width: bb2.width + tollerance }
        let overlap1D = (min1, max1, min2, max2) => max1 >= min2 && max2 >= min1;
        return overlap1D(bb1.x, bb1.x + bb1.width, bb2.x, bb2.x + bb2.width) &&
            overlap1D(bb1.y, bb1.y + bb1.height, bb2.y, bb2.y + bb2.height);
    }

    function getDifferenceMetric(bb1, bb2) {
        let corners = [bb1, bb2].map(bb => {
            return [
                { x: bb.x, y: bb.y },
                { x: bb.x + bb.width, y: bb.y },
                { x: bb.x, y: bb.y + bb.height },
                { x: bb.x + bb.width, y: bb.y + bb.height },
            ]
        })
        let distMetric = 0
        for (let i = 0; i < 4; i++) {
            let d = VectorUtil.dist(corners[0][i], corners[1][i]);
            distMetric += d * d;
        }
        return distMetric;
    }

    function isDecendant(acestorId, decendantId, model) {
        let parentId = decendantId;
        while (parentId) {
            parentId = model.getElement(parentId).parentId;
            if (parentId == acestorId) {
                return true;
            }
        }
        return false;
    }

    function unique(arr) {
        if (arr.length == 0) return arr;
        if (arr[0].id) {
            return [...new Map(arr.map(item =>
                [item.id, item])).values()];
        } else {
            return [...new Map(arr.map(item =>
                [item, item])).values()];
        }
    }

    function findEmptyPlace(boundingBox, boundingBoxes) {
        function check(x, y) {
            if (boundingBoxes.some(b => overlap(b, {
                x: boundingBox.x + boundingBox.width * x,
                y: boundingBox.y + boundingBox.height * y,
                width: boundingBox.width,
                height: boundingBox.height,
            }))) {
                return null;
            } else {
                return {
                    x: boundingBox.x + boundingBox.width * x,
                    y: boundingBox.y + boundingBox.height * y
                }
            }
        }
        let location = check(0, 0);
        let round = 1;
        while (!location) {
            for (let n = 0; n <= round; n++) {
                location = location || check(n, round);
                location = location || check(n, -round);
                location = location || check(-n, round);
                location = location || check(-n, -round);
                if (n != round) {
                    location = location || check(round, n);
                    location = location || check(-round, n);
                    location = location || check(round, -n);
                    location = location || check(-round, -n);
                }
            }
            round++;
        }
        return location;
    }

    function getStrokesInLocalCoords(element) {
        let returnable = [];
        element.strokes.forEach(stroke => {
            stroke = stroke.clone();
            stroke.path = PathUtil.translate(stroke.path, element);
            returnable.push(stroke);
        });
        return returnable;
    }

    function channelIsDiscrete(channelType) {
        return channelType == ChannelType.SHAPE || channelType == ChannelType.COLOR || channelType == ChannelType.LABEL;
    }

    function channelIsContinuous(channelType) {
        return channelType == ChannelType.POSITION || channelType == ChannelType.SIZE || channelType == ChannelType.ANGLE;
    }

    function isDefaultLabel(dimensionName, labelName) {
        return labelName.startsWith(dimensionName) && !isNaN(parseInt(labelName.split(dimensionName)[1])) ||
            labelName.startsWith(DEFAULT_CATEGORY_NAME) && !isNaN(parseInt(labelName.split(DEFAULT_CATEGORY_NAME)[1]));
    }

    function getDefaultLabelIndex(dimentionName, labelName) {
        if (!isDefaultLabel(dimentionName, labelName)) return 0;
        if (labelName.startsWith(DEFAULT_CATEGORY_NAME)) dimentionName = DEFAULT_CATEGORY_NAME;
        return parseInt(labelName.split(dimentionName)[1]);
    }

    function getNextDefaultName(nameRoot, names) {
        return nameRoot + (Math.max(0, ...names
            .map(name => DataUtil.isDefaultLabel(nameRoot, name) ? DataUtil.getDefaultLabelIndex(nameRoot, name) : 0)
            .filter(n => !isNaN(n))) + 1)
    }

    function getPaddedPoints(nodes, padding) {
        let pointArr = [];
        nodes.forEach(d => {
            const pad = d.radius + padding;
            pointArr = pointArr.concat([
                [d.x - pad, d.y - pad],
                [d.x - pad, d.y + pad],
                [d.x + pad, d.y - pad],
                [d.x + pad, d.y + pad]
            ]);
        });
        return pointArr;
    }

    function domainIsValid(domain) {
        if (isDomainNumeric(domain[0]) && isDomainNumeric(domain[1])) return true;
        return false;
    }

    function isNumeric(str) {
        if (typeof str == "number") return true;
        if (typeof str != "string") return false;
        return !isNaN(str) && !isNaN(parseFloat(str));
    }

    function isDomainNumeric(str) {
        if (typeof str == "number") return true;
        if (typeof str != "string") return false;
        if (str.includes(':')) {
            return isNumeric(str.split(':')[0]) && isNumeric(str.split(':')[1]);
        }
        return isNumeric(str);
    }

    function isDateLike(dateStr) {
        return !isNaN(new Date(dateStr));
    }

    function angleToPercent(angle) {
        return (angle + Math.PI) / (Math.PI * 2);
    }

    function percentToAngle(percent) {
        return (percent * (Math.PI * 2)) - Math.PI;
    }

    function getRelativeAngle(element, parent) {
        let tangent;
        if (parent) {
            tangent = PathUtil.getTangentForPercent(parent.spine, PathUtil.getClosestPointOnPath(element.root, parent.spine).percent);
        } else {
            tangent = { x: 1, y: 0 };
        }

        let angle = Math.atan2(element.angle.y, element.angle.x) - Math.atan2(tangent.y, tangent.x);
        if (angle > Math.PI) {
            angle -= 2 * Math.PI;
        } else if (angle <= -Math.PI) {
            angle += 2 * Math.PI;
        }

        return angle;
    }

    function getStraightenedStrokes(element) {
        let rotation = VectorUtil.toRadiens(element.angle);
        let straight = VectorUtil.toRadiens({ x: 0, y: -1 });
        return element.strokes.map(s => {
            s = s.clone();
            s.path = s.path.map(p => VectorUtil.rotateAroundPoint(p, element.root, rotation - straight));
            return s;
        })
    }

    function getStupidSpine(element) {
        if (element.strokes.length == 1) {
            return element.strokes[0].path;
        }

        let longAxis = getLongestAxis(element);
        let projectionData = [{ t: 0, offset: { x: 0, y: 0 } }, { t: 1, offset: { x: 0, y: 0 } }]
        element.strokes.forEach(stroke => stroke.path.forEach(point => {
            let projection = VectorUtil.projectToLine(point, longAxis[0], longAxis[1]);
            projectionData.push({ t: projection.t, offset: VectorUtil.subtract(point, projection) });
        }))
        let len = VectorUtil.dist(longAxis[1], longAxis[0]);
        let lineVector = VectorUtil.subtract(longAxis[1], longAxis[0]);
        let result = [longAxis[0]];
        let interval = len / 7
        for (let i = interval; i < len; i += interval) {
            let t1 = (i - interval / 2) / len;
            let t2 = (i + interval / 2) / len;
            let offsets = projectionData.filter(p => t1 <= p.t && p.t <= t2);
            if (offsets.length > 0) {
                let avgOffset = offsets.reduce((sum, { offset }) => {
                    sum.x += offset.x;
                    sum.y += offset.y;
                    return sum;
                }, { x: 0, y: 0 });
                avgOffset.x /= offsets.length;
                avgOffset.y /= offsets.length;
                let pointAtT = VectorUtil.add(VectorUtil.scale(lineVector, i / len), longAxis[0]);
                result.push(VectorUtil.add(pointAtT, avgOffset));
            }
        }
        result.push(longAxis[1]);
        return result;
    }

    function getLongestAxis(element) {
        let points = element.strokes.map(s => s.path).flat();
        let yMax = points.reduce((prev, current) => (prev.y > current.y) ? prev : current);
        let yMix = points.reduce((prev, current) => (prev.y < current.y) ? prev : current);
        let xMax = points.reduce((prev, current) => (prev.x > current.x) ? prev : current);
        let xMin = points.reduce((prev, current) => (prev.x < current.x) ? prev : current);
        points = [yMax, yMix, xMax, xMin];
        let pairs = points.flatMap((v, i) => points.slice(i + 1).map(w => [v, w]));
        let dists = pairs.map(pair => VectorUtil.dist(pair[0], pair[1]));
        return pairs[dists.findIndex(i => i == Math.max(...dists))];
    }

    function boundingBoxIntersects(bb1, bb2) {
        return !(bb2.x > bb1.x + bb1.width ||
            bb2.x + bb2.width < bb1.x ||
            bb2.y > bb1.y + bb1.height ||
            bb2.y + bb2.height < bb1.y);
    }

    function isDataId(id) {
        if (!id) return false;
        let result = false;
        Object.values(Data).forEach(dataClass => {
            result = result || IdUtil.isType(id, dataClass);
        });
        return result
    }

    function itemExists(id, model) {
        if (IdUtil.isType(id, Data.Stroke)) {
            return model.getStroke(id) ? true : false;
        } else if (IdUtil.isType(id, Data.Element)) {
            return model.getElement(id) ? true : false;
        } else if (IdUtil.isType(id, Data.Category)) {
            return model.getCategory(id) ? true : false;
        } else if (IdUtil.isType(id, Data.Dimension)) {
            return model.getDimension(id) ? true : false;
        } else {
            console.error("Id unsupported", id);
            return false;
        }
    }

    function dimensionTypeValid(dimension) {
        if (dimension.type == DimensionType.CONTINUOUS) {
            return channelIsContinuous(dimension.channel);
        } else {
            // all types are valid for discrete dimens
            return true;
        }
    }

    function dimensionChannelValid(dimension) {
        // same for now.
        return dimensionTypeValid(dimension);
    }

    function dimensionLevelValid(dimension) {
        if (dimension.channel == ChannelType.POSITION) {
            return dimension.level > 0;
        } else if (dimension.channel == ChannelType.ANGLE && dimension.angleType == AngleType.RELATIVE) {
            return dimension.level > 0;
        } else {
            return true;
        }
    }

    function dimensionValid(dimension) {
        return dimensionTypeValid(dimension) &&
            dimensionChannelValid(dimension) &&
            dimensionLevelValid(dimension);
    }

    function getLevelColor(level) {
        level = parseInt(level);
        return rgbToHex(255 - 20 * (level + 1), 255 - 20 * (level + 1), 255 - 20 * (level + 1));
    }

    function median(arr) {
        if (arr.length == 0) { return 0 }
        arr = [...arr].sort((a, b) => a - b);
        let half = Math.floor(arr.length / 2);
        return arr.length % 2 ? arr[half] : (arr[half - 1] + arr[half]) / 2;
    }

    function limit(num, v1, v2) {
        let min, max;
        if (v1 < v2) { min = v1; max = v2 } else { min = v2; max = v1 };
        return Math.max(Math.min(num, max), min);
    }

    function compareDimensions(d1, d2) {
        if (d1.level != d2.level) {
            return d1.level - d2.level;
        } else {
            return d1.id.localeCompare(d2.id, 'en', { numeric: true });
        }
    }

    function getSize(element, type) {
        if (type == SizeType.LENGTH) {
            return PathUtil.getPathLength(element.spine);
        } else {
            let bb = DataUtil.getBoundingBox(element);
            return bb.height * bb.width;
        }
    }

    function resizeElement(element, size, sizeType) {
        let currentSize = getSize(element, sizeType);
        let scale = size / currentSize;
        if (sizeType == SizeType.AREA) { scale = Math.sqrt(scale); }
        element.strokes.forEach(s => s.path = s.path.map(p => {
            return VectorUtil.add(VectorUtil.scale(VectorUtil.subtract(p, element.root), scale), element.root);
        }))
        element.spine = element.spine.map(p => {
            return VectorUtil.add(VectorUtil.scale(VectorUtil.subtract(p, element.root), scale), element.root);
        })
    }

    return {
        numToColor,
        rgbToHex,
        rgbaToHex,
        hexToRGBA,
        closestColor,
        colorDist,
        imageDataToHex,
        getBoundingBox,
        overlap,
        getDifferenceMetric,
        isDecendant,
        unique,
        findEmptyPlace,
        getStrokesInLocalCoords,
        channelIsDiscrete,
        channelIsContinuous,
        isDefaultLabel,
        getDefaultLabelIndex,
        getNextDefaultName,
        getPaddedPoints,
        domainIsValid,
        isNumeric,
        isDomainNumeric,
        isDateLike,
        angleToPercent,
        percentToAngle,
        getRelativeAngle,
        getStraightenedStrokes,
        getStupidSpine,
        getLongestAxis,
        boundingBoxIntersects,
        isDataId,
        itemExists,
        dimensionTypeValid,
        dimensionChannelValid,
        dimensionLevelValid,
        dimensionValid,
        getLevelColor,
        median,
        limit,
        compareDimensions,
        getSize,
        resizeElement,
    }
}();
