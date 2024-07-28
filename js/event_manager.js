/**
 * Listens to global browser events 
 */

import { Buttons } from "./constants.js";
import { VectorUtil } from "./utils/vector_util.js";

export function EventManager(dashboard) {
    const DBL_CLICK_SPEED = 500;
    const DBL_CLICK_DIST = 10;

    let mDashboard = dashboard;


    let mLastClick = { x: -10, y: -10, time: Date.now() };

    let mCurrentMousePosistion;
    let mLongPressTimeout;

    let mKeysDown = [];

    let mStartPos = null;

    mDashboard.onResize(window.innerWidth, window.innerHeight);

    d3.select(window).on('resize', () => {
        mDashboard.onResize(window.innerWidth, window.innerHeight);
    });

    d3.select(document).on('keydown', function (e) {
        if (e.repeat) return;

        let key = e.key.toLowerCase();
        // we can sometimes still get a double down, so check for that to. 
        if (mKeysDown.includes(key)) return;
        mKeysDown.push(key)

        mDashboard.onKeyStateChange(mKeysDown);

        if ((e.ctrlKey || e.metaKey) && key == 'z') {
            // return the promise for syncronization control and testing purposes.
            return mDashboard.onUndo();
        } else if (((e.ctrlKey || e.metaKey) && key == 'y') || ((e.ctrlKey || e.metaKey) && e.shiftKey && key == 'z')) {
            // return the promise for syncronization control and testing purposes.
            return mDashboard.onRedo();
        } else if (/* delete */ e.which == 46) {
            mDashboard.onDelete();
        } else if (/* enter */ e.which == 13) {
            mDashboard.onEnter();
        } else if ((e.ctrlKey || e.metaKey) && key == 'm') {
            return mDashboard.onExportElementsSet();
        }
    });

    d3.select(document).on('keyup', function (e) {
        let key = e.key.toLowerCase();
        mKeysDown = mKeysDown.filter(i => i !== key);
        mDashboard.onKeyStateChange(mKeysDown);
    });

    d3.select("#interface-svg").on("pointerdown", (e) => {
        let screenCoords = { x: e.clientX, y: e.clientY, };
        mStartPos = screenCoords;
        mCurrentMousePosistion = mStartPos;
        clearTimeout(mLongPressTimeout);
        mLongPressTimeout = setTimeout(() => {
            let motion = VectorUtil.dist(mStartPos, mCurrentMousePosistion);
            if (motion < 5) {
                mDashboard.onLongPress(screenCoords);
            }
        }, 800);

        if (Date.now() - mLastClick.time < DBL_CLICK_SPEED &&
            VectorUtil.dist(screenCoords, mLastClick) < DBL_CLICK_DIST) {
            mDashboard.onDblClick(screenCoords);
        } else {
            mDashboard.onPointerDown(screenCoords);
        }
        mLastClick = { x: screenCoords.x, y: screenCoords.y, time: Date.now() };
    });

    d3.select(document).on('pointermove', (e) => {
        let screenCoords = { x: e.clientX, y: e.clientY };
        mCurrentMousePosistion = screenCoords;
        mDashboard.onPointerMove(screenCoords);
    });

    d3.select(document).on('pointerup', (e) => {
        let screenCoords = { x: e.clientX, y: e.clientY };
        mDashboard.onPointerUp(screenCoords)
        clearTimeout(mLongPressTimeout);
    });

    d3.select(document).on('wheel', function (e) {
        let screenCoords = { x: e.clientX, y: e.clientY };
        mDashboard.onWheel(screenCoords, e.deltaY)
    });

    /** useful test and development function: */
    // d3.select(document).on('pointerover pointerenter pointerdown pointermove pointerup pointercancel pointerout pointerleave gotpointercapture lostpointercapture abort afterprint animationend animationiteration animationstart beforeprint beforeunload blur canplay canplaythrough change click contextmenu copy cut dblclick drag dragend dragenter dragleave dragover dragstart drop durationchange ended error focus focusin focusout fullscreenchange fullscreenerror hashchange input invalid keydown keypress keyup load loadeddata loadedmetadata loadstart message mousedown mouseenter mouseleave mousemove mouseover mouseout mouseup mousewheel offline online open pagehide pageshow paste pause play playing popstate progress ratechange resize reset scroll search seeked seeking select show stalled storage submit suspend timeupdate toggle touchcancel touchend touchmove touchstart transitionend unload volumechange waiting wheel', function (e) {
    //     (console).log(e.type, e, { x: e.clientX, y: e.clientY })
    // });
}

