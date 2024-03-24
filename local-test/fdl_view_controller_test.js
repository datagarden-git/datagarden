import { ChannelType, DIMENSION_SETTINGS_HEIGHT, DimensionType, Size, Tab } from '../local/js/constants.js';

import * as  chai from 'chai';
let assert = chai.assert;
let expect = chai.expect;

import * as suite from "./test_utils/suite_enviroment.js"
import * as utility from "./test_utils/utility.js"
import { DataUtil } from '../local/js/utils/data_util.js';

describe('FDL View Controller Test', function () {
    let integrationEnv;
    beforeEach(function () {
        integrationEnv = suite.getIntegrationEnviroment();
        integrationEnv.documentLoad();
    });

    afterEach(function (done) {
        integrationEnv.cleanup(done);
    });

    describe('dimension setting tests', function () {
        it('should create a dimension', function () {
            utility.clickTab(Tab.LEGEND);
            assert.equal(model().getDimensions().length, 0);
            utility.click('#fdl-view-container', { x: 15, y: 15 });
            assert.equal(model().getDimensions().length, 1)
        });

        it('should change dimension name', function () {
            utility.clickTab(Tab.LEGEND);
            assert.equal(model().getDimensions().length, 0);
            utility.click('#fdl-view-container', { x: 15, y: 15 });
            utility.click('#fdl-view-container', { x: 15, y: DIMENSION_SETTINGS_HEIGHT - 20 });
            utility.enterText("new name");
            assert.equal(model().getDimensions().length, 1)
            assert.equal(model().getDimensions()[0].name, "new name");
        });

        it('should change dimension type to continuous', function () {
            utility.clickTab(Tab.LEGEND);
            assert.equal(model().getDimensions().length, 0);
            utility.click('#fdl-view-container', { x: 15, y: 15 });
            utility.click('#fdl-view-container', { x: 180, y: DIMENSION_SETTINGS_HEIGHT - 20 });
            utility.selectOption(DimensionType.CONTINUOUS);
            assert.equal(model().getDimensions().length, 1)
            assert.equal(model().getDimensions()[0].type, DimensionType.CONTINUOUS);
        });

        it('should change dimension type to discrete', function () {
            utility.clickTab(Tab.LEGEND);
            assert.equal(model().getDimensions().length, 0);
            utility.click('#fdl-view-container', { x: 15, y: 15 });
            utility.click('#fdl-view-container', { x: 180, y: DIMENSION_SETTINGS_HEIGHT - 20 });
            utility.selectOption(DimensionType.CONTINUOUS);
            assert.equal(model().getDimensions().length, 1)
            assert.equal(model().getDimensions()[0].type, DimensionType.CONTINUOUS);
            utility.click('#fdl-view-container', { x: 180, y: DIMENSION_SETTINGS_HEIGHT - 20 });
            utility.selectOption(DimensionType.DISCRETE);
            assert.equal(model().getDimensions().length, 1)
            assert.equal(model().getDimensions()[0].type, DimensionType.DISCRETE);
        });

        it('should change dimension channel to shape', function () {
            utility.clickTab(Tab.LEGEND);
            assert.equal(model().getDimensions().length, 0);
            utility.click('#fdl-view-container', { x: 15, y: 15 });
            utility.click('#fdl-view-container', { x: 365, y: DIMENSION_SETTINGS_HEIGHT - 20 });
            utility.selectOption(ChannelType.COLOR);
            assert.equal(model().getDimensions().length, 1)
            assert.equal(model().getDimensions()[0].channel, ChannelType.COLOR);
            utility.click('#fdl-view-container', { x: 365, y: DIMENSION_SETTINGS_HEIGHT - 20 });
            utility.selectOption(ChannelType.SHAPE);
            assert.equal(model().getDimensions().length, 1)
            assert.equal(model().getDimensions()[0].channel, ChannelType.SHAPE);
        });

        it('should change dimension channel to color', function () {
            utility.clickTab(Tab.LEGEND);
            assert.equal(model().getDimensions().length, 0);
            utility.click('#fdl-view-container', { x: 15, y: 15 });
            utility.click('#fdl-view-container', { x: 365, y: DIMENSION_SETTINGS_HEIGHT - 20 });
            utility.selectOption(ChannelType.COLOR);
            assert.equal(model().getDimensions().length, 1)
            assert.equal(model().getDimensions()[0].channel, ChannelType.COLOR);
        });

        it('should change dimension channel to size', function () {
            utility.clickTab(Tab.LEGEND);
            assert.equal(model().getDimensions().length, 0);
            utility.click('#fdl-view-container', { x: 15, y: 15 });
            utility.click('#fdl-view-container', { x: 365, y: DIMENSION_SETTINGS_HEIGHT - 20 });
            utility.selectOption(ChannelType.SIZE);
            assert.equal(model().getDimensions().length, 1)
            assert.equal(model().getDimensions()[0].channel, ChannelType.SIZE);
        });

        it('should change dimension channel to angle', function () {
            utility.clickTab(Tab.LEGEND);
            assert.equal(model().getDimensions().length, 0);
            utility.click('#fdl-view-container', { x: 15, y: 15 });
            utility.click('#fdl-view-container', { x: 365, y: DIMENSION_SETTINGS_HEIGHT - 20 });
            utility.selectOption(ChannelType.ANGLE);
            assert.equal(model().getDimensions().length, 1)
            assert.equal(model().getDimensions()[0].channel, ChannelType.ANGLE);
        });

        it('should change dimension channel to label', function () {
            utility.clickTab(Tab.LEGEND);
            assert.equal(model().getDimensions().length, 0);
            utility.click('#fdl-view-container', { x: 15, y: 15 });
            utility.click('#fdl-view-container', { x: 365, y: DIMENSION_SETTINGS_HEIGHT - 20 });
            utility.selectOption(ChannelType.LABEL);
            assert.equal(model().getDimensions().length, 1)
            assert.equal(model().getDimensions()[0].channel, ChannelType.LABEL);
        });

        it('should change provide one category per element for label channel', function () {
            utility.drawStroke([{ x: 20, y: 20 }, { x: 20, y: 40 }, { x: 20, y: 60 }, { x: 20, y: 80 }])
            utility.drawStroke([{ x: 30, y: 20 }, { x: 30, y: 40 }, { x: 30, y: 60 }, { x: 30, y: 80 }])
            utility.drawStroke([{ x: 40, y: 20 }, { x: 40, y: 40 }, { x: 40, y: 60 }, { x: 40, y: 80 }])
            assert.equal(model().getElements().length, 3);

            utility.clickTab(Tab.LEGEND);
            assert.equal(model().getDimensions().length, 0);
            utility.click('#fdl-view-container', { x: 15, y: 15 });
            utility.click('#fdl-view-container', { x: 365, y: DIMENSION_SETTINGS_HEIGHT - 20 });
            utility.selectOption(ChannelType.LABEL);
            assert.equal(model().getDimensions().length, 1)
            assert.equal(model().getDimensions()[0].channel, ChannelType.LABEL);
            assert.equal(model().getDimensions()[0].categories.length, 3);
            expect(model().getDimensions()[0].categories.map(c => c.elementIds.length)).to.eql([1, 1, 1]);
        });

        it('should update label names on dimen name update', function () {
            utility.drawStroke([{ x: 20, y: 20 }, { x: 20, y: 40 }, { x: 20, y: 60 }, { x: 20, y: 80 }])
            utility.drawStroke([{ x: 30, y: 20 }, { x: 30, y: 40 }, { x: 30, y: 60 }, { x: 30, y: 80 }])
            utility.drawStroke([{ x: 40, y: 20 }, { x: 40, y: 40 }, { x: 40, y: 60 }, { x: 40, y: 80 }])
            assert.equal(model().getElements().length, 3);

            utility.clickTab(Tab.LEGEND);
            assert.equal(model().getDimensions().length, 0);
            utility.click('#fdl-view-container', { x: 15, y: 15 });
            utility.click('#fdl-view-container', { x: 365, y: DIMENSION_SETTINGS_HEIGHT - 20 });
            utility.selectOption(ChannelType.LABEL);
            assert.equal(model().getDimensions().length, 1)
            assert.equal(model().getDimensions()[0].channel, ChannelType.LABEL);
            assert.equal(model().getDimensions()[0].categories.length, 3);
            expect(model().getDimensions()[0].categories.map(c => c.elementIds.length)).to.eql([1, 1, 1]);

            utility.click('#fdl-view-container', { x: 15, y: DIMENSION_SETTINGS_HEIGHT - 20 });
            utility.enterText("new name");
            assert.equal(model().getDimensions().length, 1)
            assert.equal(model().getDimensions()[0].name, "new name");

            expect(model().getDimensions()[0].categories.map(c => c.name)).to.eql(["new name0", "new name1", "new name2"]);
        });

        it('should change dimension channel to dist, also make it valid', function () {
            utility.clickTab(Tab.LEGEND);
            assert.equal(model().getDimensions().length, 0);
            utility.click('#fdl-view-container', { x: 15, y: 15 });
            utility.click('#fdl-view-container', { x: 365, y: DIMENSION_SETTINGS_HEIGHT - 20 });
            utility.selectOption(ChannelType.POSITION);
            assert.equal(model().getDimensions().length, 1)
            assert.equal(model().getDimensions()[0].channel, ChannelType.POSITION);
            assert.equal(model().getDimensions()[0].level, 0);

            utility.drawStroke([{ x: 20, y: 20 }, { x: 20, y: 40 }, { x: 20, y: 60 }, { x: 20, y: 80 }])
            utility.drawStroke([{ x: 20, y: 50 }, { x: 40, y: 55 }, { x: 50, y: 45 }, { x: 60, y: 50 }])

            assert.equal(model().getElements().length, 2);
            expect(model().getElements().map(e => e.strokes.length)).to.eql([1, 1]);
            expect(model().getElements().map(e => model().getElementLevel(e.id)).sort()).to.eql([0, 1]);

            utility.click('#fdl-view-container', { x: 285, y: DIMENSION_SETTINGS_HEIGHT - 20 });
            utility.selectOption(1);

            assert.equal(model().getDimensions().length, 1)
            assert.equal(model().getDimensions()[0].level, 1);
        });

        it('should set level to 0', function () {
            utility.drawStroke([{ x: 20, y: 20 }, { x: 20, y: 40 }, { x: 20, y: 60 }, { x: 20, y: 80 }, { x: 20, y: 100 }])

            utility.drawStroke([{ x: 20, y: 50 }, { x: 40, y: 55 }, { x: 50, y: 45 }, { x: 80, y: 50 }])
            utility.drawStroke([{ x: 50, y: 50 }, { x: 50, y: 40 }, { x: 50, y: 30 }])
            utility.drawStroke([{ x: 70, y: 50 }, { x: 70, y: 40 }, { x: 70, y: 25 }])

            utility.drawStroke([{ x: 20, y: 70 }, { x: 40, y: 70 }, { x: 50, y: 75 }, { x: 60, y: 70 }])
            utility.drawStroke([{ x: 50, y: 70 }, { x: 50, y: 90 }, { x: 50, y: 100 }])
            utility.drawStroke([{ x: 70, y: 70 }, { x: 70, y: 90 }, { x: 70, y: 100 }])

            assert.equal(model().getElements().length, 7);

            utility.clickTab(Tab.LEGEND);
            assert.equal(model().getDimensions().length, 0);
            utility.click('#fdl-view-container', { x: 15, y: 15 });
            utility.click('#fdl-view-container', { x: 365, y: DIMENSION_SETTINGS_HEIGHT - 20 });
            assert.equal(model().getDimensions().length, 1)
            assert.equal(model().getDimensions()[0].level, 2)

            utility.click('#fdl-view-container', { x: 285, y: DIMENSION_SETTINGS_HEIGHT - 20 });
            utility.selectOption(0);
            assert.equal(model().getDimensions().length, 1)
            assert.equal(model().getDimensions()[0].level, 0)
        });

        it('should change dimension type to cont and channel to position', function () {
            utility.clickTab(Tab.LEGEND);
            assert.equal(model().getDimensions().length, 0);
            utility.click('#fdl-view-container', { x: 15, y: 15 });

            utility.click('#fdl-view-container', { x: 180, y: DIMENSION_SETTINGS_HEIGHT - 20 });
            utility.selectOption(DimensionType.CONTINUOUS);
            assert.equal(model().getDimensions().length, 1)
            assert.equal(model().getDimensions()[0].type, DimensionType.CONTINUOUS);

            utility.click('#fdl-view-container', { x: 365, y: DIMENSION_SETTINGS_HEIGHT - 20 });
            utility.selectOption(ChannelType.POSITION);
            assert.equal(model().getDimensions().length, 1)
            assert.equal(model().getDimensions()[0].channel, ChannelType.POSITION);
        });

        it('should map values to numbers', function () {
            utility.clickTab(Tab.LEGEND);
            assert.equal(model().getDimensions().length, 0);
            utility.click('#fdl-view-container', { x: 15, y: 15 });

            utility.click('#fdl-view-container', { x: 180, y: DIMENSION_SETTINGS_HEIGHT - 20 });
            utility.selectOption(DimensionType.CONTINUOUS);
            assert.equal(model().getDimensions().length, 1)
            assert.equal(model().getDimensions()[0].type, DimensionType.CONTINUOUS);

            utility.click('#fdl-view-container', { x: 365, y: DIMENSION_SETTINGS_HEIGHT - 20 });
            utility.selectOption(ChannelType.POSITION);
            assert.equal(model().getDimensions().length, 1)
            assert.equal(model().getDimensions()[0].channel, ChannelType.POSITION);

            utility.drawStroke([{ x: 20, y: 1 }, { x: 20, y: 20 }, { x: 20, y: 40 }, { x: 20, y: 65 }, { x: 20, y: 80 }, { x: 20, y: 101 }]);
            utility.drawStroke([{ x: 20, y: 25 }, { x: 40, y: 25 }, { x: 50, y: 25 }, { x: 60, y: 20 }]);
            utility.drawStroke([{ x: 20, y: 50 }, { x: 40, y: 55 }, { x: 50, y: 45 }, { x: 60, y: 50 }]);
            utility.drawStroke([{ x: 20, y: 75 }, { x: 40, y: 75 }, { x: 50, y: 85 }, { x: 60, y: 70 }]);

            expect(model().getElements().length).to.eql(4);
            expect(model().getElements().filter(e => e.parentId).length).to.eql(3);

            utility.click('#fdl-view-container', { x: 285, y: DIMENSION_SETTINGS_HEIGHT - 20 });
            utility.selectOption(1);

            assert.equal(model().getDimensions().length, 1)
            assert.equal(model().getDimensions()[0].level, 1);

            expect(model().getTables().length).to.eql(1);
            expect(model().getTables()[0].getDataArray().flat().map(i => i.value)).to.eql([0.2, 0.49, 0.74]);
        });

        it('should map values to times', function () {
            utility.clickTab(Tab.LEGEND);
            assert.equal(model().getDimensions().length, 0);
            utility.click('#fdl-view-container', { x: 15, y: 15 });

            utility.click('#fdl-view-container', { x: 180, y: DIMENSION_SETTINGS_HEIGHT - 20 });
            utility.selectOption(DimensionType.CONTINUOUS);
            assert.equal(model().getDimensions().length, 1)
            assert.equal(model().getDimensions()[0].type, DimensionType.CONTINUOUS);

            utility.click('#fdl-view-container', { x: 365, y: DIMENSION_SETTINGS_HEIGHT - 20 });
            utility.selectOption(ChannelType.POSITION);
            assert.equal(model().getDimensions().length, 1)
            assert.equal(model().getDimensions()[0].channel, ChannelType.POSITION);

            utility.drawStroke([{ x: 20, y: 1 }, { x: 20, y: 20 }, { x: 20, y: 40 }, { x: 20, y: 65 }, { x: 20, y: 80 }, { x: 20, y: 101 }]);
            utility.drawStroke([{ x: 20, y: 25 }, { x: 40, y: 25 }, { x: 50, y: 25 }, { x: 60, y: 20 }]);
            utility.drawStroke([{ x: 20, y: 50 }, { x: 40, y: 55 }, { x: 50, y: 45 }, { x: 60, y: 50 }]);
            utility.drawStroke([{ x: 20, y: 75 }, { x: 40, y: 75 }, { x: 50, y: 85 }, { x: 60, y: 70 }]);

            expect(model().getElements().length).to.eql(4);
            expect(model().getElements().filter(e => e.parentId).length).to.eql(3);

            utility.click('#fdl-view-container', { x: 285, y: DIMENSION_SETTINGS_HEIGHT - 20 });
            utility.selectOption(1);

            utility.click('#fdl-view-container', { x: 20, y: 150 });
            utility.enterText("10:30");
            utility.timePass();
            utility.click('#fdl-view-container', { x: 20, y: 515 });
            utility.enterText("20:30");

            assert.equal(model().getDimensions().length, 1)
            assert.equal(model().getDimensions()[0].level, 1);

            expect(model().getTables().length).to.eql(1);
            expect(model().getTables()[0].getDataArray().flat().map(i => i.value)).to.eql(["12:30", "15:24", "17:54"]);
        });

        it('should create a category', function () {
            utility.clickTab(Tab.LEGEND);
            assert.equal(model().getDimensions().length, 0);
            utility.click('#fdl-view-container', { x: 15, y: 15 });
            assert.equal(model().getDimensions().length, 1)

            assert.equal(model().getDimensions()[0].categories.length, 0);
            utility.click('#fdl-view-container', { x: 15, y: DIMENSION_SETTINGS_HEIGHT + 60 });
            assert.equal(model().getDimensions()[0].categories.length, 1);
        });

        it('should change a category name', function () {
            utility.clickTab(Tab.LEGEND);
            assert.equal(model().getDimensions().length, 0);
            utility.click('#fdl-view-container', { x: 15, y: 15 });
            assert.equal(model().getDimensions().length, 1)

            assert.equal(model().getDimensions()[0].categories.length, 0);
            utility.click('#fdl-view-container', { x: 15, y: DIMENSION_SETTINGS_HEIGHT + 60 });
            assert.equal(model().getDimensions()[0].categories.length, 1);

            utility.click('#fdl-view-container', { x: 15, y: 285 });
            utility.enterText("new name");
            assert.equal(model().getDimensions()[0].categories.length, 1);
            assert.equal(model().getDimensions()[0].categories[0].name, "new name");
        });

        it('should assign elements to category on drop', function () {
            utility.drawStroke([{ x: 20, y: 20 }, { x: 20, y: 40 }, { x: 20, y: 60 }, { x: 20, y: 80 }])
            utility.drawStroke([{ x: 30, y: 20 }, { x: 30, y: 40 }, { x: 30, y: 60 }, { x: 30, y: 80 }])

            assert.equal(model().getElements().length, 2);
            assert.equal(model().getElements()[0].strokes.length, 1);
            expect(model().getElements()[0].strokes[0].path).to.eql([{ x: 20, y: 20 }, { x: 20, y: 20 }, { x: 20, y: 40 }, { x: 20, y: 60 }, { x: 20, y: 80 }]);

            utility.clickTab(Tab.LEGEND);
            assert.equal(model().getDimensions().length, 0);
            utility.click('#fdl-view-container', { x: 15, y: 15 });
            assert.equal(model().getDimensions().length, 1)
            for (let i = 0; i < 30; i++) d3.tick();

            utility.click('#fdl-view-container', { x: 15, y: 430 });
            assert.equal(model().getDimensions()[0].categories.length, 2);
            assert.equal(model().getDimensions()[0].categories[0].elementIds.length, 2);
            assert.equal(model().getDimensions()[0].categories[1].elementIds.length, 0);
            for (let i = 0; i < 30; i++) d3.tick();

            utility.drag('#fdl-view-container', [{ x: 475, y: 175 }, { x: 250, y: 200 }, { x: 300, y: 500 }]);

            assert.equal(model().getDimensions()[0].categories.length, 2);
            assert.equal(model().getDimensions()[0].categories[0].elementIds.length, 1);
            assert.equal(model().getDimensions()[0].categories[1].elementIds.length, 1);
        });

        it('should change dimension mapping on control drag', function () {
            utility.clickTab(Tab.LEGEND);
            assert.equal(model().getDimensions().length, 0);
            utility.click('#fdl-view-container', { x: 15, y: 15 });
            assert.equal(model().getDimensions().length, 1)
            for (let i = 0; i < 30; i++) d3.tick();

            utility.click('#fdl-view-container', { x: 15, y: 150 });
            for (let i = 0; i < 30; i++) d3.tick();
            utility.click('#fdl-view-container', { x: 15, y: 430 });
            for (let i = 0; i < 30; i++) d3.tick();
            assert.equal(model().getDimensions()[0].categories.length, 2);

            utility.drawStroke([{ x: 20, y: 20 }, { x: 20, y: 40 }, { x: 20, y: 60 }, { x: 20, y: 80 }])
            utility.drawStroke([{ x: 30, y: 20 }, { x: 30, y: 40 }, { x: 30, y: 60 }, { x: 30, y: 80 }])

            utility.click('#fdl-view-container', { x: 365, y: DIMENSION_SETTINGS_HEIGHT - 20 });
            utility.selectOption(ChannelType.SIZE);
            for (let i = 0; i < 30; i++) d3.tick();
            assert.equal(model().getDimensions().length, 1)
            assert.equal(model().getDimensions()[0].channel, ChannelType.SIZE);
            assert.equal(model().getDimensions()[0].ranges.length, 1)
            assert.equal(model().getDimensions()[0].ranges[0], 0.5)

            utility.drag('#fdl-view-container', [{ x: 183, y: 322 }, { x: 250, y: 200 }, { x: 300, y: 200 }]);

            assert.equal(model().getDimensions().length, 1)
            assert.equal(model().getDimensions()[0].ranges.length, 1)
            assert.equal(Math.round(model().getDimensions()[0].ranges[0] * 1000) / 1000, 0.18)
        });
    })
});