import { DataModel } from "../data_model.js";
import { DataUtil } from "../utils/data_util.js";
import { DrawingUtil } from "../utils/drawing_util.js";
import { IdUtil } from "../utils/id_util.js";
import { CodeUtil } from "../utils/code_util.js";
import { PathUtil } from "../utils/path_util.js";
import { ValUtil } from "../utils/value_util.js";
import { VectorUtil } from "../utils/vector_util.js";
import { Buttons, ContextButtons } from "../constants.js";
import { Data } from "../data_structs.js";
import { ToolTip } from "../menu/tooltip.js";

export function CanvasController(mColorMap) {
    const DRAWING = 'drawing';
    const ANGLING = 'angling';
    const SPINING = 'spining';
    const LASSO = 'lasso';
    const PANNING = 'panning';
    const ZOOMING = 'zooming';
    const DRAGGING = 'dragging';

    const SELECTION_BUBBLE_COLOR = "#55555555";

    let mCanvas = d3.select('#canvas-view-container').select('.canvas-container').append('canvas')
        .classed('view-canvas', true);
    let mInterfaceCanvas = d3.select("#canvas-view-container").select('.canvas-container').append('canvas')
        .classed('interface-canvas', true);
    let mInteractionCanvas = d3.select("#canvas-view-container").select('.canvas-container').append('canvas')
        .style("opacity", 0)
        .classed('interaction-canvas', true);
    let mDataTooltip = new ToolTip();

    let mDrawingUtil = new DrawingUtil(
        mCanvas.node().getContext("2d"),
        mInteractionCanvas.node().getContext("2d"),
        mInterfaceCanvas.node().getContext("2d"),
    );

    let mCodeUtil = new CodeUtil();

    let mNewStrokeCallback = () => { };
    let mHighlightCallback = () => { };
    let mSelectionCallback = () => { };
    let mContextMenuCallback = () => { };
    let mParentUpdateCallback = () => { };
    let mMergeCallback = () => { };
    let mTranslateStrokesCallback = () => { };
    let mUpdateAngleCallback = () => { }
    let mUpdateSpineCallback = () => { }

    let mZoomTransform = d3.zoomIdentity;
    let mBrushActivePosition = false;
    let mStructureMode = null;

    let mBrushOptions = {
        size: 1,
        color: "#000000FF"
    }

    let mHighlightIds = [];
    let mSelectionIds = [];

    let mModel = new DataModel();
    let mProjections = {};
    let mMappedData = {};
    let mBoundingBoxes = [];
    let mInteraction = null;

    function onModelUpdate(model) {
        mModel = model;
        mProjections = {};
        mMappedData = {};
        mBoundingBoxes = [];
        let elements = model.getElements();
        elements.forEach(element => {
            if (element.parentId) {
                let parent = elements.find(e => e.id == element.parentId);
                if (!parent) { console.error("Invalid parent id!", element.parentId); return; }
                mProjections[element.id] = PathUtil.getClosestPointOnPath(element.root, parent.spine);
            }

            mBoundingBoxes.push({ id: element.id, box: DataUtil.getBoundingBox(element) });

            let data = model.getElementMappedValues(element.id);
            element.strokes.forEach(stroke => {
                mMappedData[stroke.id] = data;
            })
        })
        mHighlightIds = [];
        mSelectionIds = mSelectionIds.filter(id => !DataUtil.isDataId(id) || DataUtil.itemExists(id, model));
        onSelection(mSelectionIds);
        draw();
    }

    function onHighlight(highlightedIds) {
        mHighlightIds = [];
        if (!highlightedIds || !Array.isArray(highlightedIds)) return;
        highlightedIds.forEach(id => {
            if (IdUtil.isType(id, Data.Element)) {
                let element = mModel.getElement(id);
                if (!element) { console.error("Invalid state, id not found", id); return id; }
                mHighlightIds.push(...element.strokes.map(s => s.id))
            } else {
                return mHighlightIds.push(id);
            }
        });

        draw();
    }

    function onSelection(selectedIds) {
        mSelectionIds = [];
        if (!selectedIds || !Array.isArray(selectedIds)) return;
        selectedIds.forEach(id => {
            if (IdUtil.isType(id, Data.Element)) {
                let element = mModel.getElement(id);
                if (!element) { console.error("Invalid state, id not found", id); return id; }
                mSelectionIds.push(...element.strokes.map(s => s.id))
            } else {
                return mSelectionIds.push(id);
            }
        });
        draw();
    }

    function onPointerDown(screenCoords, systemState) {
        if (ValUtil.outOfBounds(screenCoords, mInteractionCanvas.node().getBoundingClientRect())) return;
        let target = mCodeUtil.getTarget(screenCoords, mInteractionCanvas);

        if (systemState.getToolState() == Buttons.PANNING_BUTTON ||
            (!target && !systemState.isShift() && !systemState.isCtrl() && systemState.getToolState() == Buttons.CURSOR_BUTTON)) {
            mInteraction = {
                type: PANNING,
                x: mZoomTransform.x,
                y: mZoomTransform.y,
                scale: mZoomTransform.k,
                start: screenCoords,
            };
        } else if (systemState.getToolState() == Buttons.ZOOM_BUTTON) {
            let zoomCenter = screenToModelCoords(screenCoords);
            mInteraction = {
                type: ZOOMING,
                pointerX: zoomCenter.x,
                pointerY: zoomCenter.y,
                transformX: mZoomTransform.x,
                transformY: mZoomTransform.y,
                scale: mZoomTransform.k,
                start: screenCoords,
            };
        } else if (systemState.getToolState() == Buttons.BRUSH_BUTTON && !systemState.isShift() && !systemState.isCtrl()) {
            mInteraction = {
                type: DRAWING,
                currentStroke: [screenToModelCoords(screenCoords)],
                screenStart: screenCoords,
                startTime: Date.now(),
                startTarget: target,
            };
        } else if (systemState.getToolState() == Buttons.ANGLE_BRUSH_BUTTON && !systemState.isShift() && !systemState.isCtrl()) {
            let coords = screenToModelCoords(screenCoords);
            mInteraction = {
                type: ANGLING,
                currentStroke: [screenToModelCoords(screenCoords)],
                screenStart: screenCoords,
                targetElement: getIntendedElementId(coords, coords),
            };
        } else if (systemState.getToolState() == Buttons.SPINE_BRUSH_BUTTON && !systemState.isShift() && !systemState.isCtrl()) {
            let coords = screenToModelCoords(screenCoords);
            mInteraction = {
                type: SPINING,
                currentStroke: [screenToModelCoords(screenCoords)],
                screenStart: screenCoords,
                targetElement: getIntendedElementId(coords, coords),
            };
        } else if (systemState.getToolState() == Buttons.SELECTION_BUTTON ||
            systemState.getToolState() == Buttons.CURSOR_BUTTON ||
            ((systemState.isShift() || systemState.isCtrl()))) {
            if (target) {
                if (systemState.isShift()) {
                    mSelectionIds.push(target.id);
                    mSelectionCallback(mSelectionIds);
                } else if (systemState.isCtrl()) {
                    if (mSelectionIds.includes(target.id)) {
                        mSelectionIds.splice(mSelectionIds.indexOf(target.id), 1);
                        mSelectionCallback(mSelectionIds);
                    }
                } else if (!mSelectionIds.includes(target.id)) {
                    mSelectionIds = [target.id];
                    mSelectionCallback(mSelectionIds);
                }
                mInteraction = {
                    type: DRAGGING,
                    start: screenCoords,
                    startTarget: target,
                };
            } else {
                // we didn't mouse down on anything start a lasso. 
                // Cursor panning is handled above
                mInteraction = {
                    type: LASSO,
                    line: [screenToModelCoords(screenCoords)]
                };
            }
            return true;
        } else if (systemState.getToolState() == ContextButtons.PARENT || systemState.getToolState() == ContextButtons.MERGE) {
            if (target && IdUtil.isType(target.id, Data.Stroke)) {
                let targetElement = mModel.getElementForStroke(target.id);
                if (!targetElement) { console.error("Invalid stroke id", target.id); return; }
                if (systemState.getToolState() == ContextButtons.PARENT) {
                    let elementIds = getSelectedElementIds().filter(id => id != targetElement.id);
                    if (elementIds.length > 0) {
                        mParentUpdateCallback(elementIds, targetElement.id);
                    }
                } else {
                    mMergeCallback(mSelectionIds.filter(id => IdUtil.isType(id, Data.Stroke)), targetElement.id);
                }
            } else if (systemState.getToolState() == ContextButtons.MERGE) {
                mMergeCallback(mSelectionIds.filter(id => IdUtil.isType(id, Data.Stroke)));
            }
        } else {
            console.error('State not handled', systemState.getToolState())
        }

        draw();
    }

    function onDblClick(screenCoords, systemState) {
        if (ValUtil.outOfBounds(screenCoords, mInteractionCanvas.node().getBoundingClientRect())) return;
        let target = mCodeUtil.getTarget(screenCoords, mInteractionCanvas);
        if (target && IdUtil.isType(target.id, Data.Stroke)) {
            let element = mModel.getElementForStroke(target.id);
            if (!element) { console.error("invalid stroke!"); return; }
            let decendants = mModel.getElementDecendants(element.id);
            mSelectionIds = [element.id].concat(decendants.map(d => d.id));
            mSelectionCallback(mSelectionIds);
        }
    }

    function onPointerMove(screenCoords, systemState) {
        if (mInteraction && mInteraction.type == PANNING) {
            let mouseDist = VectorUtil.subtract(screenCoords, mInteraction.start);
            let translate = VectorUtil.add(mInteraction, mouseDist);
            mZoomTransform = d3.zoomIdentity.translate(translate.x, translate.y).scale(mInteraction.scale);
        } else if (mInteraction && mInteraction.type == ZOOMING) {
            let mouseDist = screenCoords.y - mInteraction.start.y;
            let scale = mInteraction.scale * (1 + (mouseDist / mInterfaceCanvas.attr('height')));
            let zoomChange = scale - mInteraction.scale;
            let transformX = -(mInteraction.pointerX * zoomChange) + mInteraction.transformX;
            let transformY = -(mInteraction.pointerY * zoomChange) + mInteraction.transformY;
            mZoomTransform = d3.zoomIdentity.translate(transformX, transformY).scale(scale);
        } else if (mInteraction && mInteraction.type == DRAWING) {
            mInteraction.currentStroke.push(screenToModelCoords(screenCoords));
        } else if (mInteraction && mInteraction.type == ANGLING || mInteraction && mInteraction.type == SPINING) {
            mInteraction.currentStroke.push(screenToModelCoords(screenCoords));
            mInteraction.targetElement = getIntendedElementId(
                mInteraction.currentStroke[0],
                mInteraction.currentStroke[mInteraction.currentStroke.length - 1]);
        } else if (mInteraction && mInteraction.type == LASSO) {
            mInteraction.line.push(screenToModelCoords(screenCoords));
        } else if (mInteraction && mInteraction.type == DRAGGING) {
            mInteraction.translation = VectorUtil.subtract(screenToModelCoords(screenCoords), screenToModelCoords(mInteraction.start));
        } else if (mInteraction) {
            console.error("Not Handled!", mInteraction);
        } else if (systemState.getToolState() == Buttons.BRUSH_BUTTON) {
            mBrushActivePosition = [screenToModelCoords(screenCoords)];
        }

        let target = mCodeUtil.getTarget(screenCoords, mInteractionCanvas);
        if (!mInteraction || mInteraction.type != DRAWING) {
            if (target) {
                let element = mModel.getElementForStroke(target.id);
                mHighlightIds = element.strokes.map(s => s.id);
                mHighlightCallback(mHighlightIds);
            } else {
                mHighlightIds = [];
                mHighlightCallback([]);
            }
        }

        if (target && (systemState.getToolState() == Buttons.CURSOR_BUTTON ||
            systemState.getToolState() == Buttons.SELECTION_BUTTON) &&
            IdUtil.isType(target.id, Data.Stroke)) {
            mDataTooltip.show(screenCoords.x + 20, screenCoords.y + 20,
                mMappedData[target.id].map(item => item.dimensionName + ": " + item.value).join(", "));
        } else {
            mDataTooltip.hide();
        }

        if (mBrushActivePosition && systemState.getToolState() != Buttons.BRUSH_BUTTON) {
            mBrushActivePosition = false;
        }

        draw();
    }

    function onPointerUp(screenCoords, systemState) {
        let interaction = mInteraction;
        mInteraction = null;

        if (interaction && interaction.type == DRAWING) {
            if ((interaction.currentStroke.length > 10 || VectorUtil.dist(interaction.screenStart, screenCoords) > 10)) {
                let storke = new Data.Stroke(interaction.currentStroke, mBrushOptions.size, mBrushOptions.color);
                mNewStrokeCallback(storke);
            } else if (Date.now() - interaction.startTime < 1000 && interaction.startTarget) {
                mSelectionIds = [interaction.startTarget.id];
                mSelectionCallback(mSelectionIds);
                mContextMenuCallback(screenCoords, mSelectionIds, interaction.startTarget.id);
            }
        } else if (interaction && interaction.type == ANGLING) {
            if (interaction.targetElement && (interaction.currentStroke.length > 10 || VectorUtil.dist(interaction.screenStart, screenCoords) > 10)) {
                let root = interaction.currentStroke[0];
                let angle = VectorUtil.normalize(VectorUtil.subtract(interaction.currentStroke[interaction.currentStroke.length - 1], interaction.currentStroke[0]));
                mUpdateAngleCallback(interaction.targetElement, root, angle);
            }
        } else if (interaction && interaction.type == SPINING) {
            if (interaction.targetElement && (interaction.currentStroke.length > 10 || VectorUtil.dist(interaction.screenStart, screenCoords) > 10)) {
                mUpdateSpineCallback(interaction.targetElement, interaction.currentStroke);
            }
        } else if (interaction && interaction.type == LASSO) {
            if (!systemState.isShift() && !systemState.isCtrl()) {
                mSelectionIds = [];
            }
            mModel.getStrokes().forEach(stroke => {
                let coveredPoints = stroke.path.reduce((count, p) => {
                    if (interfaceIsCovered(modelToScreenCoords(p))) { count++; }
                    return count;
                }, 0)
                if (coveredPoints / stroke.path.length > 0.7) {
                    if (systemState.isCtrl()) {
                        mSelectionIds.splice(mSelectionIds.indexOf(stroke.id), 1);
                    } else {
                        mSelectionIds.push(stroke.id);
                    }
                }
            });
            mSelectionCallback(mSelectionIds);
        } else if (interaction && interaction.type == DRAGGING && !systemState.isShift() && !systemState.isCtrl()) {
            let moveDist = VectorUtil.dist(interaction.start, screenCoords);
            if (moveDist < 5) {
                mContextMenuCallback(screenCoords, mSelectionIds, interaction.startTarget.id);
            } else {
                mTranslateStrokesCallback(mSelectionIds, VectorUtil.subtract(screenToModelCoords(screenCoords), screenToModelCoords(interaction.start)));
            }
        } else if (interaction && interaction.type == PANNING &&
            systemState.getToolState() == Buttons.CURSOR_BUTTON &&
            VectorUtil.dist(interaction.start, screenCoords) < 3) {
            mSelectionIds = [];
            mSelectionCallback(mSelectionIds);
        }

        draw();
    }

    function onWheel(screenCoords, delta, systemState) {
        let currZoom = mZoomTransform.k;
        let scale = currZoom * (1 - delta / 1000);
        let zoomChange = scale - mZoomTransform.k;
        let transformX = -(screenCoords.x * zoomChange) + mZoomTransform.x;
        let transformY = -(screenCoords.y * zoomChange) + mZoomTransform.y;
        mZoomTransform = d3.zoomIdentity.translate(transformX, transformY).scale(scale);
        draw();
    }

    function onResize(width, height) {
        d3.select("#canvas-view-container")
            .style('width', width + "px")
            .style('height', height + "px");
        mCanvas
            .attr('width', width)
            .attr('height', height);
        mInterfaceCanvas
            .attr('width', width)
            .attr('height', height);
        mInteractionCanvas
            .attr('width', width)
            .attr('height', height);
        draw();
    }

    function setColor(color) {
        mBrushOptions.color = color;
        draw();
    }

    function setStructureMode(to) {
        mStructureMode = to;
    }

    function draw() {
        mDrawingUtil.reset(mZoomTransform);
        mModel.getElements().forEach(elem => {
            elem.strokes.forEach(stroke => {
                let drawPath = stroke.path;
                if (mInteraction && mInteraction.type == DRAGGING && mSelectionIds.includes(stroke.id)) {
                    drawPath = stroke.path.map(p => VectorUtil.add(mInteraction.translation, p));
                }
                mDrawingUtil.drawStroke({
                    path: drawPath,
                    color: stroke.color,
                    width: stroke.size,
                    shadow: mHighlightIds.includes(stroke.id) || mHighlightIds.includes(elem.id),
                    outline: mSelectionIds.includes(elem.id) || mSelectionIds.includes(stroke.id) ? mColorMap(elem.id) : null,
                    code: mCodeUtil.getCode(stroke.id)
                })
            })
        })

        mDrawingUtil.resetInterface(mZoomTransform);

        if (mInteraction && mInteraction.type == DRAWING) {
            mDrawingUtil.drawStroke({
                path: mInteraction.currentStroke,
                color: mBrushOptions.color,
                width: mBrushOptions.size
            });
        } else if (mInteraction && mInteraction.type == ANGLING) {
            if (!mInteraction.targetElement) {
                mDrawingUtil.drawRoot({ root: mInteraction.currentStroke[0] })
                if (mInteraction.currentStroke.length > 1) {
                    let angle = VectorUtil.normalize(
                        VectorUtil.subtract(
                            mInteraction.currentStroke[mInteraction.currentStroke.length - 1],
                            mInteraction.currentStroke[0]));
                    mDrawingUtil.drawAngle({ root: mInteraction.currentStroke[0], angle });
                }
            }
        } else if (mBrushActivePosition) {
            mDrawingUtil.drawStroke({
                path: [mBrushActivePosition],
                color: mBrushOptions.color,
                width: mBrushOptions.size
            });
        } else if (mInteraction && mInteraction.type == LASSO) {
            mDrawingUtil.drawInterfaceSelectionBubble(mInteraction.line, SELECTION_BUBBLE_COLOR);
        }

        if (mStructureMode) {
            mModel.getElements().forEach(elem => {
                let root = elem.root;
                let angle = elem.angle;
                let spine = elem.spine;
                if (mInteraction && mInteraction.type == ANGLING && mStructureMode && mInteraction.targetElement == elem.id && mInteraction.currentStroke.length > 1) {
                    root = mInteraction.currentStroke[0];
                    angle = VectorUtil.normalize(VectorUtil.subtract(mInteraction.currentStroke[mInteraction.currentStroke.length - 1], mInteraction.currentStroke[0]));
                }
                if (mInteraction && mInteraction.type == SPINING && mStructureMode && mInteraction.targetElement == elem.id && mInteraction.currentStroke.length > 1) {
                    spine = mInteraction.currentStroke;
                }
                mDrawingUtil.drawSpine({ path: spine, color: mColorMap(elem.id) });
                mDrawingUtil.drawRoot({ root, origin: mProjections[elem.id], color: mColorMap(elem.id) })
                mDrawingUtil.drawAngle({ root, angle, color: mColorMap(elem.id) })
            });
        }
    }

    function interfaceIsCovered(screenCoords) {
        let boundingBox = mInteractionCanvas.node().getBoundingClientRect();
        if (screenCoords.x < boundingBox.x || screenCoords.x > boundingBox.x + boundingBox.width) {
            return false;
        } else if (screenCoords.y < boundingBox.y || screenCoords.y > boundingBox.y + boundingBox.height) {
            return false;
        }

        let ctx = mInterfaceCanvas.node().getContext('2d');
        let p = ctx.getImageData(screenCoords.x - boundingBox.x, screenCoords.y - boundingBox.y, 1, 1).data;
        let hex = DataUtil.rgbaToHex(p[0], p[1], p[2], p[3]);
        if (hex != "#00000000") return true;
        else return false;
    }

    function screenToModelCoords(screenCoords) {
        let boundingBox = mInterfaceCanvas.node().getBoundingClientRect();
        if (ValUtil.checkConvertionState(screenCoords, boundingBox, mZoomTransform)) {
            return {
                x: (screenCoords.x - boundingBox.x - mZoomTransform.x) / mZoomTransform.k,
                y: (screenCoords.y - boundingBox.y - mZoomTransform.y) / mZoomTransform.k
            };
        } else {
            return { x: 0, y: 0 };
        }
    }

    function modelToScreenCoords(modelCoords) {
        let boundingBox = mInterfaceCanvas.node().getBoundingClientRect();
        return {
            x: modelCoords.x * mZoomTransform.k + mZoomTransform.x + boundingBox.x,
            y: modelCoords.y * mZoomTransform.k + mZoomTransform.y + boundingBox.y
        };

    }

    function getIntendedElementId(p1, p2) {
        if (VectorUtil.equal(p1, p2)) {
            p2 = { x: p2.x, y: p2.y + 1 };
        }
        let bb = { x: Math.min(p1.x, p2.x), y: Math.min(p1.y, p2.y) };
        bb.width = Math.max(p1.x, p2.x) - bb.x;
        bb.height = Math.max(p1.y, p2.y) - bb.y;

        let overlapIds = mBoundingBoxes.filter(boxData => DataUtil.overlap(bb, boxData.box, 10)).map(d => d.id);
        if (overlapIds.length == 0) return null;
        let selectedElements = getSelectedElementIds();
        let validIds = overlapIds.filter(id => selectedElements.includes(id));
        if (validIds.length == 0) validIds = overlapIds;

        let result = validIds.reduce((minData, currId) => {
            let element = mModel.getElement(currId)
            if (!element) { console.error("invalid element id!", currId); return minData; }
            let dist = PathUtil.getDistanceMetric(element.strokes.map(s => s.path).flat(), [p1, p2]);
            if (dist < minData.dist) {
                return { id: currId, dist };
            } else {
                return minData;
            }
        }, { dist: Infinity });

        if (result) {
            return result.id;
        } else {
            return null;
        }
    }

    function getSelectedElementIds() {
        return DataUtil.unique(mSelectionIds
            .filter(id => IdUtil.isType(id, Data.Stroke))
            .map(sId => {
                let element = mModel.getElementForStroke(sId);
                if (!element) { console.error("invalid stroke id"); return null; }
                return element.id;
            })).filter(id => id);
    }

    return {
        onModelUpdate,
        onPointerDown,
        onDblClick,
        onPointerMove,
        onPointerUp,
        onWheel,
        onResize,
        setColor,
        setStructureMode,
        onSelection,
        onHighlight,
        setNewStrokeCallback: (func) => mNewStrokeCallback = func,
        setHighlightCallback: (func) => mHighlightCallback = func,
        setSelectionCallback: (func) => mSelectionCallback = func,
        setContextMenuCallback: (func) => mContextMenuCallback = func,
        setParentUpdateCallback: (func) => mParentUpdateCallback = func,
        setMergeCallback: (func) => mMergeCallback = func,
        setTranslateStrokesCallback: (func) => mTranslateStrokesCallback = func,
        setUpdateAngleCallback: (func) => mUpdateAngleCallback = func,
        setUpdateSpineCallback: (func) => mUpdateSpineCallback = func,
    }
}