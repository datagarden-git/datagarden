import { ContextButtons } from "../constants.js";

export function CursorTag(svg) {
    let mImageData = {}
    mImageData[ContextButtons.PARENT] = 'img/parent_icon.svg';
    mImageData[ContextButtons.MERGE] = 'img/merge_elements.svg';

    let mImage = svg.append('image')
        .attr('width', 40)
        .attr('height', 40)
        .attr('id', 'cursor-tag');

    function show(tool) {
        if (!mImageData[tool]) {
            console.error('Not a supported tool', tool);
            return false;
        }
        mImage.attr('xlink:href', mImageData[tool]);
        mImage.style('opacity', '');
    }

    function onPointerMove(screenCoords, systemState) {
        mImage.attr('x', screenCoords.x + 10).attr('y', screenCoords.y + 10);
    }

    function hide() {
        mImage.style('opacity', '0');
    }

    return {
        show,
        hide,
        onPointerMove,
    }
}