import { VectorUtil } from '../local/js/utils/vector_util.js';

import * as  chai from 'chai';
let assert = chai.assert;
let expect = chai.expect;

import * as suite from "./test_utils/suite_enviroment.js"

describe('Test Vector Util', function () {
    let integrationEnv;
    beforeEach(function () {
        integrationEnv = suite.getIntegrationEnviroment();
        integrationEnv.documentLoad();
    });

    afterEach(function (done) {
        integrationEnv.cleanup(done);
    });

    describe('dist tests', function () {
        it('should get 0 for the same vectors', function () {
            expect(VectorUtil.dist([1, 1, 1, 1, 1], [1, 1, 1, 1, 1])).to.eql(0);
        });

        it('should get 0 for the same points', function () {
            expect(VectorUtil.dist({ x: 2, y: 1 }, { x: 2, y: 1 })).to.eql(0);
        });

        it('should get a value for vectors', function () {
            expect(VectorUtil.dist([1, 1, 1, 1, 1], [10, -10, 10, -10, 10])).to.be.closeTo(22, 0.1);

        });


        it('should get a value for points', function () {
            expect(VectorUtil.dist({ x: 0, y: 1 }, { x: 2, y: 1 })).to.eql(2);
        });


    })
});