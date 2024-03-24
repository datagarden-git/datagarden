import os from 'os';

import * as  chai from 'chai';
let assert = chai.assert;
let expect = chai.expect;

import * as utility from '../server/utility.js';

describe('Test Fairy Connector', function () {
    describe('test scap converstion', function () {
        it('should get a simple scap for a one stroke element', function () {
            let simpleElement = {
                "id": "Element_1693384763609_1",
                "creationTime": 1693384763609,
                "x": 251,
                "y": 171,
                "strokes": [{
                    "id": "Stroke_1693384763609_0",
                    "creationTime": 1693384763609, "path": [
                        { "x": 5, "y": 32 },
                        { "x": 6, "y": 31 },
                        { "x": 14, "y": 29 },
                        { "x": 29, "y": 26 },
                        { "x": 112, "y": 17 },
                        { "x": 161, "y": 15 },
                        { "x": 199, "y": 12 },
                        { "x": 216, "y": 8 },
                        { "x": 224, "y": 6 },
                        { "x": 226, "y": 5 }
                    ],
                    "size": 10,
                    "color": "#000000FF"
                }],
                "spine": [{ "x": 5, "y": 5 }, { "x": 226, "y": 32 }],
                "vemX": 10,
                "vemY": 10,
                "parentId": null
            }

            let idMap = new utility.IdMap()
            let scap = utility.elementToSpineScap(simpleElement, idMap);
            expect(scap.split(os.EOL).map(l => l.split("\t"))).to.eql([
                ['#221', '27'],
                ['@10'],
                ['{'],
                ['', '#1', '0'],
                ['', '0', '27', '0'],
                ['', '1', '26', '0'],
                ['', '9', '24', '0'],
                ['', '24', '21', '0'],
                ['', '107', '12', '0'],
                ['', '156', '10', '0'],
                ['', '194', '7', '0'],
                ['', '211', '3', '0'],
                ['', '219', '1', '0'],
                ['', '221', '0', '0'],
                ['}'],
                ['']
            ]);
        });

        it('should get a simple scap for a one multi stroke element', function () {
            let simpleElement = {
                "id": "Element_1693387514674_1",
                "creationTime": 1693387514674,
                "x": 59,
                "y": 98,
                "strokes": [{
                    "id": "Stroke_1693387515637_0",
                    "creationTime": 1693387515637,
                    "path": [
                        { "x": 67, "y": 84 },
                        { "x": 68, "y": 84 },
                        { "x": 70, "y": 84 },
                        { "x": 82, "y": 80 },
                        { "x": 83, "y": 80 }
                    ],
                    "size": 10,
                    "color": "#000000FF"
                }, {
                    "id": "Stroke_1693387515179_0",
                    "creationTime": 1693387515179,
                    "path": [
                        { "x": 20, "y": 46 },
                        { "x": 21, "y": 46 },
                        { "x": 22, "y": 46 },
                        { "x": 33, "y": 40 },
                        { "x": 33, "y": 39 },
                        { "x": 34, "y": 39 }
                    ],
                    "size": 10,
                    "color": "#000000FF"
                }, {
                    "id": "Stroke_1693387514674_0",
                    "creationTime": 1693387514674,
                    "path": [
                        { "x": 5, "y": 10 },
                        { "x": 9, "y": 10 },
                        { "x": 14, "y": 5 },
                        { "x": 15, "y": 5 }
                    ],
                    "size": 10,
                    "color": "#000000FF"
                }
                ],
                "spine": [{
                    "x": 5,
                    "y": 5
                }, {
                    "x": 83,
                    "y": 84
                }
                ],
                "vemX": 10,
                "vemY": 10,
                "parentId": null
            }

            let idMap = new utility.IdMap()
            let scap = utility.elementToSpineScap(simpleElement, idMap);
            expect(scap.split(os.EOL).map(l => l.split("\t"))).to.eql([
                ['#78', '79'],
                ['@10'],
                ['{'],
                ['', '#1', '0'],
                ['', '62', '79', '0'],
                ['', '63', '79', '0'],
                ['', '65', '79', '0'],
                ['', '77', '75', '0'],
                ['', '78', '75', '0'],
                ['}'],
                ['{'],
                ['', '#2', '0'],
                ['', '15', '41', '0'],
                ['', '16', '41', '0'],
                ['', '17', '41', '0'],
                ['', '28', '35', '0'],
                ['', '28', '34', '0'],
                ['', '29', '34', '0'],
                ['}'],
                ['{'],
                ['', '#3', '0'],
                ['', '0', '5', '0'],
                ['', '4', '5', '0'],
                ['', '9', '0', '0'],
                ['', '10', '0', '0'],
                ['}'],
                ['']
            ]);
        });

        it('should convert a simple scap into a path', function () {
            let scap = [
                ["#226", "32"],
                ["@10"],
                ["{"],
                ["", "#16933847636090", "16933847636091"],
                ["", "5", "32", "0"],
                ["", "6", "31", "0"],
                ["", "14", "29", "0"],
                ["", "29", "26", "0"],
                ["", "112", "17", "0"],
                ["", "161", "15", "0"],
                ["", "199", "12", "0"],
                ["", "216", "8", "0"],
                ["", "224", "6", "0"],
                ["", "226", "5", "0"],
                ["}"],
                [""]
            ].map(l => l.join("\t")).join(os.EOL);
            expect(utility.scapToPath(scap, { x: 0, y: 0 })).to.eql([
                { "x": 5, "y": 32 },
                { "x": 6, "y": 31 },
                { "x": 14, "y": 29 },
                { "x": 29, "y": 26 },
                { "x": 112, "y": 17 },
                { "x": 161, "y": 15 },
                { "x": 199, "y": 12 },
                { "x": 216, "y": 8 },
                { "x": 224, "y": 6 },
                { "x": 226, "y": 5 }
            ])
        });
    })
});