import { DIMENSION_RANGE_V1, DIMENSION_RANGE_V2, SimulationValues, DimensionType, FdlButtons, FdlInteraction, Padding, Size } from "../../constants.js";
import { Data } from "../../data_structs.js";
import { DataUtil } from "../../utils/data_util.js";
import { IdUtil } from "../../utils/id_util.js";
import { VectorUtil } from "../../utils/vector_util.js";

export function FdlLegendViewController(mDrawingUtil, mOverlayUtil, mCodeUtil, mColorMap) {
    let mAddDimensionCallback = () => { };
    let mClickDimensionCallback = () => { };

    let mZoomTransform = d3.zoomIdentity.translate(0, 0);

    let mHighlightIds = [];
    let mSelectionIds = [];

    let mDimensions = [];
    let mCategories = [];
    let mAddButton = { id: FdlButtons.ADD, x: 0, y: 0 };

    let mYPositions = [];

    let mSimulation = d3.forceSimulation()
        .alphaDecay(SimulationValues.ALPHA)
        .velocityDecay(SimulationValues.VELOCITY)
        .alpha(0.3)
        .on("tick", () => {
            allItems().forEach(n => {
                if (!n.x) n.x = 0;
                if (!n.y) n.y = 0;

                if (n.yTarget === 0 || n.yTarget) {
                    n.y += (n.yTarget - n.y) * mSimulation.alpha();
                }

                if (n.xTarget === 0 || n.xTarget) {
                    n.x += (n.xTarget - n.x) * mSimulation.alpha();
                }
            });
            draw();
        }).stop();

    function updateSimulationData(data, model) {
        mDimensions = data.filter(d => IdUtil.isType(d.id, Data.Dimension));
        mCategories = data.filter(d => IdUtil.isType(d.id, Data.Category) ||
            d.id == DIMENSION_RANGE_V2 ||
            d.id == DIMENSION_RANGE_V1);

        setYPositions(model);
        resetTargets();

        mSimulation.alphaTarget(0.3).restart();
    }


    function setYPositions(model) {
        mYPositions = [];
        let curYPos = 10;
        let dimensions = model.getDimensions();
        dimensions.forEach(dimension => {
            mYPositions[dimension.id] = curYPos;
            curYPos += Size.DIMENSION_SIZE + Padding.CATEGORY;
            if (dimension.type == DimensionType.DISCRETE) {
                dimension.categories.forEach(category => {
                    mYPositions[category.id] = curYPos;
                    curYPos += Size.CATEGORY_SIZE + Padding.CATEGORY;
                });
            } else if (dimension.type == DimensionType.CONTINUOUS) {
                mYPositions[dimension.id + DIMENSION_RANGE_V1] = curYPos;
                curYPos += Size.CATEGORY_SIZE + Padding.CATEGORY;
                mYPositions[dimension.id + DIMENSION_RANGE_V2] = curYPos;
                curYPos += Size.CATEGORY_SIZE + Padding.CATEGORY;
            }
        });
        mYPositions[FdlButtons.ADD] = curYPos;
    }

    function resetTargets() {
        allItems().forEach(item => {
            let id = item.id;
            if (item.id == DIMENSION_RANGE_V1 || item.id == DIMENSION_RANGE_V2) id = item.dimension + item.id;
            item.yTarget = mYPositions[id];

            if (IdUtil.isType(id, Data.Category) || item.id == DIMENSION_RANGE_V1 || item.id == DIMENSION_RANGE_V2) {
                item.xTarget = 20;
            } else if (IdUtil.isType(id, Data.Dimension)) {
                item.xTarget = 10;
            }
        });
    }

    function onHighlight(highlightedIds) {
        if (!highlightedIds || !Array.isArray(highlightedIds)) { mHighlightIds = []; return; }
        mHighlightIds = highlightedIds;
    }

    function onSelection(selectedIds) {
        if (!selectedIds || !Array.isArray(selectedIds)) { mSelectionIds = []; return; }
        mSelectionIds = selectedIds;
    }

    function draw() {
        mDrawingUtil.reset(mZoomTransform);

        mDimensions.forEach(dimension => {
            let dimensionString = dimension.name;
            mDrawingUtil.drawStringNode({
                x: dimension.x,
                y: dimension.y,
                label: dimensionString,
                height: Size.DIMENSION_SIZE,
                shadow: mHighlightIds.includes(dimension.id),
                code: mCodeUtil.getCode(dimension.id),
                outline: mSelectionIds.includes(dimension.id) ? mColorMap(dimension.id) : null,
                background: DataUtil.dimensionValid(dimension) ? DataUtil.getLevelColor(dimension.level) : "#FF6865",
            })
        })

        mCategories.forEach(category => {
            mDrawingUtil.drawStringNode({
                x: category.x,
                y: category.y,
                label: category.name,
                height: Size.CATEGORY_SIZE,
                shadow: mHighlightIds.includes(category.id),
                code: mCodeUtil.getCode(category.id),
                outline: mSelectionIds.includes(category.id) ? mColorMap(category.id) : null,
            })
        })

        mDrawingUtil.drawStringNode({
            x: Padding.CATEGORY,
            y: mAddButton.y,
            label: "Add Dimension +",
            height: Size.DIMENSION_SIZE,
            shadow: mHighlightIds.includes(FdlButtons.ADD),
            code: mCodeUtil.getCode(FdlButtons.ADD),
            outline: mSelectionIds.includes(FdlButtons.ADD) ? mColorMap(FdlButtons.ADD) : null,
        });

    }

    function start() {
        mSimulation.alphaTarget(0.3).restart();
    }

    function stop() {
        mSimulation.stop();
    }

    function interactionStart(interaction, modelCoords) {
        if (interaction.type != FdlInteraction.SELECTION) { console.error("Interaction not supported!"); return; }
        let target = (Array.isArray(interaction.target) ? interaction.target : [interaction.target])
            .map(target => target.id ? target.id : target);
        let targetTiles = mDimensions.concat(mCategories).filter(n => target.includes(n.id));
        targetTiles.forEach(tile => {
            tile.startY = tile.y;
            tile.interacting = true;
        });
    }

    function interactionDrag(interaction, modelCoords) {
        if (interaction.type != FdlInteraction.SELECTION) { console.error("Interaction not supported!"); return; }
        let target = (Array.isArray(interaction.target) ? interaction.target : [interaction.target])
            .map(target => target.id ? target.id : target);
        let targetTiles = mDimensions.concat(mCategories).filter(n => target.includes(n.id));
        let dist = VectorUtil.subtract(modelCoords, interaction.start);
        targetTiles.forEach(tile => {
            tile.targetY = tile.startY + dist.y;
        });
    }

    function interactionEnd(interaction, modelCoords) {
        if (interaction.type == FdlInteraction.SELECTION) {
            if (VectorUtil.dist(interaction.start, modelCoords) < 5) {
                // Handle Click
                if (interaction.endTarget.id == FdlButtons.ADD) {
                    mAddDimensionCallback();
                } else if (IdUtil.isType(interaction.endTarget.id, Data.Dimension)) {
                    mClickDimensionCallback(interaction.endTarget.id)
                }
            } else {
                let target = (Array.isArray(interaction.target) ? interaction.target : [interaction.target])
                    .map(target => target.id ? target.id : target);
                let targetTiles = mDimensions.concat(mCategories).filter(n => target.includes(n.id));
                targetTiles.forEach(tile => {
                    tile.startY = null;
                    tile.interacting = null;
                });
            }
        } else if (interaction.type == FdlInteraction.LASSO) {
            mOverlayUtil.reset(mZoomTransform);
            mOverlayUtil.drawBubble(interaction.path);
            let selectedIds = mDimensions.concat(mCategories).filter(obj => mOverlayUtil.covered(obj)).map(n => n.id);
            return selectedIds;
        } else { console.error("Interaction not supported!"); return; }

        resetTargets();
    }

    function pan(x, y) {
        mZoomTransform = d3.zoomIdentity.translate(0, y).scale(mZoomTransform.k);
        draw();
    }

    function zoom(x, y, scale) {
        mZoomTransform = d3.zoomIdentity.translate(0, y).scale(scale);
        draw();
    }

    function getTranslate() {
        return { x: mZoomTransform.x, y: mZoomTransform.y };
    }

    function getScale() {
        return mZoomTransform.k;
    }


    function getZoomTransform() {
        return {
            x: mZoomTransform.x,
            y: mZoomTransform.y,
            k: mZoomTransform.k,
        }
    }

    function allItems() {
        return mDimensions.concat(mCategories).concat([mAddButton]);
    }

    return {
        updateSimulationData,
        start,
        stop,
        interactionStart,
        interactionDrag,
        interactionEnd,
        pan,
        zoom,
        onHighlight,
        onSelection,
        onResize: () => { },
        getTranslate,
        getScale,
        getZoomTransform,
        setAddDimensionCallback: (func) => mAddDimensionCallback = func,
        setClickDimensionCallback: (func) => mClickDimensionCallback = func,
    }
}