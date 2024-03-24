import { DataUtil } from "./data_util.js";
import { VectorUtil } from "./vector_util.js";

export function DrawingUtil(context, interactionContext, interfaceContext) {
    let ctx = context;
    let intCtx = interactionContext;
    let intfCtx = interfaceContext;

    // scale agnostic values
    const TARGET_INCREASE = 20;
    let mScale = 1;
    let mXTranslate = 0;

    function reset(zoomTransform) {
        ctx.reset();
        ctx.translate(zoomTransform.x, zoomTransform.y)
        ctx.scale(zoomTransform.k, zoomTransform.k)

        intCtx.reset();
        intCtx.translate(zoomTransform.x, zoomTransform.y)
        intCtx.scale(zoomTransform.k, zoomTransform.k)
        intCtx.imageSmoothingEnabled = false;

        mXTranslate = zoomTransform.x;
        mScale = zoomTransform.k;
    }

    function resetInterface(zoomTransform) {
        intfCtx.reset();
        intfCtx.translate(zoomTransform.x, zoomTransform.y)
        intfCtx.scale(zoomTransform.k, zoomTransform.k)
    }

    function drawContainerRect(x, y, width, height, code = null) {
        ctx.save();
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'black';
        ctx.beginPath();
        ctx.rect(x, y, width, height);
        ctx.stroke();

        ctx.shadowColor = "black";
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        ctx.shadowBlur = 3;
        ctx.fillStyle = "white";
        ctx.fillRect(x, y, width, height);

        // Interaction //
        if (code) {
            intCtx.save();
            intCtx.fillStyle = code;
            intCtx.fillRect(x, y, width, height);
            intCtx.restore();
        }

        ctx.restore();
    }

    function highlightContainerRect(x, y, width, height) {
        intfCtx.save();
        intfCtx.translate(x, y);
        intfCtx.lineWidth = 1;
        intfCtx.strokeStyle = "red";
        intfCtx.beginPath();
        intfCtx.rect(0, 0, width, height);
        intfCtx.stroke();
        intfCtx.restore();
    }

    function highlightCircle(cx, cy, r, color) {
        intfCtx.save();

        intfCtx.strokeStyle = color;
        intfCtx.lineWidth = 2;

        intfCtx.beginPath();
        intfCtx.arc(cx, cy, r, 0, 2 * Math.PI);
        intfCtx.stroke();

        intfCtx.restore();
    }

    function drawContainerRectSplitInteraction(x, y, width, height, percent, code) {
        intCtx.save();
        y += (1 - percent) * height;
        intCtx.fillStyle = code;
        intCtx.fillRect(x, y, width, height * percent);
        intCtx.restore();
    }

    function drawLetterCircle(cx, cy, r, letter, code = null) {
        ctx.save();

        ctx.strokeStyle = 'black';
        ctx.fillStyle = "white";
        ctx.lineWidth = 1;

        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "black";
        let fontSize = r * 1.5;
        ctx.font = fontSize + "px DefaultFont";
        let horizontalTextOffset = -fontSize * 0.4;
        let verticalTextOffset = fontSize / 2 - 1;

        ctx.fillText(letter, cx + horizontalTextOffset, cy + verticalTextOffset);

        // Interaction //
        if (code) {
            intCtx.save();
            intCtx.fillStyle = code;
            intCtx.beginPath();
            intCtx.arc(cx, cy, r, 0, 2 * Math.PI);
            intCtx.fill();
            intCtx.restore();
        }

        ctx.restore();
    }

    function drawColorCircle({ x, y, r, color, filled = true, code = null }) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, r, 0, 2 * Math.PI);

        if (filled) {
            ctx.fillStyle = color;
            ctx.fill();
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 1;
            ctx.stroke();
        } else {
            ctx.strokeStyle = "white";
            ctx.lineWidth = 4 / mScale;
            ctx.stroke();
            ctx.strokeStyle = color;
            ctx.lineWidth = 2 / mScale;
            ctx.stroke();
        }

        ctx.restore();

        // Interaction //
        if (code) {
            intCtx.save();
            intCtx.fillStyle = code;
            intCtx.beginPath();
            intCtx.arc(x, y, r, 0, 2 * Math.PI);
            intCtx.fill();
            intCtx.restore();
        }
    }

    function drawThumbnail({ strokes, x, y, size, shrink = 1 }) {
        const MIN_PIXELS = 1;
        let bb = DataUtil.getBoundingBox(strokes);

        let thumbnailSize = size * shrink;
        let scale = thumbnailSize / Math.max(bb.width, bb.height);
        let minStrokeSize = MIN_PIXELS / scale / mScale;

        let thumbnailWidth = scale * bb.width;
        let thumbnailHeight = scale * bb.height;

        let offsetX = x + (size - thumbnailWidth) / 2;
        let offsetY = y + (size - thumbnailHeight) / 2;

        ctx.save();
        ctx.translate(offsetX, offsetY);
        ctx.scale(scale, scale);

        ctx.beginPath();
        strokes.forEach(stroke => {
            ctx.beginPath();
            ctx.moveTo(stroke.path[0].x - bb.x, stroke.path[0].y - bb.y);
            stroke.path.forEach(p => {
                ctx.lineTo(p.x - bb.x, p.y - bb.y);
            });
            ctx.strokeStyle = "black";
            ctx.lineWidth = Math.max(stroke.size, minStrokeSize);
            ctx.stroke();
            ctx.fillStyle = stroke.color;
            ctx.fill();
        })
        ctx.restore();
    }

    function drawThumbnailCircle({ strokes, cx, cy, r, shadow = false, outline = null, code = null }) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, 2 * Math.PI);

        if (outline) {
            ctx.lineWidth = 5;
            ctx.strokeStyle = outline;
            ctx.stroke();
        }

        ctx.lineWidth = 1;
        ctx.strokeStyle = 'black';
        ctx.stroke();

        ctx.fillStyle = 'white';
        if (shadow) {
            ctx.shadowColor = "black";
            ctx.shadowOffsetX = 1;
            ctx.shadowOffsetY = 1;
            ctx.shadowBlur = 3;
        }
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, 2 * Math.PI);
        ctx.clip();
        drawThumbnail({ strokes, x: cx - r, y: cy - r, size: r * 2, shrink: 0.7 })
        ctx.restore();

        // Interaction //
        if (code) {
            intCtx.save();
            intCtx.fillStyle = code;
            intCtx.beginPath();
            intCtx.arc(cx, cy, r, 0, 2 * Math.PI);
            intCtx.fill();
            intCtx.restore();
        }
    }

    function drawLine({ x1, y1, x2, y2, width, color, dash = false, }) {
        ctx.save();

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);

        if (dash) ctx.setLineDash([dash / mScale, (dash * 2) / mScale]);
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.stroke();

        ctx.restore();
    }

    function drawBubble({ outline, pointer, color, alpha, shadow, code }) {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.beginPath();

        // move to the first point
        ctx.moveTo(outline[0].x, outline[0].y);
        let extendedOutline = outline.concat([outline[0]])

        for (var i = 1; i < extendedOutline.length - 1; i++) {
            var xc = (extendedOutline[i].x + extendedOutline[i + 1].x) / 2;
            var yc = (extendedOutline[i].y + extendedOutline[i + 1].y) / 2;
            ctx.quadraticCurveTo(extendedOutline[i].x, extendedOutline[i].y, xc, yc);
        }

        let middle, p1, p2, midpoint;
        if (pointer) {
            middle = VectorUtil.average([...outline]);
            let pointerDirection = VectorUtil.normalize(VectorUtil.subtract(pointer, middle));
            let widthX = Math.max(...outline.map(p => p.x)) - Math.min(...outline.map(p => p.x));
            let widthY = Math.max(...outline.map(p => p.y)) - Math.min(...outline.map(p => p.y))
            let width = widthX * pointerDirection.y * pointerDirection.y + widthY * pointerDirection.x * pointerDirection.x;
            p1 = VectorUtil.add(VectorUtil.scale({ x: -pointerDirection.y, y: pointerDirection.x }, width), middle);
            p2 = VectorUtil.add(VectorUtil.scale({ x: pointerDirection.y, y: -pointerDirection.x }, width), middle);
            midpoint = { x: middle.x * 0.9 + pointer.x * 0.1, y: middle.y * 0.9 + pointer.y * 0.1 };
            ctx.moveTo(middle.x, middle.y);
            ctx.bezierCurveTo(p1.x, p1.y, midpoint.x, midpoint.y, pointer.x, pointer.y);
            ctx.bezierCurveTo(midpoint.x, midpoint.y, p2.x, p2.y, middle.x, middle.y);
        }

        if (shadow) {
            ctx.shadowColor = "black";
            ctx.shadowOffsetX = 1;
            ctx.shadowOffsetY = 1;
            ctx.shadowBlur = 3;
        }
        ctx.fill('nonzero');
        ctx.restore();

        // Interaction //
        if (code) {
            intCtx.save();
            intCtx.fillStyle = code;
            intCtx.beginPath();
            intCtx.moveTo(outline[outline.length - 1].x, outline[outline.length - 1].y);
            outline.forEach(p => intCtx.lineTo(p.x, p.y));
            if (pointer) {
                intCtx.moveTo(middle.x, middle.y);
                intCtx.bezierCurveTo(p1.x, p1.y, midpoint.x, midpoint.y, pointer.x, pointer.y);
                intCtx.bezierCurveTo(midpoint.x, midpoint.y, p2.x, p2.y, middle.x, middle.y);
            }
            intCtx.fill();
            intCtx.restore();
        }
    }

    function drawTreeBubble({ x1, x2, y1, y2, pointer, color, alpha, shadow, code }) {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(x1, y1, x2 - x1, y2 - y1, (y2 - y1) / 2);

        let middle, p1, p2, midpoint;
        if (pointer) {
            middle = { x: (x2 - x1) / 2 + x1, y: (y2 - y1) / 2 + y1 };
            p1 = { x: x1 + (y2 - y1) / 2, y: (y2 - y1) / 2 + y1 };
            p2 = { x: x2 - (y2 - y1) / 2, y: (y2 - y1) / 2 + y1 };
            midpoint = { x: middle.x * 0.9 + pointer.x * 0.1, y: middle.y * 0.9 + pointer.y * 0.1 };

            ctx.moveTo(middle.x, middle.y);
            ctx.bezierCurveTo(p1.x, p1.y, midpoint.x, midpoint.y, pointer.x, pointer.y);
            ctx.bezierCurveTo(midpoint.x, midpoint.y, p2.x, p2.y, middle.x, middle.y);
        }

        if (shadow) {
            ctx.shadowColor = "black";
            ctx.shadowOffsetX = 1;
            ctx.shadowOffsetY = 1;
            ctx.shadowBlur = 3;
        }
        ctx.fill('nonzero');
        ctx.restore();

        // Interaction //
        if (code) {
            intCtx.save();
            intCtx.fillStyle = code;
            intCtx.beginPath();
            intCtx.roundRect(x1, y1, x2 - x1, y2 - y1, (y2 - y1) / 2);
            if (pointer) {
                intCtx.moveTo(middle.x, middle.y);
                intCtx.bezierCurveTo(p1.x, p1.y, midpoint.x, midpoint.y, pointer.x, pointer.y);
                intCtx.bezierCurveTo(midpoint.x, midpoint.y, p2.x, p2.y, middle.x, middle.y);
            }
            intCtx.fill();
            intCtx.restore();
        }
    }

    function highlightBubble(outline, color) {
        intfCtx.save();

        intfCtx.strokeStyle = color;
        intfCtx.lineWidth = 1;
        intfCtx.beginPath();

        // move to the first point
        intfCtx.moveTo(outline[0].x, outline[0].y);
        let extendedOutline = outline.concat([outline[0]])

        for (var i = 1; i < extendedOutline.length - 1; i++) {
            var xc = (extendedOutline[i].x + extendedOutline[i + 1].x) / 2;
            var yc = (extendedOutline[i].y + extendedOutline[i + 1].y) / 2;
            intfCtx.quadraticCurveTo(extendedOutline[i].x, extendedOutline[i].y, xc, yc);
        }

        intfCtx.stroke();
        intfCtx.restore();

        intfCtx.restore();
    }

    function highlightLink(start, end, r, color) {
        let triangle = getTrianglePointer(start, end, r, 10);

        intfCtx.save();

        intfCtx.fillStyle = color;
        intfCtx.beginPath();
        intfCtx.moveTo(triangle[0].x, triangle[0].y);
        intfCtx.lineTo(triangle[1].x, triangle[1].y);
        intfCtx.lineTo(triangle[2].x, triangle[2].y);
        intfCtx.fill();

        intfCtx.restore();
    }

    function getTrianglePointer(start, end, r, size) {
        if (!start) {
            start = { x: end.x, y: end.y - (2 * r + size) }
        }

        let direction = VectorUtil.normalize(VectorUtil.subtract(end, start));
        let triangleBase = VectorUtil.add(start, VectorUtil.scale(direction, r));

        return [
            VectorUtil.add(triangleBase, VectorUtil.scale({ y: -direction.x, x: direction.y }, size / 2)),
            VectorUtil.add(triangleBase, VectorUtil.scale({ y: direction.x, x: -direction.y }, size / 2)),
            VectorUtil.add(triangleBase, VectorUtil.scale(direction, size))
        ]
    }

    function drawStroke({ path, color, width, shadow = false, outline = null, code = null }) {
        ctx.save();
        ctx.beginPath();
        ctx.beginPath();
        ctx.moveTo(path[0].x, path[0].y);
        path.forEach(p => {
            ctx.lineTo(p.x, p.y);
        });

        if (outline) {
            ctx.lineWidth = 5;
            ctx.strokeStyle = outline;
            ctx.stroke();
        }

        if (shadow) {
            ctx.shadowColor = "black";
            ctx.shadowOffsetX = 1;
            ctx.shadowOffsetY = 1;
            ctx.shadowBlur = 3;
        }

        ctx.strokeStyle = "black";
        ctx.lineWidth = width;
        ctx.stroke();
        if (color) {
            ctx.fillStyle = color;
            ctx.fill();
        }

        ctx.restore();

        if (code) {
            intCtx.save();
            intCtx.strokeStyle = code;
            intCtx.lineWidth = width + TARGET_INCREASE / mScale;
            intCtx.beginPath();
            intCtx.moveTo(path[0].x - 1, path[0].y - 1);
            path.forEach(p => {
                intCtx.lineTo(p.x, p.y)
            });
            intCtx.stroke();
            intCtx.restore();
        }
    }

    function drawConnector(top, bottom, left, right) {
        let pathStart = [];
        let pathEnd = [];

        if (top) {
            pathStart.push({ x: top.x, y: top.y });
            pathStart.push({ x: top.x, y: top.y + 5 });
        } else if (bottom) {
            pathStart.push({ x: bottom.x, y: bottom.y });
            pathStart.push({ x: bottom.x, y: bottom.y - 5 });
        } else if (left) {
            pathStart.push({ x: left.x, y: left.y });
            pathStart.push({ x: left.x + 5, y: left.y });
        } else { console.error("bad parameters", top, left, bottom, right); return; }

        if (right) {
            pathEnd.unshift({ x: right.x, y: right.y })
            pathEnd.unshift({ x: right.x - 5, y: right.y })
        } else if (left) {
            pathEnd.unshift({ x: left.x, y: left.y })
            pathEnd.unshift({ x: left.x + 5, y: left.y })
        } else if (bottom) {
            pathEnd.unshift({ x: bottom.x, y: bottom.y })
            pathEnd.unshift({ x: bottom.x, y: bottom.y - 5 })
        } else { console.error("bad parameters", top, left, bottom, right); return; }

        let midpoint = {
            x: (pathStart[pathStart.length - 1].x + pathEnd[0].x) / 2,
            y: (pathStart[pathStart.length - 1].y + pathEnd[0].y) / 2,
        }

        // TODO: make better lines

        path = pathStart.concat(pathEnd);

        // draw the tails
        ctx.save();
        ctx.moveTo(path[0].x, path[0].y);
        ctx.beginPath();
        path.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.stroke();
        ctx.restore();

        return midpoint;
    }

    function highlightBoundingBox(box) {
        intfCtx.save();
        intfCtx.lineWidth = 2 / mScale;
        intfCtx.setLineDash([5 / mScale, 10 / mScale]);
        intfCtx.strokeStyle = "grey";
        intfCtx.beginPath();
        intfCtx.rect(box.x, box.y, box.width, box.height);
        intfCtx.stroke();
        intfCtx.restore();
    }

    function drawSpine({ path, color = "blue" }) {
        intfCtx.save();
        intfCtx.setLineDash([5 / mScale, 10 / mScale]);
        intfCtx.beginPath();
        path.forEach(p => {
            intfCtx.lineTo(p.x, p.y)
        });
        intfCtx.strokeStyle = "white";
        intfCtx.lineWidth = 4 / mScale;
        intfCtx.stroke();
        intfCtx.strokeStyle = color;
        intfCtx.lineWidth = 2 / mScale;
        intfCtx.stroke();
        intfCtx.restore();
    }

    function drawRoot({ root, origin = null, color = "green" }) {
        intfCtx.save();
        intfCtx.beginPath();
        intfCtx.arc(root.x, root.y, 5, 0, 2 * Math.PI);
        intfCtx.strokeStyle = "white";
        intfCtx.lineWidth = 4 / mScale;
        intfCtx.stroke();
        intfCtx.strokeStyle = color;
        intfCtx.lineWidth = 2 / mScale;
        intfCtx.stroke();

        if (origin) {
            intfCtx.setLineDash([5 / mScale, 5 / mScale]);
            intfCtx.beginPath();
            intfCtx.moveTo(root.x, root.y)
            intfCtx.lineTo(origin.x, origin.y)
            intfCtx.strokeStyle = "white";
            intfCtx.lineWidth = 2 / mScale;
            intfCtx.stroke();
            intfCtx.strokeStyle = "green";
            intfCtx.lineWidth = 1 / mScale;
            intfCtx.stroke();
        }

        intfCtx.restore();
    }

    function drawAngle({ root, angle, color = "red" }) {
        let length = 20;
        let arrowLength = 5;
        let point = VectorUtil.add(root, VectorUtil.scale(angle, length));
        intfCtx.save();
        intfCtx.beginPath();
        intfCtx.moveTo(root.x, root.y);
        intfCtx.lineTo(point.x, point.y);

        let arrow1 = VectorUtil.add(point, VectorUtil.scale(VectorUtil.rotate(angle, Math.PI * 0.75), arrowLength));
        intfCtx.moveTo(arrow1.x, arrow1.y);
        intfCtx.lineTo(point.x, point.y);

        let arrow2 = VectorUtil.add(point, VectorUtil.scale(VectorUtil.rotate(angle, -Math.PI * 0.75), arrowLength));
        intfCtx.moveTo(arrow2.x, arrow2.y);
        intfCtx.lineTo(point.x, point.y);

        intfCtx.strokeStyle = "white";
        intfCtx.lineWidth = 4 / mScale;
        intfCtx.stroke();
        intfCtx.strokeStyle = color;
        intfCtx.lineWidth = 2 / mScale;
        intfCtx.stroke();
        intfCtx.restore();
    }


    function drawInterfaceSelectionBubble(path, color) {
        intfCtx.save();
        intfCtx.setLineDash([5 / mScale, 10 / mScale]);
        intfCtx.lineWidth = 2 / mScale;
        intfCtx.globalCompositeOperation = "destination-over"
        intfCtx.fillStyle = color;
        intfCtx.beginPath();
        path.forEach(p => {
            intfCtx.lineTo(p.x, p.y)
        });
        intfCtx.lineTo(path[0].x, path[0].y)
        intfCtx.stroke();
        intfCtx.fill();
        intfCtx.restore();
    }

    function drawBand(color, y1, y2) {
        ctx.save();

        ctx.scale(1 / mScale, 1);
        ctx.translate(-mXTranslate, 0)

        ctx.beginPath()
        ctx.fillStyle = color;
        ctx.rect(0, y1, 3000, y2 - y1);

        ctx.fill();

        ctx.restore();
    }

    function drawRect({ x, y, height, width, color, shadow = false, code = null }) {
        ctx.save();
        ctx.beginPath()
        ctx.rect(x, y, width, height);

        if (shadow) {
            ctx.shadowColor = "black";
            ctx.shadowOffsetX = 1;
            ctx.shadowOffsetY = 1;
            ctx.shadowBlur = 3;
        }

        ctx.fillStyle = color;
        ctx.fill();
        ctx.restore();

        if (code) {
            intCtx.save();
            intCtx.fillStyle = code;
            intCtx.beginPath();
            intCtx.rect(x, y, width, height);
            intCtx.fill();
            intCtx.restore();
        }
    }

    const TEXT_HORIZONTAL_PADDING = 10;
    const TEXT_FONT_STRING = "px DefaultFont";
    const TEXT_SHRINK = 0.8;
    function drawStringNode({ label, x, y, height, color = 'black', shadow = false, outline = null, box = true, background = 'white', code = null }) {
        let width = measureStringNode(label, height);
        if (box) {
            ctx.save();
            ctx.beginPath();
            ctx.rect(x, y, width, height);

            if (outline) {
                ctx.lineWidth = 5;
                ctx.strokeStyle = outline;
                ctx.stroke();
            }
            ctx.lineWidth = 1;
            ctx.strokeStyle = 'black';
            ctx.stroke();

            if (shadow) {
                ctx.shadowColor = "black";
                ctx.shadowOffsetX = 1;
                ctx.shadowOffsetY = 1;
                ctx.shadowBlur = 3;
            }
            ctx.fillStyle = background;
            ctx.fill();
            ctx.restore();
        }

        ctx.save();
        if (!box) {
            if (outline) {
                ctx.save();
                ctx.strokeStyle = outline;
                ctx.lineWidth = 4;
                ctx.strokeText(label, x + TEXT_HORIZONTAL_PADDING, y + height / 2);
                ctx.restore();
            }

            if (shadow) {
                ctx.shadowColor = "black";
                ctx.shadowOffsetX = 1;
                ctx.shadowOffsetY = 1;
                ctx.shadowBlur = 3;
            }
        }

        ctx.fillStyle = color;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left'
        ctx.font = Math.round(height * TEXT_SHRINK) + TEXT_FONT_STRING;
        ctx.fillText(label, x + TEXT_HORIZONTAL_PADDING, y + height / 2);

        ctx.restore();

        if (code) {
            intCtx.save();
            intCtx.fillStyle = code;
            intCtx.beginPath();
            intCtx.rect(x, y, width, height);
            intCtx.fill();
            intCtx.restore();
        }
    }

    function drawText({ x, y, height, text, color = "black" }) {
        ctx.save();
        ctx.fillStyle = 'black';
        ctx.textBaseline = 'top';
        ctx.textAlign = 'left'
        ctx.fillStyle = color
        ctx.font = Math.round(height) + TEXT_FONT_STRING;
        ctx.fillText(text, x, y);
        ctx.restore();
    }

    function measureStringNode(text, height) {
        ctx.save();
        ctx.font = Math.round(height * TEXT_SHRINK) + TEXT_FONT_STRING;
        let width = ctx.measureText(text).width + TEXT_HORIZONTAL_PADDING * 2;
        ctx.restore();
        return width;
    }

    function drawCircleTarget({ cx, cy, r, code }) {
        intCtx.save();
        intCtx.fillStyle = code;
        intCtx.beginPath();
        intCtx.arc(cx, cy, r, 0, 2 * Math.PI);
        intCtx.fill();
        intCtx.restore();
    }

    function drawImage({ x, y, height, width, shadow = false, url }) {
        if (!ImageHelper[url]) { console.error("Image not preloaded"); return; }
        ctx.save();
        try {

            if (shadow) {
                ctx.shadowColor = "black";
                ctx.shadowOffsetX = 1;
                ctx.shadowOffsetY = 1;
                ctx.shadowBlur = 3;
            }
            ctx.drawImage(ImageHelper[url], x, y, width, height);

        } catch (e) {
            console.error("Failed to draw " + url);
        }
        ctx.restore();
    }

    return {
        reset,
        resetInterface,
        drawContainerRect,
        highlightContainerRect,
        highlightCircle,
        drawContainerRectSplitInteraction,
        drawLetterCircle,
        drawColorCircle,
        drawThumbnail,
        drawThumbnailCircle,
        drawLine,
        drawStroke,
        drawConnector,
        drawBubble,
        drawTreeBubble,
        highlightBubble,
        highlightLink,
        getTrianglePointer,
        highlightBoundingBox,
        drawSpine,
        drawRoot,
        drawAngle,
        drawInterfaceSelectionBubble,
        drawBand,
        drawRect,
        drawStringNode,
        measureStringNode,
        drawCircleTarget,
        drawText,
        drawImage,
    }
}

const ImageHelper = {}
function loadImage(url) {
    ImageHelper[url] = new Image();
    ImageHelper[url].src = url;
}
loadImage("img/angle_-90_abs.svg");
loadImage("img/angle_-90_rel.svg");
loadImage("img/angle_-180_abs.svg");
loadImage("img/angle_-180_rel.svg");
loadImage("img/angle_0_abs.svg");
loadImage("img/angle_0_rel.svg");
loadImage("img/angle_90_abs.svg");
loadImage("img/angle_90_rel.svg");
loadImage("img/angle_180_abs.svg");
loadImage("img/angle_180_rel.svg");