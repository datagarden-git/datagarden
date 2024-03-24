import * as suite from "./test_utils/suite_enviroment.js"

describe('Suite Environment Test', function () {
    describe('intialization test', function () {
        it('should intialize', function (done) {
            suite.getIntegrationEnviroment().cleanup(done);
        });
    })
});