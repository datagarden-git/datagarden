import * as  chai from 'chai';
let assert = chai.assert;
let expect = chai.expect;

import * as suite from "./test_utils/suite_enviroment.js"
import * as utility from "./test_utils/utility.js"

describe('Version Controller Tests', function () {
    let integrationEnv;
    beforeEach(function () {
        integrationEnv = suite.getIntegrationEnviroment();
        integrationEnv.documentLoad();
    });

    afterEach(function (done) {
        integrationEnv.cleanup(done);
    });

    describe('drawing undo and redo tests', function () {
        it('should undo drawing a line', async function () {
            // draw a line
            Date.time = 100000;
            utility.drawStroke([{ x: 20, y: 20 }, { x: 20, y: 40 }, { x: 20, y: 60 }, { x: 20, y: 80 }]);
            Date.time = 200000;
            utility.drawStroke([{ x: 30, y: 20 }, { x: 30, y: 40 }, { x: 30, y: 60 }, { x: 30, y: 80 }]);
            // update time so they get cached
            Date.time = 300000;
            utility.drawStroke([{ x: 40, y: 20 }, { x: 40, y: 40 }, { x: 40, y: 60 }, { x: 40, y: 80 }]);
            assert.equal(model().getElements().length, 3);

            await utility.undo(integrationEnv);
            assert.equal(model().getElements().length, 2);

            await utility.undo(integrationEnv);
            assert.equal(model().getElements().length, 1);

            await utility.redo(integrationEnv);
            assert.equal(model().getElements().length, 2);

            await utility.redo(integrationEnv);
            assert.equal(model().getElements().length, 3);
        });
    })
});