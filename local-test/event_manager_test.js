import { EventManager } from '../local/js/event_manager.js';

import * as  chai from 'chai';
let assert = chai.assert;
let expect = chai.expect;

import * as suite from "./test_utils/suite_enviroment.js"

describe('EventManager Tests', function () {
    let integrationEnv;
    beforeEach(function () {
        integrationEnv = suite.getIntegrationEnviroment();
        integrationEnv.documentLoad();
    });

    afterEach(function (done) {
        integrationEnv.cleanup(done);
    });

    describe('intialization test', function () {
        it('should instantiate', function () {
            new EventManager({ onResize: () => { } });
        });
    })

    describe('window resize test', function () {
        it('should call the resize functions', function () {
            let called = false;
            let eventManager = new EventManager({
                onResize: (w, h) => {
                    called = true;
                    assert.equal(w, 1000);
                    assert.equal(h, 800);
                }
            });

            d3.getCallbacks()['resize']();

            assert.equal(true, called);
        });
    })
});