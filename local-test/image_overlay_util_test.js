import * as  chai from 'chai';
let assert = chai.assert;
let expect = chai.expect;

import * as suite from "./test_utils/suite_enviroment.js"
import * as utility from "./test_utils/utility.js";

import { OverlayUtil } from '../local/js/utils/overlay_util.js';

describe('OverlayUtil tests', function () {
    let integrationEnv;
    beforeEach(function () {
        integrationEnv = suite.getIntegrationEnviroment();
        integrationEnv.documentLoad();
    });

    afterEach(function (done) {
        integrationEnv.cleanup(done);
    });

    describe('intialization test', function () {
        it('should be part of the enviroment', function () {
            assert.exists(OverlayUtil);
        });

        it('should create without error', function () {
            new OverlayUtil();
        })
    })

    describe('coverage tests', function () {
        it('return true for covered area and false for an uncovered', function () {
            let overlayUtil = new OverlayUtil();
            overlayUtil.onResize(200, 100)
            overlayUtil.reset({ x: 0, y: 0, k: 1 });
            overlayUtil.drawBubble([{ x: 10, y: 10 }, { x: 50, y: 10 }, { x: 50, y: 50 }, { x: 25, y: 50 }]);
            expect(overlayUtil.covered({ x: 25, y: 11 })).to.eql(true);
            expect(overlayUtil.covered({ x: 5, y: 5 })).to.eql(false);
        });

        it('return false for out of bounds values', function () {
            let overlayUtil = new OverlayUtil();
            overlayUtil.onResize(200, 100)
            overlayUtil.reset({ x: 0, y: 0, k: 1 });
            overlayUtil.drawBubble([{ x: 10, y: 10 }, { x: 50, y: 10 }, { x: 50, y: 50 }, { x: 25, y: 50 }]);
            expect(overlayUtil.covered({ x: 25, y: 11 })).to.eql(true);
            expect(overlayUtil.covered({ x: -1, y: 100 })).to.eql(false);
            expect(overlayUtil.covered({ x: 1, y: -1 })).to.eql(false);
            expect(overlayUtil.covered({ x: -1, y: -1 })).to.eql(false);
            expect(overlayUtil.covered({ x: 50, y: 300 })).to.eql(false);
            expect(overlayUtil.covered({ x: 300, y: 50 })).to.eql(false);
            expect(overlayUtil.covered({ x: 300, y: 300 })).to.eql(false);
        });

        it('correctly handle transforms', function () {
            let overlayUtil = new OverlayUtil();
            overlayUtil.onResize(200, 100)
            overlayUtil.reset({ x: 0, y: 0, k: 1 });
            overlayUtil.drawBubble([{ x: 10, y: 10 }, { x: 50, y: 10 }, { x: 50, y: 50 }, { x: 25, y: 50 }]);
            expect(overlayUtil.covered({ x: 11, y: 11 })).to.eql(true);
            expect(overlayUtil.covered({ x: 45, y: 45 })).to.eql(true);
            expect(overlayUtil.covered({ x: 55, y: 55 })).to.eql(false);
            overlayUtil.reset({ x: 10, y: 10, k: 3 });
            overlayUtil.drawBubble([{ x: 10, y: 10 }, { x: 50, y: 10 }, { x: 50, y: 50 }, { x: 25, y: 50 }]);
            expect(overlayUtil.covered({ x: 11, y: 11 })).to.eql(true);
            // this one went off the edge, so it's the only one to change
            expect(overlayUtil.covered({ x: 45, y: 45 })).to.eql(false);
            expect(overlayUtil.covered({ x: 55, y: 55 })).to.eql(false);
        });
    });
});