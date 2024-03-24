import silhouetteScore from "../../lib/silhouette.js";
import { DataUtil } from "./data_util.js";
import { DrawingUtil } from "./drawing_util.js";

export let ClassifierUtil = function () {
    let mCanvas = document.createElement('canvas');
    let mContext = mCanvas.getContext("2d");
    let mDrawingUtil = new DrawingUtil(mContext, mContext, mContext);

    function elementToImg(element, size = 16) {
        mDrawingUtil.reset({ x: 0, y: 0, k: 1 });
        mCanvas.height = size;
        mCanvas.width = size;

        let strokes = DataUtil.getStraightenedStrokes(element);
        mDrawingUtil.drawThumbnail({
            strokes: strokes,
            x: 0, y: 0,
            size
        });

        let newCanvas = document.createElement('canvas');
        let context = newCanvas.getContext('2d');
        newCanvas.width = size;
        newCanvas.height = size;
        for (let x = 0; x < size - 1; x++) {
            for (let y = 0; y < size - 1; y++) {
                let imgData = mContext.getImageData(x, y, 1, 1);
                let r = imgData.data[0];
                let g = imgData.data[1];
                let b = imgData.data[2];
                let a = imgData.data[3];
                if (r != g || r != b) {
                    // set all colors to the same grey.
                    r = 255;
                }
                imgData.data.set([r, r, r, a])
                context.putImageData(imgData, x, y);
            }
        }
        return newCanvas;
    }

    // we get the clustering for 1 - 8 clusters
    // then we get the square sum for the avg distance to center for all 8.
    function elementToImgVector(element, size = 16) {
        let strokes = DataUtil.getStraightenedStrokes(element);
        mDrawingUtil.reset({ x: 0, y: 0, k: 1 });
        mCanvas.height = size;
        mCanvas.width = size;
        mDrawingUtil.drawThumbnail({
            strokes: strokes,
            x: 0, y: 0,
            size
        });

        let imgData = mContext.getImageData(0, 0, size, size).data;
        let vector = [];
        for (let i = 0; i < imgData.length; i += 4) {
            let r = imgData[i];
            let g = imgData[i + 1];
            let b = imgData[i + 2];
            let a = imgData[i + 3];
            if (r != g || r != b) {
                // set all colors to the same grey.
                r = 128;
            }
            vector.push((1 - r / 255) * (a / 255));
        }
        return vector;
    }

    function elementToColorVector(element) {
        let colors = element.strokes.map(s => { return s.color.length == 9 ? DataUtil.hexToRGBA(s.color) : { r: 0, g: 0, b: 0, a: 0 }; });
        let count = 0;
        let sum = [0, 0, 0];
        colors.forEach(color => {
            if (color.a > 0) {
                sum[0] += color.r;
                sum[1] += color.g;
                sum[2] += color.b;
                count++;
            }
        });
        return count == 0 ? sum : sum.map(c => c / count);
    }

    function clusterElementShapes(elements, categories) {
        return clusterElementVectors(elements, categories, elementToImgVector);
    }

    function clusterElementColors(elements, categories) {
        return clusterElementVectors(elements, categories, elementToColorVector);
    }

    function clusterElementVectors(elements, categories, vectorFunction) {
        // Convert categories to initial clusters
        // clusters is an array matching vector length with a cluster number for each
        // vector. 
        let clusters = new Array(elements.length).fill(-1);
        clusters = elements.map(e => categories.findIndex(c => c.elementIds.find(eId => eId == e.id)));
        if (categories.length > elements.length) {
            // just assign an element to each category
            let availableIndexes = Array.from(Array(categories.length).keys()).filter(index => !clusters.find(c => c == index));
            clusters = clusters.map((cluster) => {
                if (cluster == -1) {
                    return availableIndexes.shift();
                } else {
                    return cluster;
                }
            });
            return clusters;
        } else {
            let vectors = elements.map(e => vectorFunction(e));
            return clusterVectors(vectors, clusters);
        }
    }

    // returns an array of clusters assignments
    function clusterVectors(vectors, clusters) {
        let bestClusters = [];
        let bestSilhouette = -2;
        let bestK = -1;
        let k = Math.max(1, ...clusters.map(c => c + 1));
        let maxK = Math.max(Math.min(10, vectors.length), k);
        for (k; k <= maxK; k++) {
            let kClusters = kMeans(vectors, k, clusters);
            let silhouette = silhouetteScore(vectors, kClusters);
            if (silhouette > bestSilhouette) {
                bestSilhouette = silhouette;
                bestK = k;
                bestClusters = kClusters;
            }
        }
        return bestClusters;

    }

    function kMeans(vectors, k = 1, presetClusters) {
        // take the first k vectors as starting centers
        const centers = vectors.slice(0, k);
        const distances = new Array(vectors.length).fill(new Array(k).fill(0));
        const clusters = [...presetClusters];

        let done = false;
        let iteration = 0;
        while (!done && iteration < 100) {
            done = true;
            vectors.forEach((vector, vectorindex) => {
                for (let c = 0; c < k; c++) {
                    let diff = vector.map((v, index) => v - centers[c][index]);
                    distances[vectorindex][c] = Math.hypot(...diff);
                }
                let m = presetClusters[vectorindex];
                if (m == -1) {
                    m = distances[vectorindex].reduce((minData, curr, index) => {
                        if (curr < minData.dist) {
                            minData.dist = curr;
                            minData.index = index;
                        }
                        return minData;
                    }, { dist: Infinity, index: -1 }).index;
                }
                if (clusters[vectorindex] !== m) done = false;
                clusters[vectorindex] = m;
            });

            for (let c = 0; c < k; c++) {
                let newCenter = new Array(vectors[0].length).fill(0);
                const vectorCount = vectors.reduce((count, vector, vectorindex) => {
                    if (clusters[vectorindex] == c) {
                        count++;
                        // add this vector to the sum
                        newCenter = newCenter.map((v, i) => v + vector[i]);
                    }
                    return count;
                }, 0);
                if (vectorCount > 0) {
                    centers[c] = newCenter.map(v => v / vectorCount);
                }
            }

            iteration++;
        }

        if (iteration == 100) {
            console.error("it probably shouldn't take so long to stabalize...")
        }

        return clusters;
    }

    return {
        elementToImg,
        elementToImgVector,
        clusterElementShapes,
        clusterElementColors,
        clusterVectors,
        kMeans,
    }
}();
