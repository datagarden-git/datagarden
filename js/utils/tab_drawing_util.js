
export function TabDrawingUtil(context, interactionContext) {
    const INDENT_DEPTH = 0.1;
    const CLOSE_BUTTON_PADDING = 10;

    let ctx = context;
    let intCtx = interactionContext;

    function reset() {
        ctx.reset();
        intCtx.reset();
        intCtx.imageSmoothingEnabled = false;
    }

    function drawTab({ x, y, width, height, title, shadow, code, closeCode }) {
        let indent = Math.round(width * INDENT_DEPTH);
        ctx.save();

        ctx.beginPath();
        ctx.moveTo(x, y + height);
        ctx.lineTo(x + indent, y);
        ctx.lineTo(x + width - indent, y);
        ctx.lineTo(x + width, y + height);
        ctx.closePath();

        ctx.save();
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'black';
        if (shadow) {
            ctx.shadowColor = "black";
            ctx.shadowOffsetX = 1;
            ctx.shadowOffsetY = -1;
            ctx.shadowBlur = 3;
        } else {
            ctx.lineWidth = 2;
        }
        ctx.stroke();
        ctx.fill();
        ctx.restore();

        ctx.clip();

        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left'
        ctx.font = Math.round(height * 0.8) + "px DefaultFont";
        ctx.fillText(title, x + indent, y + height / 2);

        ctx.restore();

        // Interaction //
        if (code) {
            intCtx.save();
            intCtx.fillStyle = code;
            intCtx.beginPath();
            intCtx.moveTo(x, y + height);
            intCtx.lineTo(x + indent, y);
            intCtx.lineTo(x + width - indent, y);
            intCtx.lineTo(x + width, y + height);
            intCtx.fill();
            intCtx.restore();
        }

        if (closeCode) {
            let squareSize = height - CLOSE_BUTTON_PADDING * 2;
            let squareX = x + width - indent - CLOSE_BUTTON_PADDING - squareSize;
            let squareY = y + CLOSE_BUTTON_PADDING;

            ctx.save();
            ctx.fillStyle = 'white';
            ctx.strokeStyle = 'black';
            ctx.beginPath();
            ctx.rect(squareX, squareY, squareSize, squareSize)
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = 'black';
            ctx.font = Math.round(squareSize) + "px DefaultFont";
            ctx.fillText("X", squareX + 4, squareY + squareSize - 6);
            ctx.restore();

            intCtx.save();
            intCtx.fillStyle = closeCode;
            intCtx.beginPath();
            intCtx.rect(squareX, squareY, squareSize, squareSize)
            intCtx.closePath();
            intCtx.fill();
            intCtx.restore();
        }
    }

    function drawHorizontalLine(y, length, lineWidth) {
        ctx.save();

        ctx.strokeStyle = 'black';
        ctx.lineWidth = lineWidth;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(length, y);
        ctx.stroke();

        ctx.restore();
    }

    return {
        reset,
        drawTab,
        drawHorizontalLine,
    }

}