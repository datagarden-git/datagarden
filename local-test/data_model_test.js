import { DataModel } from '../local/js/data_model.js';
import { Data } from '../local/js/data_structs.js';
import { IdUtil } from '../local/js/utils/id_util.js';
import { ChannelType, DEFAULT_CATEGORY_NAME, DimensionType } from '../local/js/constants.js';

import * as  chai from 'chai';
let assert = chai.assert;
let expect = chai.expect;

import * as suite from "./test_utils/suite_enviroment.js"
import * as utility from "./test_utils/utility.js";

describe('Test Data Model', function () {
    let integrationEnv;
    beforeEach(function () {
        integrationEnv = suite.getIntegrationEnviroment();
        integrationEnv.documentLoad();
    });

    afterEach(function (done) {
        integrationEnv.cleanup(done);
    });

    describe('intialization test', function () {
        it('should create a model', function () {
            let dataModel = new DataModel();
            expect(dataModel.getElements()).to.eql([]);
        });
    })

    describe('clone test', function () {
        it('should clone and be the same but a different object', function () {
            let dataModel = utility.makeModel();
            assert.exists(dataModel);

            let clone = dataModel.clone();
            utility.deepEquals(dataModel, clone);
            assert.notEqual(dataModel, clone);
        });
    })


    describe('get test', function () {
        it('should get element by id', function () {
            let dataModel = utility.makeModel();
            let elem = dataModel.getElements()[0];
            assert.equal(elem, dataModel.getElement(elem.id));
        });

        it('should get element by strokeId', function () {
            let dataModel = utility.makeModel();
            let elem = dataModel.getElements()[0];
            assert.equal(elem, dataModel.getElementForStroke(elem.strokes[0].id));
            assert.equal(elem, dataModel.getElementForStroke(elem.strokes[1].id));
            let elem2 = dataModel.getElements()[1];
            assert.equal(elem2, dataModel.getElementForStroke(elem2.strokes[0].id));
        });

        it('should get element by id', function () {
            let dataModel = utility.makeModel();
            let element = dataModel.getElements()[0];
            assert.equal(element, dataModel.getElement(element.id));
        });

        it('should return null for not found elements', function () {
            let dataModel = utility.makeModel();
            assert.equal(null, dataModel.getElement(IdUtil.getUniqueId(Data.Element)));
            assert.equal(null, dataModel.getElement(IdUtil.getUniqueId(Data.Element)));
            assert.equal(null, dataModel.getElementForStroke(IdUtil.getUniqueId(Data.Stroke)));
        });

    })

    describe("get children tests", function () {
        it('should get all decdendants of the item', function () {
            let dataModel = utility.makeModel();
            assert.equal(dataModel.getElements().length, 11)
            expect(dataModel.getElements().map(e => dataModel.getElementDecendants(e.id)).map(arr => arr.length).sort())
                .to.eql([0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 9]);
        });
    })

    describe("get table tests", function () {
        it('should a table from an empty model', function () {
            let dataModel = new DataModel();
            expect(dataModel.getTables()).to.eql([]);
        });

        it("should get a table one dimension and row", function () {
            let dataModel = new DataModel();
            for (let i = 0; i < 10; i++) {
                dataModel.getElements().push(new Data.Element());
                dataModel.getElements()[i].strokes.push(new Data.Stroke([{ x: 0, y: i * 10 }, { x: 10, y: i * 10 }], 3, "#000000"))
            }

            const categoryName1 = "Name1";
            let elId1 = dataModel.getElements()[0].id;
            let elId2 = dataModel.getElements()[1].id;

            dataModel.getDimensions().push(new Data.Dimension());
            dataModel.getDimensions()[0].type = DimensionType.DISCRETE;
            dataModel.getDimensions()[0].channel = ChannelType.SHAPE;
            dataModel.getDimensions()[0].categories.push(new Data.Category());
            dataModel.getDimensions()[0].categories[0].name = categoryName1;
            dataModel.getDimensions()[0].categories[0].elementIds = [elId1, elId2];

            dataModel.getDimensions().push(new Data.Dimension());
            dataModel.getDimensions()[1].type = DimensionType.DISCRETE;
            dataModel.getDimensions()[1].channel = ChannelType.COLOR;
            dataModel.getDimensions()[1].categories.push(new Data.Category());
            dataModel.getDimensions()[1].categories[0].name = "Name2";

            assert.equal(dataModel.getTables().length, 1);
            expect(dataModel.getTables()[0].getColumns().map(c => c.id)).to.eql([dataModel.getDimensions()[0].id]);
            expect(dataModel.getTables()[0].getDataArray().flat().map(c => c.value)).to.eql([categoryName1, categoryName1]);
            expect(dataModel.getTables()[0].getDataArray().flat().map(c => c.id).sort()).to.eql([elId1, elId2].sort());
        })

        it("should get a table with multiple rows and dimensions", function () {
            let dataModel = new DataModel();
            for (let i = 0; i < 10; i++) {
                dataModel.getElements().push(new Data.Element());
                dataModel.getElements()[i].strokes.push(new Data.Stroke([{ x: 0, y: i * 10 }, { x: 10, y: i * 10 }], 3, "#000000"))
            }
            for (let i = 5; i < 10; i++) {
                dataModel.getElements()[i].parentId = dataModel.getElements()[i - 5].id;
            }

            dataModel.getDimensions().push(new Data.Dimension());
            dataModel.getDimensions()[0].type = DimensionType.DISCRETE;
            dataModel.getDimensions()[0].channel = ChannelType.SHAPE;
            dataModel.getDimensions()[0].level = 0;
            dataModel.getDimensions()[0].categories.push(new Data.Category());
            dataModel.getDimensions()[0].categories[0].name = "Category1";
            dataModel.getDimensions()[0].categories[0].elementIds
                .push(dataModel.getElements()[0].id, dataModel.getElements()[1].id, dataModel.getElements()[3].id);
            dataModel.getDimensions()[0].categories.push(new Data.Category());
            dataModel.getDimensions()[0].categories[1].name = "Category2";
            dataModel.getDimensions()[0].categories[1].elementIds
                .push(dataModel.getElements()[2].id, dataModel.getElements()[4].id);

            dataModel.getDimensions().push(new Data.Dimension());
            dataModel.getDimensions()[1].type = DimensionType.DISCRETE;
            dataModel.getDimensions()[1].channel = ChannelType.SHAPE;
            dataModel.getDimensions()[1].level = 1;
            dataModel.getDimensions()[1].categories.push(new Data.Category());
            dataModel.getDimensions()[1].categories[0].name = "Category3";
            dataModel.getDimensions()[1].categories[0].elementIds
                .push(dataModel.getElements()[5].id, dataModel.getElements()[6].id, dataModel.getElements()[7].id);
            dataModel.getDimensions()[1].categories.push(new Data.Category());
            dataModel.getDimensions()[1].categories[1].name = "Category4";
            dataModel.getDimensions()[1].categories[1].elementIds
                .push(dataModel.getElements()[8].id, dataModel.getElements()[9].id);

            assert.equal(dataModel.getTables().length, 1);
            assert.equal(dataModel.getTables()[0].getColumns().length, 2);
            expect(dataModel.getTables()[0].getDataArray().map(r => r.map(c => c.value))).to.eql([
                ["Category1", "Category3"],
                ["Category1", "Category3"],
                ["Category2", "Category3"],
                ["Category1", "Category4"],
                ["Category2", "Category4"],
            ]);
        })

        it("should split separate tables", function () {
            let dataModel = new DataModel();
            for (let i = 0; i < 20; i++) {
                dataModel.getElements().push(new Data.Element());
                dataModel.getElements()[i].strokes.push(new Data.Stroke([{ x: 0, y: i * 10 }, { x: 10, y: i * 10 }], 3, "#000000"))
            }
            let elementsLevels = [[], []];
            for (let i = 10; i < 20; i++) {
                dataModel.getElements()[i].parentId = dataModel.getElements()[i - 10].id;
                elementsLevels[0].push(dataModel.getElements()[i - 10].id);
                elementsLevels[1].push(dataModel.getElements()[i].id);
            }


            for (let i = 0; i < 4; i++) {
                dataModel.getDimensions().push(new Data.Dimension());
                dataModel.getDimensions()[i].type = DimensionType.DISCRETE;
                dataModel.getDimensions()[i].channel = ChannelType.SHAPE;
                dataModel.getDimensions()[i].level = i % 2;
                for (let j = 0; j < 2; j++) {
                    dataModel.getDimensions()[i].categories.push(new Data.Category());
                    dataModel.getDimensions()[i].categories[j].name = DEFAULT_CATEGORY_NAME + (i * 10 + j);
                    for (let k = 0; k < 2; k++) {
                        dataModel.getDimensions()[i].categories[j].elementIds.push(elementsLevels[i % 2].pop());
                    }
                }
            }
            assert.equal(dataModel.getTables().length, 2);
        })
    })
});