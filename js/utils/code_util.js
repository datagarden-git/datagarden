import { DataUtil } from "./data_util.js";

export function CodeUtil() {
    const NO_TYPE = 'no_type_specified';

    let mInteractionLookup = {};
    let mReverseInteractionLookup = {};
    let mColorIndex = 100;

    function getCode(id, type = NO_TYPE) {
        if (mReverseInteractionLookup[id + "_" + type]) {
            return mReverseInteractionLookup[id + "_" + type];
        } else {
            let code = DataUtil.numToColor(mColorIndex += 100);
            mInteractionLookup[code] = { id, type };
            mReverseInteractionLookup[id + "_" + type] = code;
            return code;
        }
    }

    function getTarget(screenCoords, interactionCanvas) {
        let boundingBox = interactionCanvas.node().getBoundingClientRect();
        let ctx = interactionCanvas.node().getContext('2d');
        if (screenCoords.x - boundingBox.x > 0 && screenCoords.y - boundingBox.y > 0 &&
            screenCoords.x - boundingBox.x < boundingBox.width && screenCoords.y - boundingBox.y < boundingBox.height) {
            let p = ctx.getImageData(screenCoords.x - boundingBox.x, screenCoords.y - boundingBox.y, 1, 1).data;
            let hex = DataUtil.rgbToHex(p[0], p[1], p[2]);
            if (hex == "#000000") return null;
            if (!mInteractionLookup[hex]) {
                // alising problem, recursively shuffle 1 over until we get a valid target. 
                // shouldn't loop as we will eventually wander off the screen. 
                return getTarget({ x: screenCoords.x + 1, y: screenCoords.y }, interactionCanvas)
            } else {
                return mInteractionLookup[hex];
            }
        } else {
            return null;
        }
    }

    function clear() {
        mInteractionLookup = {};
        mReverseInteractionLookup = {};
        mColorIndex = 100;
    }

    return {
        getCode,
        getTarget,
        clear,
    }
}