import { SimulationValues, FdlInteraction, Padding, Size } from "../../constants.js";
import { DataModel } from "../../data_model.js";
import { Data } from "../../data_structs.js";
import { DataUtil } from "../../utils/data_util.js";
import { IdUtil } from "../../utils/id_util.js";
import { VectorUtil } from "../../utils/vector_util.js";

export function FdlParentViewController(mDrawingUtil, mOverlayUtil, mCodeUtil, mColorMap) {
    const TARGET_ELEMENT = 'element_target';
    const TARGET_BUBBLE = 'bubble_target'
    const TARGET_LOCK = "target_lock";

    const DIVISION_SIZE = Size.ELEMENT_NODE_SIZE * 6;

    let mHighlightIds = [];
    let mSelectionIds = [];

    let mModel = new DataModel();
    // TODO: Actually check screen size on this
    let mZoomTransform = d3.zoomIdentity.translate(500, 50);

    let mTargetLock = null;
    let mDraggedNodes = [];

    let mParentUpdateCallback = () => { };

    let mNodes = [];
    let mSimluationTree = null;
    let mSimulation = d3.forceSimulation()
        .alphaDecay(SimulationValues.ALPHA)
        .velocityDecay(SimulationValues.VELOCITY)
        .alpha(0.3)
        .on("tick", () => {
            mNodes.forEach(node => {
                if (!node.x) node.x = 0;
                if (!node.y) node.y = 0;

                if (node.targetX || node.targetX === 0) node.x += (node.targetX - node.x) * mSimulation.alpha();
                if (node.targetY || node.targetY === 0) node.y += (node.targetY - node.y) * mSimulation.alpha();
            })
            draw();
        })
        .stop();

    function draw() {
        mDrawingUtil.reset(mZoomTransform);

        let prevBottom = -100;
        let maxLevel = Math.max(...mNodes.map(n => n.level));
        for (let level = 0; level <= maxLevel; level++) {
            let categoryYs = mNodes.filter(n => n.level == level && !n.interacting).map(n => n.y);
            let nextYs = mNodes.filter(n => n.level == level + 1 && !n.interacting).map(n => n.y);

            let top = Math.min(...categoryYs)
            let bottom = Math.max(...categoryYs)
            let nextTop = nextYs.length > 0 ? Math.min(...nextYs) : bottom + Size.ELEMENT_NODE_SIZE * 3;

            top = (top + prevBottom) / 2;
            bottom = (bottom + nextTop) / 2;

            mDrawingUtil.drawBand(DataUtil.getLevelColor(level), top, bottom);
            mDrawingUtil.drawText({
                x: (10 - mZoomTransform.x) / mZoomTransform.k,
                y: bottom - Math.min(68, (bottom - top)),
                height: Math.min(60, (bottom - top)),
                text: "Level " + level,
                color: DataUtil.getLevelColor(level - 1)
            })

            prevBottom = bottom;
        }

        if (mTargetLock) {
            let targetNode = mNodes.find(n => n.id == mTargetLock);
            mDrawingUtil.drawCircleTarget({
                cx: targetNode.x,
                cy: targetNode.y,
                r: targetNode.radius * 3,
                code: mCodeUtil.getCode(mTargetLock, TARGET_LOCK)
            })
        }

        let elements = mNodes.map(n => mModel.getElement(n.id));
        let parents = DataUtil.unique(elements.map(e => e.parentId).filter(p => p));
        parents.forEach(parentId => {
            let draggedIds = mDraggedNodes.map(n => n.id);
            let clusterNodes = elements.filter(e => e.parentId == parentId).map(e => mNodes.find(n => n.id == e.id));
            if (clusterNodes.length == 0) { console.error("Invalid cluster, no nodes", c); return; }
            clusterNodes = clusterNodes.filter(n => !draggedIds.includes(n.id))
            if (clusterNodes.length == 0) return;
            let y = DataUtil.median(clusterNodes.map(c => c.y));
            let parentNode = mNodes.find(n => n.id == parentId);
            mDrawingUtil.drawTreeBubble({
                x1: Math.min(...clusterNodes.map(c => c.x)) - Size.ELEMENT_NODE_SIZE * 2 + Padding.NODE,
                x2: Math.max(...clusterNodes.map(c => c.x)) + Size.ELEMENT_NODE_SIZE * 2 - Padding.NODE,
                y1: y - Size.ELEMENT_NODE_SIZE - Padding.NODE,
                y2: y + Size.ELEMENT_NODE_SIZE + Padding.NODE,
                pointer: parentNode,
                color: mColorMap(parentId),
                alpha: 0.4,
                shadow: mHighlightIds.includes(parentId),
                code: draggedIds.includes(parentId) ? null : mCodeUtil.getCode(parentId, TARGET_BUBBLE)
            });
        })

        let draggedIds = mDraggedNodes.map(n => n.id);
        mNodes.filter(n => !draggedIds.includes(n.id)).forEach(node => drawNode(node, elements.find(e => e.id == node.id)));
        mDraggedNodes.forEach(node => drawNode(node, elements.find(e => e.id == node.id)))
    }

    function drawNode(node, element) {
        if (IdUtil.isType(node.id, Data.Element)) {
            mDrawingUtil.drawThumbnailCircle({
                strokes: element.strokes,
                cx: node.x,
                cy: node.y,
                r: node.radius,
                shadow: mHighlightIds.includes(node.id),
                outline: mSelectionIds.includes(node.id) ? mColorMap(node.id) : null,
                code: node.interacting ? null : mCodeUtil.getCode(node.id, TARGET_ELEMENT)
            });
        } else {
            console.error("Invalid state, this node not supported", node);
        }
    }

    function updateSimulationData(data, model) {
        mModel = model;

        mNodes = data.filter(i => IdUtil.isType(i.id, Data.Element));

        let hierarchy = d3.hierarchy(mModel.getTree())
        mSimluationTree = d3.tree().nodeSize([(Size.ELEMENT_NODE_SIZE + Padding.NODE) * 2, DIVISION_SIZE])(hierarchy);
        resetTargets();

        mSimulation.alphaTarget(0.3).restart();
    }

    function resetTargets() {
        mNodes.forEach(node => {
            mSimluationTree.each((n) => {
                if (n.data.id == node.id) {
                    node.targetX = n.x;
                    node.targetY = n.y;
                }
            })
        })
    }

    function onHighlight(highlightedIds) {
        if (!highlightedIds || !Array.isArray(highlightedIds)) { mHighlightIds = []; return; }
        mHighlightIds = DataUtil.unique(highlightedIds.map(id => {
            if (IdUtil.isType(id, Data.Stroke)) {
                let element = mModel.getElementForStroke(id);
                if (!element) { console.error("Bad state, element not found for stroke"); return id; }
                return element.id;
            } else {
                return id;
            }
        }));
    }

    function onSelection(selectedIds) {
        if (!selectedIds || !Array.isArray(selectedIds)) { mSelectionIds = []; return; }
        mSelectionIds = selectedIds;
    }

    function pan(x, y) {
        mZoomTransform = d3.zoomIdentity.translate(x, y).scale(mZoomTransform.k);
        draw();
    }

    function zoom(x, y, scale) {
        mZoomTransform = d3.zoomIdentity.translate(x, y).scale(scale);
        draw();
    }

    function interactionStart(interaction, modelCoords) {
        if (interaction.type != FdlInteraction.SELECTION) { console.error("Interaction not supported!"); return; }
        mDraggedNodes = mNodes.filter(n => interaction.target.includes(n.id));
        mDraggedNodes.forEach(node => {
            node.startX = node.x;
            node.startY = node.y;
            node.interacting = true;
        });
    }

    function interactionDrag(interaction, modelCoords) {
        if (interaction.type != FdlInteraction.SELECTION) { console.error("Interaction not supported!"); return; }
        if (interaction.mouseOverTarget) {
            if (interaction.mouseOverTarget.id == mTargetLock) {
                // do nothing
            } else if (interaction.mouseOverTarget.type == TARGET_ELEMENT) {
                mTargetLock = interaction.mouseOverTarget.id;
                let targetNode = mNodes.find(n => n.id == mTargetLock);
                mDraggedNodes.forEach(node => {
                    node.targetX = targetNode.x + Size.ELEMENT_NODE_SIZE * (1 - + Math.random() * 2);
                    node.targetY = targetNode.y + Size.ELEMENT_NODE_SIZE * (1 + Math.random());
                });
            }
        } else {
            mTargetLock = null;
        }

        if (!mTargetLock) {
            let dist = VectorUtil.subtract(modelCoords, interaction.start);
            mDraggedNodes.forEach(node => {
                node.targetX = node.startX + dist.x;
                node.targetY = node.startY + dist.y;
            });
        }
    }

    function interactionEnd(interaction, modelCoords) {
        if (interaction.type == FdlInteraction.SELECTION) {
            if (interaction.endTarget && IdUtil.isType(interaction.endTarget.id, Data.Element)) {
                mParentUpdateCallback(mDraggedNodes.map(n => n.id), interaction.endTarget.id);
            } else if (!interaction.endTarget) {
                if (modelCoords.y < Math.min(...mNodes.filter(n => n.level == 0).map(n => n.y))) {
                    mParentUpdateCallback(mDraggedNodes.map(n => n.id), null);
                }
            }

            mDraggedNodes.forEach(node => {
                node.startX = null;
                node.startY = null;
                node.interacting = null;
            });
            mDraggedNodes = [];
            resetTargets();
            mTargetLock = null;
        } else if (interaction.type == FdlInteraction.LASSO) {
            mOverlayUtil.reset(mZoomTransform);
            mOverlayUtil.drawBubble(interaction.path);
            let selectedNodes = mNodes.filter(node => mOverlayUtil.covered(node)).map(n => n.id);
            return selectedNodes;
        } else { console.error("Interaction not supported!"); return; }
    }

    function getScale() {
        return mZoomTransform.k;
    }

    function getTranslate() {
        return { x: mZoomTransform.x, y: mZoomTransform.y };
    }


    function getZoomTransform() {
        return {
            x: mZoomTransform.x,
            y: mZoomTransform.y,
            k: mZoomTransform.k,
        }
    }

    function start() {
        mSimulation.alphaTarget(0.3).restart();
    }

    function stop() {
        mSimulation.stop();
    }

    return {
        updateSimulationData,
        pan,
        zoom,
        interactionStart,
        interactionDrag,
        interactionEnd,
        onHighlight,
        onSelection,
        onResize: () => { },
        getScale,
        getTranslate,
        getZoomTransform,
        setParentUpdateCallback: (func) => mParentUpdateCallback = func,
        start,
        stop,
    }

}