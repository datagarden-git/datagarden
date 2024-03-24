import * as  chai from 'chai';
import { ClassifierUtil } from '../local/js/utils/classifier_util.js';
let assert = chai.assert;
let expect = chai.expect;

describe('Test Classifer', function () {
    describe('clustering tests', function () {
        it('should get 1 for a single vector', function () {
            let clusters = ClassifierUtil.clusterVectors([[0, 0, 0, 0, 0, 1]], [-1]);
            expect(clusters).to.eql([0]);
        });

        it('should cluster in simple cases', function () {
            let clusters = ClassifierUtil.clusterVectors([
                [5, 1, 0, 0, 7, 10],
                [5, 1, 2, 0, 0, 0],
                [1, 1, 4, 0, 0, 1],
                [1, 0, 0, 0, 0, 1],
                [0, 0, 9, 9, 1, 0],
                [0, 0, 7, 9, 1, 1],
                [0, 1, 0, 1, 1, 7],
                [0, 0, 0, 1, 1, 7],
                [0, 0, 1, 1, 4, 5],
                [0, 0, 0, 0, 0, 1]
            ], new Array(10).fill(-1));
            expect(clusters).to.eql([0, 1, 1, 1, 1, 1, 0, 0, 0, 1]);
        });

        it('should cluster with preset values', function () {
            let clusters = ClassifierUtil.clusterVectors([
                [5, 1, 0, 0, 7, 10],
                [5, 1, 2, 0, 0, 0],
                [1, 1, 4, 0, 0, 1],
                [1, 0, 0, 0, 0, 1],
                [0, 0, 9, 9, 1, 0],
                [0, 0, 7, 9, 1, 1],
                [0, 1, 0, 1, 1, 7],
                [0, 0, 0, 1, 1, 7],
                [0, 0, 1, 1, 4, 5],
                [0, 0, 0, 0, 0, 1]
            ], [0, 2, 0, 2, 1, -1, -1, -1, -1, -1]);
            expect(clusters).to.eql([0, 2, 0, 2, 1, 1, 2, 2, 0, 2]);
        });
    })
});