export let IdUtil = function () {
    let idCounter = 0;
    let lastGet = Date.now();
    function getUniqueId(classFunction) {
        // reset the counter when we aren't getting all at the same time.
        if (Date.now() > lastGet) { idCounter = 0; }
        lastGet = Date.now();

        return classFunction.name + "_" + Date.now() + "_" + idCounter++;
    }

    function isType(id, classFunction) {
        if (typeof id != "string") {
            console.error("invalid id", id);
            return false;
        }
        return id.split("_")[0] == classFunction.name;
    }

    return {
        getUniqueId,
        isType,
    }
}();