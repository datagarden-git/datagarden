import { DataUtil } from "./data_util.js";

export function OverlayUtil() {
    let mCanvas, ctx;
    let mZoomTransform = { x: 0, y: 0, k: 0 };

    const OVERLAY_COLOR = 'white';

    function reset(zoomTransform) {
        if (!mCanvas) {
            mCanvas = document.createElement('canvas');
            ctx = mCanvas.getContext('2d');
        }

        mZoomTransform = zoomTransform;
        ctx.reset();
        ctx.translate(zoomTransform.x, zoomTransform.y)
        ctx.scale(zoomTransform.k, zoomTransform.k)
        ctx.fillStyle = OVERLAY_COLOR;
    }

    function onResize(width, height) {
        if (!mCanvas) {
            mCanvas = document.createElement('canvas');
            ctx = mCanvas.getContext('2d');
        }

        mCanvas.width = width;
        mCanvas.height = height;
    }

    function drawBubble(bubble) {
        ctx.beginPath();
        bubble.forEach(p => {
            ctx.lineTo(p.x, p.y)
        });
        ctx.lineTo(bubble[0].x, bubble[0].y)
        ctx.closePath();
        ctx.fill();
    }

    function covered(coords) {
        if (!coords || !DataUtil.isNumeric(coords.x) || !DataUtil.isNumeric(coords.y)) { console.error("Invalid coords", coords); return false; }
        let canvasCoords = {
            x: coords.x * mZoomTransform.k + mZoomTransform.x,
            y: coords.y * mZoomTransform.k + mZoomTransform.y
        }
        if (canvasCoords.x < 0 || mZoomTransform.x > mCanvas.width || canvasCoords.y < 0 || canvasCoords.y > mCanvas.height) {
            return false;
        }

        let p = ctx.getImageData(canvasCoords.x, canvasCoords.y, 1, 1).data;
        let hex = DataUtil.rgbaToHex(p[0], p[1], p[2], p[3]);
        if (hex != '#00000000') return true;
        else return false;
    }

    return {
        reset,
        onResize,
        drawBubble,
        covered,
    }
}