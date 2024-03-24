import { DataUtil } from "./data_util.js";
import { OverlayUtil } from "./overlay_util.js";
import { ValUtil } from "./value_util.js";
import { VectorUtil } from "./vector_util.js";

export let PathUtil = function () {
    let cache = {};
    const PATH_PRECISION = 10; // pixels
    let mOverlayUtil = new OverlayUtil();

    function translate(points, v) {
        if (!ValUtil.isPath(points)) { console.error("Bad path", points); return points; }
        if (!ValUtil.isCoord(v)) { console.error("Bad vector", v); return points; }
        return points.map(p => {
            return {
                x: p.x + v.x,
                y: p.y + v.y
            };
        })
    }

    function getBoundingBox(paths) {
        if (!Array.isArray(paths)) {
            console.error("Bad path set", paths);
            return null
        }
        if (ValUtil.isPath(paths)) {
            paths = [paths];
        }
        paths = paths.filter(points => {
            if (ValUtil.isPath(points)) return true;
            else { console.error("Bad Path", points); return false; }
        })
        if (paths.length == 0) { console.error("No valid paths input"); return null };

        let xs = paths.map(points => points.map(point => point.x)).flat();
        let ys = paths.map(points => points.map(point => point.y)).flat();
        let x = Math.min(...xs);
        let y = Math.min(...ys);
        let width = Math.max(1, (Math.max(...xs) - x));
        let height = Math.max(1, (Math.max(...ys) - y));

        return { x, y, height, width };
    }

    function getPathLength(points) {
        let sum = 0;
        for (let i = 1; i < points.length; i++) {
            sum += VectorUtil.dist(points[i - 1], points[i]);
        }
        return sum;
    }

    function equalsPath(points1, points2) {
        if (points1.length != points2.length) return false;
        for (let i = 0; i < points1.length; i++) {
            if (points1[i].x != points2[i].x || points1[i].y != points2[i].y) return false;
        }
        return true;
    }

    function getClosestPointOnPath(coords, points) {
        if (!Array.isArray(points)) {
            console.error("Bad point array for getClosestPointOnPath: ", points);
            return { x: 0, y: 0, percent: 0, length: 0 };
        };
        if (!coords || !DataUtil.isNumeric(coords.x) || !DataUtil.isNumeric(coords.y)) {
            console.error("Bad coords", coords);
            return { x: 0, y: 0, percent: 0, length: 0 };
        }

        let metaPoints = getMetaPoints(points);

        if (metaPoints.length < 2) {
            console.error("Bad state! Should be impossible for points structures to have less than 2 points.", metaPoints);
            return { x: 0, y: 0, percent: 0, length: 0 };
        }

        let point1 = metaPoints.reduce((minData, pointData) => {
            let dist = VectorUtil.dist(coords, pointData.point);
            if (dist < minData.dist) {
                return { dist, pointData };
            } else {
                return minData;
            }
        }, { dist: Infinity }).pointData;

        // we now have 1 - 2 points to check to see which is closest;
        let point2 = (point1.index + 1) == metaPoints.length ? null : metaPoints[point1.index + 1];
        let prevPoint = point1.index == 0 ? null : metaPoints[point1.index - 1];

        if (!point2 || (prevPoint &&
            VectorUtil.dist(coords, prevPoint.point) <
            VectorUtil.dist(coords, point2.point))) {
            point2 = point1;
            point1 = prevPoint;
        }

        let pathLength = getPathLength(points);
        let projectedPoint = projectPointOntoLine(coords, point1.point, point2.point);
        let lenOnLine = VectorUtil.dist(point1.point, point2.point) * projectedPoint.percent;
        let length = lenOnLine + point1.percent * pathLength;
        let percent = length / pathLength;

        return { x: projectedPoint.x, y: projectedPoint.y, percent, length };
    }

    function getPositionForPercent(points, percent) {
        if (isNaN(percent)) { console.error("Invalid percent to get position for: ", percent); return { x: 0, y: 0 }; }
        if (!points) { console.error("Invalid point array:  ", points); return { x: 0, y: 0 }; }
        if (points.length < 2) { console.error("Invalid point array, too short: ", points); return { x: 0, y: 0 }; }

        return getPositionForPercents(points, [percent])[0];
    }

    function getPositionForPercents(points, percents) {
        if (!points) { console.error("Invalid point array:  ", points); return { x: 0, y: 0 }; }
        if (points.length < 2) { console.error("Invalid point array, too short: ", points); return { x: 0, y: 0 }; }
        percents = percents.map(percent => {
            if (isNaN(parseInt(percent))) {
                console.error("Invalid percent to batch get position for: ", percent);
                return 0;
            }
            return percent;
        })
        percents.sort();

        let returnable = [];

        let metaPoints = getMetaPoints(points);
        let metaPointIndex = 0;
        for (let percentIndex = 0; percentIndex < percents.length; percentIndex++) {
            if (percents[percentIndex] <= 0) {
                returnable.push({ x: points[0].x, y: points[0].y });
            } else if (percents[percentIndex] >= 1) {
                returnable.push({ x: points[points.length - 1].x, y: points[points.length - 1].y });
            } else {
                let afterPoint = null;
                while (metaPointIndex < metaPoints.length && percents[percentIndex] > metaPoints[metaPointIndex].percent) {
                    metaPointIndex++;
                }
                if (metaPointIndex >= metaPoints.length) {
                    console.error("Code should be unreachable", percents[percentIndex], metaPoints)
                    metaPointIndex = metaPoints.length - 1;
                }
                afterPoint = metaPoints[metaPointIndex];

                if (afterPoint.index == 0) {
                    console.error("Code should be unreachable", percents[percentIndex], afterPoint);
                    afterPoint = metaPoints[1];
                }
                let beforePoint = metaPoints[afterPoint.index - 1];

                let percentBetween = (percents[percentIndex] - beforePoint.percent) / (afterPoint.percent - beforePoint.percent);
                let x = percentBetween * (afterPoint.point.x - beforePoint.point.x) + beforePoint.point.x;
                let y = percentBetween * (afterPoint.point.y - beforePoint.point.y) + beforePoint.point.y;

                returnable.push({ x, y });
            }
        }

        return returnable;
    }

    function getNormalForPercent(points, percent) {
        if (isNaN(percent)) {
            console.error("Invalid normal percent!", percent);
            return { x: 0, y: 1 };
        }

        if (points.length < 2) throw new Error("invalid point array! Too short!", points);

        return getNormalsForPercents(points, [percent])[0];
    }

    function getNormalsForPercents(points, percents) {
        percents = percents.filter((percent) => {
            if (isNaN(percent)) {
                console.error("Invalid normal percent!", percent);
                return false;
            } return true;
        });

        if (points.length < 2) throw new Error("invalid point array! Too short!", points);

        return percents.map(percent => {
            if (percent <= 0) {
                return VectorUtil.rotateRight(
                    VectorUtil.normalize(
                        VectorUtil.subtract(points[1], points[0])));
            } else if (percent >= 1) {
                return VectorUtil.rotateRight(
                    VectorUtil.normalize(
                        VectorUtil.subtract(points[points.length - 1], points[points.length - 2])));
            } else {
                let metaPoints = getMetaPoints(points);
                let afterPoint = null;
                for (let i = 0; i < metaPoints.length; i++) {
                    if (percent < metaPoints[i].percent) {
                        afterPoint = metaPoints[i];
                        break;
                    }
                }
                if (afterPoint.index == 0) {
                    console.error("Code should be unreachable", "percent:" + percent, afterPoint);
                    afterPoint = metaPoints[1];
                }
                let beforePoint = metaPoints[afterPoint.index - 1];

                let normalPositionBefore = VectorUtil.add(beforePoint.point, beforePoint.normal);
                let normalPositionAfter = VectorUtil.add(afterPoint.point, afterPoint.normal);

                let percentBetween = (percent - beforePoint.percent) / (afterPoint.percent - beforePoint.percent);
                let x = percentBetween * (afterPoint.point.x - beforePoint.point.x) + beforePoint.point.x;
                let y = percentBetween * (afterPoint.point.y - beforePoint.point.y) + beforePoint.point.y;
                let normalX = percentBetween * (normalPositionAfter.x - normalPositionBefore.x) + normalPositionBefore.x;
                let normalY = percentBetween * (normalPositionAfter.y - normalPositionBefore.y) + normalPositionBefore.y;

                let normalVector = VectorUtil.subtract({ x: normalX, y: normalY }, { x, y });

                return VectorUtil.normalize(normalVector);
            }
        })
    }

    function getTangentForPercent(points, percent) {
        let normal = getNormalForPercent(points, percent);
        return VectorUtil.rotateLeft(normal);
    }

    function getPercentBetweenPoints(p1, p2, percent) {
        return VectorUtil.add(p1, VectorUtil.scale(VectorUtil.subtract(p2, p1), percent));
    }

    function isLineLike(points) {
        let metaPoints = getMetaPoints(points);
        let normalAngles = metaPoints.map(p => VectorUtil.toRadiens(p.normal) + Math.PI);
        let normalAnglesRotated = normalAngles.map(a => (a + Math.PI) % (2 * Math.PI));

        // if there are so few meta points, it's too short to be read as a line. 
        if (metaPoints.length < 6) return false;

        let medianNormals = [];
        let medianNormalsRotated = []
        for (let i = 2; i < normalAngles.length - 2; i++) {
            medianNormals.push(normalAngles.slice(i - 2, i + 2).sort()[2]);
            medianNormalsRotated.push(normalAnglesRotated.slice(i - 2, i + 2).sort()[2]);
        };
        let maxDiff = Math.min(Math.max(...medianNormals) - Math.min(...medianNormals), Math.max(...medianNormalsRotated) - Math.min(...medianNormalsRotated))

        return maxDiff < Math.PI;
    }

    function pathOverlaps(p1, p2) {
        let p1LineLike = PathUtil.isLineLike(p1);
        let p2LineLike = PathUtil.isLineLike(p2);
        p1 = getMetaPoints(p1).map(p => p.point);
        p2 = getMetaPoints(p2).map(p => p.point);
        if (p1LineLike && p2LineLike) {
            let closePointCount = p1.reduce((count, p) => {
                let closestPoint = getClosestPointOnPath(p, p2);
                let dist = VectorUtil.dist(closestPoint, p);
                return dist < 10 ? count + 1 : count;
            }, 0)
            return (closePointCount > p1.length / 5);
        } else {
            mOverlayUtil.onResize(
                Math.max(...p1.map(p => p.x), ...p2.map(p => p.x)),
                Math.max(...p1.map(p => p.y), ...p2.map(p => p.y))
            )
            if (p1LineLike) {
                mOverlayUtil.drawBubble(p2);
                return p1.some(p => mOverlayUtil.covered(p));
            } else {
                mOverlayUtil.drawBubble(p1);
                return p2.some(p => mOverlayUtil.covered(p));
            }
        }
    }

    function getDistanceMetric(points, line) {
        let distVal = points.map(p => {
            let projection = VectorUtil.projectToLine(p, line[0], line[1]);
            let dist = VectorUtil.dist(projection, p);
            if (projection.t < 0) projection.t = Math.abs(projection.t) + 1;
            if (projection.t > 1) {
                dist *= projection.t;
            }
            return dist * dist;
        }).reduce((sum, v) => sum + v, 0) / points.length;
        return distVal;
    }

    // UTILITY //
    function getHash(points) {
        if (!Array.isArray(points)) {
            console.error("Bad point array for getHash: ", points);
            return "";
        };

        return points.map(p => "(" + Math.round(p.x) + "," + Math.round(p.y) + ")").join(",");
    }

    function getPathData(points) {
        if (!Array.isArray(points)) {
            console.error("Bad point array for getPathData: ", points);
            return {};
        };

        let hash = getHash(points);
        if (!cache[hash]) {
            cache[hash] = { accessed: Date.now() }

            if (Object.keys(cache).length > 10) {
                // ditch the least used
                let deleteItem = Object.entries(cache).reduce((min, d) => {
                    if (d[1].accessed < min[1].accessed) {
                        return d;
                    } else {
                        return min;
                    }
                })

                delete cache[deleteItem[0]]
            }
        }
        return cache[hash]
    }

    function getMetaPoints(points) {
        let pathData = getPathData(points);
        pathData.accessed = Date.now();

        if (!pathData.metaPoints) {
            pathData.metaPoints = createMetaPoints(points);
        }

        return pathData.metaPoints;
    }

    function getPointAtLength(points, length) {
        let sum = 0;
        for (let i = 1; i < points.length; i++) {
            let dist = VectorUtil.dist(points[i], points[i - 1]);
            // doubled point, just ignore it.
            if (dist == 0) continue;
            if (length >= sum && length <= sum + dist) {
                let p1 = points[i - 1];
                let p2 = points[i];
                let percent = (length - sum) / dist;
                return VectorUtil.add(VectorUtil.scale(p1, 1 - percent), VectorUtil.scale(p2, percent));
            } else {
                sum += dist;
            }
        }
    }

    function createMetaPoints(points) {
        let pathLength = getPathLength(points);

        let metaPoints = [];
        for (let scanLength = 0; scanLength < pathLength + PATH_PRECISION; scanLength += PATH_PRECISION) {
            let currLen = Math.min(scanLength, pathLength);

            // get the point
            let point = getPointAtLength(points, currLen);
            metaPoints.push({
                point: { x: point.x, y: point.y },
                percent: currLen / pathLength,
                normal: getNormal(point, currLen, pathLength, points)
            });
        }

        // if the line is really twisty, add extra points.
        let prevPointsStructure = metaPoints;
        metaPoints = [metaPoints[0]];
        for (let i = 1; i < prevPointsStructure.length; i++) {
            if (VectorUtil.dist(prevPointsStructure[i - 1].point, prevPointsStructure[i].point) < 0.75 * PATH_PRECISION) {
                let percent = (prevPointsStructure[i - 1].percent + prevPointsStructure[i].percent) / 2;
                let currLen = pathLength * percent;
                let point = getPointAtLength(points, currLen);

                metaPoints.push({
                    point: { x: point.x, y: point.y },
                    percent,
                    normal: getNormal(point, currLen, pathLength, points)
                });
            }

            metaPoints.push(prevPointsStructure[i])
        }

        let originalPoints = [];
        for (let i = 0; i < points.length; i++) {
            let point = points[i];
            let currLen = getPathLength(points.slice(0, i + 1));
            originalPoints.push({
                point: { x: point.x, y: point.y },
                percent: currLen / pathLength,
                normal: getNormal(point, currLen, pathLength, points),
                isOriginal: true
            });
        }

        prevPointsStructure = originalPoints.concat(metaPoints);
        prevPointsStructure.sort((a, b) => a.percent - b.percent);
        metaPoints = [prevPointsStructure[0]]
        for (let i = 1; i < prevPointsStructure.length; i++) {
            let pointData = prevPointsStructure[i];
            let lastPointData = metaPoints[metaPoints.length - 1];
            if (VectorUtil.equal(lastPointData.point, pointData.point)) {
                // we're going to assume that if the percents are the same the points are close enough to make no difference
                lastPointData.isOriginal = lastPointData.isOriginal || pointData.isOriginal;
            } else {
                metaPoints.push(pointData);
            }
        }

        for (let i = 0; i < metaPoints.length; i++) {
            metaPoints[i].index = i;
        }

        return metaPoints;
    }

    function getNormal(point, pointLen, pathLength, points) {
        let point1 = point;
        let point2;
        if (pointLen + 1 > pathLength) {
            point1 = getPointAtLength(points, pointLen - 1);
            point2 = point;
        } else {
            point2 = getPointAtLength(points, pointLen + 1);
        }
        let normal = VectorUtil.rotateRight(VectorUtil.normalize(VectorUtil.subtract(point2, point1)));

        return normal;
    }

    function projectPointOntoLine(coords, point1, point2) {
        if (!coords || !DataUtil.isNumeric(coords.x) || !DataUtil.isNumeric(coords.y) ||
            !point1 || !DataUtil.isNumeric(point1.x) || !DataUtil.isNumeric(point1.y) ||
            !point2 || !DataUtil.isNumeric(point2.x) || !DataUtil.isNumeric(point2.y)) {
            console.error("Invalid values!", coords, point1, point2);
            return { x: 0, y: 0, percent: 0 };
        }

        if (VectorUtil.equal(point1, point2)) {
            console.error("Invalid Line!", point1, point2);
            return {
                x: point1.x,
                y: point1.y,
                percent: 0
            }
        }

        var p1ToP2 = {
            x: point2.x - point1.x,
            y: point2.y - point1.y
        };
        var p1ToCoords = {
            x: coords.x - point1.x,
            y: coords.y - point1.y
        };
        var p1ToP2LenSquared = p1ToP2.x * p1ToP2.x + p1ToP2.y * p1ToP2.y;
        var dot = p1ToCoords.x * p1ToP2.x + p1ToCoords.y * p1ToP2.y;
        var percent = Math.min(1, Math.max(0, dot / p1ToP2LenSquared));

        return {
            x: point1.x + p1ToP2.x * percent,
            y: point1.y + p1ToP2.y * percent,
            percent: percent
        };
    }

    // END UTILITY //

    return {
        translate,
        getBoundingBox,
        getPathLength,
        equalsPath,
        getPositionForPercent,
        getNormalForPercent,
        getTangentForPercent,
        getClosestPointOnPath,
        getPercentBetweenPoints,
        isLineLike,
        pathOverlaps,
        getDistanceMetric,
    }
}();
