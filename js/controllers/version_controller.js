export function VersionController() {
    let mStack = [];
    let mRedoCache = [];
    let mModelStash = null;

    async function setStash(modelStash) {
        mStack = await modelStash.getStack();
        mModelStash = modelStash;
    }

    function getStash() {
        return mModelStash;
    }

    function stack(obj) {
        if (!mModelStash) return;
        mRedoCache = [];
        let versionNumber = mModelStash.stash(obj);
        mStack.push(versionNumber)
    }

    function replace(obj) {
        if (!mModelStash) return;
        mRedoCache = [];
        mModelStash.stash(obj, mStack[mStack.length - 1]);
    }

    async function reverse() {
        if (!mModelStash || mStack.length == 0) {
            return;
        }
        mRedoCache.push(mStack.pop());
        return await mModelStash.fetch(mStack[mStack.length - 1])
    }

    async function advance() {
        if (!mModelStash || mRedoCache.length == 0) {
            return;
        }
        mStack.push(mRedoCache.pop());
        return await mModelStash.fetch(mStack[mStack.length - 1])
    }

    return {
        setStash,
        getStash,
        stack,
        replace,
        reverse,
        advance,
    }
}

export function MemoryStash() {
    let mStash = {};
    function getStack() {
        return Object.keys(mStash);
    }

    function fetch(id) {
        return mStash[id];
    }

    function stash(obj, versionNumber = null) {
        if (!versionNumber) versionNumber = Date.now();
        mStash[versionNumber] = obj;
        return versionNumber;
    }

    return {
        getStack,
        stash,
        fetch,
    }
}