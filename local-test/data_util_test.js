import { DataUtil } from '../local/js/utils/data_util.js';
import { Data } from '../local/js/data_structs.js';

import * as  chai from 'chai';
let assert = chai.assert;
let expect = chai.expect;

import * as suite from "./test_utils/suite_enviroment.js"
import * as utility from "./test_utils/utility.js"
import { VectorUtil } from '../local/js/utils/vector_util.js';

describe('Test Data Util', function () {
    let integrationEnv;
    beforeEach(function () {
        integrationEnv = suite.getIntegrationEnviroment();
        integrationEnv.documentLoad();
    });

    afterEach(function (done) {
        integrationEnv.cleanup(done);
    });

    describe('level tests', function () {
        it('should get 0 for a parentless element', function () {
            let model = utility.makeModel();
            assert.equal(model.getElementLevel(model.getElements().find(e => !e.parentId).id), 0);
        });

        it('should get more than 0 for a parented element', function () {
            let model = utility.makeModel();
            assert(model.getElementLevel(model.getElements().find(e => e.parentId).id) > 0);
        });

        it('should the right category for a deep element', function () {
            let model = utility.makeModel();
            expect(model.getElements().map(e => model.getElementLevel(e.id))).to.eql([0, 0, 1, 1, 1, 1, 1, 1, 2, 2, 2]);
        });
    })


    describe('stupid spine tests', function () {
        it('should return stroke path spine for single stroke element', function () {
            let element = new Data.Element();
            element.strokes.push(new Data.Stroke([{ x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 3 }], 1, "#00000000"));
            let spine = DataUtil.getStupidSpine(element);
            expect(spine).to.eql([{ x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 3 }]);
        });

        it('should return spine for multi stroke element', function () {
            let element = new Data.Element();
            element.strokes.push(
                new Data.Stroke([{ x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 3 }], 1, "#00000000"),
                new Data.Stroke([{ x: 2, y: 2 }, { x: 3, y: 3 }, { x: 1, y: 1 },], 1, "#00000000"),
                new Data.Stroke([{ x: 1, y: 1 }, { x: 3, y: 3 }, { x: 2, y: 2 }], 1, "#00000000")
            );
            let spine = DataUtil.getStupidSpine(element);
            spine.forEach(p => {
                p.x = Math.round(p.x * 100) / 100;
                p.y = Math.round(p.y * 100) / 100;
            });
            expect(spine).to.eql([{ x: 3, y: 3 }, { x: 2.14, y: 2.14 }, { x: 1.86, y: 1.86 }, { x: 1, y: 1 }]);
        });
    })

    describe('relative angle tests', function () {
        it('showuld return angles for no parent', function () {
            let element = new Data.Element();

            element.angle = { x: 1, y: 0 };
            expect(DataUtil.getRelativeAngle(element)).to.be.closeTo(0, 0.00001);

            element.angle = { x: -1, y: 0 };
            expect(DataUtil.getRelativeAngle(element)).to.be.closeTo(Math.PI, 0.00001);

            element.angle = { x: 0, y: 1 };
            expect(DataUtil.getRelativeAngle(element)).to.be.closeTo(Math.PI / 2, 0.00001);

            element.angle = { x: 0, y: -1 };
            expect(DataUtil.getRelativeAngle(element)).to.be.closeTo(-Math.PI / 2, 0.00001);

            element.angle = VectorUtil.normalize({ x: 1, y: 1 });
            expect(DataUtil.getRelativeAngle(element)).to.be.closeTo(Math.PI / 4, 0.00001);

            element.angle = VectorUtil.normalize({ x: -1, y: 1 });
            expect(DataUtil.getRelativeAngle(element)).to.be.closeTo(Math.PI * 3 / 4, 0.00001);
        });

        it('showuld return angles for parented element', function () {
            let element = new Data.Element();
            element.root = { x: 5, y: 5 };
            let parent = new Data.Element();
            parent.spine = ([{ x: 0, y: 0 }, { x: 10, y: 10 }])

            element.angle = { x: 1, y: 0 };
            expect(DataUtil.getRelativeAngle(element, parent)).to.be.closeTo(-Math.PI / 4, 0.00001);

            element.angle = { x: -1, y: 0 };
            expect(DataUtil.getRelativeAngle(element, parent)).to.be.closeTo(Math.PI * 3 / 4, 0.00001);

            element.angle = VectorUtil.normalize({ x: 1, y: 1 });
            expect(DataUtil.getRelativeAngle(element, parent)).to.be.closeTo(0, 0.00001);
        });

    })
});