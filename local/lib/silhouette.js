// modified from https://www.npmjs.com/package/@robzzson/silhouette

import { euclidean } from './ml-distance-euclidean.js';
import distanceMatrix from './ml-distance-matrix.js';

/**
 * Calculate Silhouette Coefficient
 * @param {Array<Array<number>>} data - list of input data samples
 * @param {Array<number>} labels - label values for each sample
 * @returns {number} score - Silhouette Score for input clustering
 */
export default function silhouetteScore(data, labels) {
    /*
      TODO: Check X and Y for consistent length - enforce X to be 2D and Y 1D.
          The length of Y should equal the number of rows in X, which in turn
          should be non-empty and should contain only finite values - no NaN-s
          and Inf-s allowed. The same goes for Y. Check that number of labels
          (number of distinct values in Y) is valid. Valid values are from 2 to
          data.length - 1 (inclusive)".
        */
    let dist = distanceMatrix(data, euclidean);
    let result = silhouetteSamples(dist, labels, silhouetteReduce).map(v => isNaN(v) ? -1 : 0);
    return result.reduce((p, c, i) => p + (c - p) / (i + 1), 0);
}

/**
 * Calculate Silhouette for each data sample
 * @param {Array<Array<number>>} data - list of input data samples
 * @param {Array<number>} labels - label values for each sample
 * @param {Function|Mock} reduceFunction - reduce function to apply on samples
 * @returns {Array<number>} arr - Silhouette Coefficient for each sample
 */
function silhouetteSamples(data, labels, reduceFunction) {
    /*
      TODO: Check X and Y for consistent length - enforce X to be 2D and Y 1D.
          The length of Y should equal the number of rows in X, which in turn
          should be non-empty and should contain only finite values - no NaN-s
          and Inf-s allowed. The same goes for Y. Check that number of labels
          (number of distinct values in Y) is valid. Valid values are from 2 to
          data.length - 1 (inclusive)".
       */
    let labelsFreq = countBy(labels);
    let samples = reduceFunction(data, labels, labelsFreq);
    let denom = labels.map((val) => labelsFreq[val] - 1)
    let intra = samples.intraDist.map((val, ind) => val / denom[ind]);
    let inter = samples.interDist;
    return inter.map((val, ind) => val - intra[ind])
        .map((val, ind) => val / Math.max(intra[ind], inter[ind]));
}

/**
 * Count the number of occurrences of each value in array.
 * @param {Array<number>} arr - Array of positive Integer values
 * @return {Array<number>} out - number of occurrences of each value starting from
 * 0 to max(arr).
 */
function countBy(arr) {
    let valid = arr.every((val) => {
        if (typeof val !== 'number') return false;
        return val >= 0.0 && Math.floor(val) === val && val !== Infinity;
    });
    if (!valid) throw new Error('Array must contain only natural numbers');

    let out = Array.from({ length: Math.max(...arr) + 1 }, () => 0);
    arr.forEach((value) => {
        out[value]++;
    });
    return out;
}

function silhouetteReduce(dataChunk, labels, labelFrequencies) {
    let clusterDistances = dataChunk.map((row) =>
        labelFrequencies.map((_, mInd) =>
            labels.reduce(
                (acc, val, rInd) => (val === mInd ? acc + row[rInd] : acc + 0),
                0
            )
        )
    );
    let intraDist = clusterDistances.map((val, ind) => val[labels[ind]]);
    let interDist = clusterDistances
        .map((mVal, mInd) => {
            mVal[labels[mInd]] += Infinity;
            labelFrequencies.forEach((fVal, fInd) => (mVal[fInd] /= fVal));
            return mVal;
        })
        .map((val) => Math.min(...val));
    return {
        intraDist: intraDist,
        interDist: interDist,
    };
}