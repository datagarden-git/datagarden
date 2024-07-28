import { ChannelLabels, ChannelType, DIMENSION_RANGE_V1, DIMENSION_RANGE_V2, DIMENSION_SETTINGS_HEIGHT, SimulationValues, DimensionLabels, DimensionType, FdlButtons, FdlInteraction, NO_CATEGORY_ID, Padding, Size, AngleType, SizeType, MAP_ELEMENTS } from "../../constants.js";
import { DataModel } from "../../data_model.js";
import { Data } from "../../data_structs.js";
import { DataUtil } from "../../utils/data_util.js";
import { IdUtil } from "../../utils/id_util.js";
import { PathUtil } from "../../utils/path_util.js";
import { VectorUtil } from "../../utils/vector_util.js";

export function FdlDimensionViewController(mDrawingUtil, mOverlayUtil, mCodeUtil, mColorMap) {
    const DEFAULT_NONE_HEIGHT = 200;
    const ANGLE_LABEL_SIZE = 40;
    const AXIS_PADDING = 10;
    const CONTAINER_COLOR = "#55555530";

    const TARGET_ELEMENT = "element_target";
    const TARGET_LABEL = "dimention_name_target";
    const TARGET_TYPE = "dimention_type_target";
    const TARGET_CHANNEL = "dimention_channel_target";
    const TARGET_LEVEL = "dimention_level_target";
    const TARGET_ANGLE = "dimention_angle_setting_target";
    const TARGET_SIZE = "dimention_size_setting_target";
    const TARGET_DELETE = "delete_target";
    const TARGET_BAND = "category_band";
    const TARGET_CONTROL = "axis_control";
    const TARGET_NONE = "none_target";
    const TARGET_NOT_NONE = "not_none_target";

    const ADD_CATEGORY_LABEL = "Add Category +";

    const CONTROL_ID = 'control_node_'

    let mAddCategoryCallback = () => { };
    let mEditNameCallback = () => { };
    let mEditDomainCallback = () => { };
    let mEditTypeCallback = () => { };
    let mEditChannelCallback = () => { };
    let mEditLevelCallback = () => { };
    let mEditAngleTypeCallback = () => { };
    let mEditSizeTypeCallback = () => { };
    let mDeleteDimensionCallback = () => { };
    let mUpdateCategoryCallback = () => { };
    let mCategoryOrderUpdateCallback = () => { };
    let mUpdateRangeControlCallback = () => { };

    let mModel = new DataModel();
    let mDimensionId = null;
    let mDimension = null;

    let mZoomTransform = d3.zoomIdentity;

    let mHighlightIds = [];
    let mSelectionIds = [];
    let mWidth = 100;
    let mHeight = 100;

    let mCategories = [];
    let mNone = { name: "None", id: NO_CATEGORY_ID, x: 0, y: 0 }
    let mNodes = [];
    let mAddButton = { id: FdlButtons.ADD, x: 0, y: 0 };
    let mControls = [];

    let mCategoriesX = 0;
    let mDimenAxisX = 1;
    let mElementsAxisX = 1;
    let mElementsFloatX = 1;
    let mYRanges = {};
    let mNodeLayout = {}
    let mScreenEdge = 10;

    let mSettingsTargets = [];
    let mSettingsXs = [];
    let mSettingsY = [];
    let mSettingsWidths = [];
    let mSettingsScale = 1;
    let mSettingsBottom = 10;

    let mDraggedNodes = [];

    let mSimulation = d3.forceSimulation()
        .alphaDecay(SimulationValues.ALPHA)
        .velocityDecay(SimulationValues.VELOCITY)
        .force("collide", d3.forceCollide((d) => IdUtil.isType(d.id, Data.Element) ? d.radius + Padding.NODE * 2 : 0).strength(SimulationValues.STRENGTH_COLLIDE))
        .force("xDrift", d3.forceX(mElementsFloatX + Size.ELEMENT_NODE_SIZE + Padding.NODE).strength(SimulationValues.STRENGTH_X))
        .alpha(0.3)
        .on("tick", () => {
            // if the dimension isn't set yet or is invalid, don't update targets or positions.
            if (!mDimension) { return }
            if (!DataUtil.dimensionValid(mDimension)) { draw(); return; }

            if (mDraggedNodes.length == 0) {
                resetDependantTargets();
            }

            allItems().forEach(node => {
                if (!node) return;
                if (!node.x) node.x = node.targetX ? node.targetX : 0;
                if (!node.y) node.y = node.targetY ? node.targetY : 0;

                if (node.targetX || node.targetX === 0) {
                    node.x += (node.targetX - node.x) * mSimulation.alpha();
                }
                if (node.targetY || node.targetY === 0) {
                    node.y += (node.targetY - node.y) * mSimulation.alpha();
                }

                if (isNaN(node.x)) { console.error("Invalid x value"); node.x = 0; };
                if (isNaN(node.y)) { console.error("Invalid y value"); node.y = 0; };
            });

            draw();
        }).stop();

    // must be done before updating the simulation data.
    function setDimension(dimensionId) {
        mDimensionId = dimensionId;
    }

    function updateSimulationData(data, model) {
        mModel = model;

        mDimension = mModel.getDimension(mDimensionId);
        if (!mDimension) { console.error("Invalid dimension id", mDimensionId); mDimensionId = null; mDimension = null; draw(); return; }

        mNodes = data.filter(node => IdUtil.isType(node.id, Data.Element) && mModel.getElementLevel(node.id) == mDimension.level);
        mCategories = data.filter(node => node.dimension == mDimension.id);
        mControls = makeControlNodes(mDimension);

        calculateLayoutValues();
        resetTargets();

        mSimulation.nodes(mNodes)
            .force("xDrift", d3.forceX(mElementsFloatX + Size.ELEMENT_NODE_SIZE + Padding.NODE).strength(SimulationValues.STRENGTH_X))
            .alphaTarget(0.3)
            .restart();
    }

    function calculateLayoutValues() {
        mCategoriesX = canvasCoordsToLocal({ x: Padding.CATEGORY, y: 0 }).x;
        let categoryStrings = mCategories.map(c => c.name).concat([ADD_CATEGORY_LABEL]);
        mDimenAxisX = categoryStrings.reduce((max, name) => Math.max(max, mDrawingUtil.measureStringNode(name, Size.CATEGORY_SIZE)), 0)
            + Padding.CATEGORY * 2;
        mElementsAxisX = mDimenAxisX + AXIS_PADDING + (mDimension.channel == ChannelType.ANGLE ? ANGLE_LABEL_SIZE / 2 : 0)
        mElementsFloatX = mElementsAxisX + AXIS_PADDING + (mDimension.channel == ChannelType.ANGLE ? ANGLE_LABEL_SIZE / 2 : 0)
        mScreenEdge = canvasCoordsToLocal({ x: mWidth, y: 0 }).x;

        mYRanges = {};
        if (mDimension.type == DimensionType.DISCRETE) {
            mDimension.categories.forEach(({ id }, index) => {
                mYRanges[id] = getDiscreteYRange(index);
            });
            mYRanges[FdlButtons.ADD] = getDiscreteYRange(mDimension.categories.length);
            mYRanges[NO_CATEGORY_ID] = getDiscreteYRange(mDimension.categories.length + 1);
            // y range for the dimension is the space of the actual categories
            mYRanges[mDimension.id] = [DIMENSION_SETTINGS_HEIGHT + Size.CATEGORY_SIZE, mYRanges[FdlButtons.ADD][0]];
        } else {
            // it's the whole space.
            mYRanges[mDimension.id] = getContinuousYRange(false);
            mYRanges[NO_CATEGORY_ID] = getContinuousYRange(true);
        }

        if (DataUtil.channelIsContinuous(mDimension.channel)) {
            calculateNodeLayoutValues();
        }
    }

    function calculateNodeLayoutValues() {
        if (!DataUtil.dimensionValid(mDimension)) return;

        mNodeLayout = {};
        let minSize, maxSize, sizeRange;
        if (mDimension.channel == ChannelType.SIZE) {
            mNodes.forEach(n => {
                if (mDimension.unmappedIds.includes(n.id)) return;
                let element = mModel.getElement(n.id);
                n.size = DataUtil.getSize(element, mDimension.sizeType);
            });

            minSize = Math.min(Infinity, ...mNodes.filter(n => n.size).map(n => n.size));
            maxSize = Math.max(-Infinity, ...mNodes.filter(n => n.size).map(n => n.size));
            if (minSize == Infinity) minSize = 0;
            if (maxSize == -Infinity) maxSize = minSize + 1;
            sizeRange = maxSize - minSize;
        }

        mNodes.forEach((node) => {
            if (mDimension.unmappedIds.includes(node.id)) return;

            let yPercent = 0;
            if (mDimension.channel == ChannelType.ANGLE) {
                let element = mModel.getElement(node.id);
                let angle = DataUtil.getRelativeAngle(element, mDimension.angleType == AngleType.RELATIVE ? mModel.getElement(element.parentId) : null)
                yPercent = DataUtil.angleToPercent(angle);
            } else if (mDimension.channel == ChannelType.SIZE) {
                yPercent = (node.size - minSize) / sizeRange
            } else if (mDimension.channel == ChannelType.POSITION) {
                yPercent = node.parentProjection ? node.parentProjection.percent : 0;
            }

            mNodeLayout[node.id] = {
                y: (mYRanges[mDimension.id][1] - mYRanges[mDimension.id][0]) * yPercent + mYRanges[mDimension.id][0]
            };
            if (mSelectionIds.includes(node.id)) mNodeLayout[node.id].x = mElementsFloatX + Size.ELEMENT_NODE_SIZE + Padding.NODE;
        });
    }

    function makeControlNodes(dimension) {
        let controlNodes = []
        if (dimension.type == DimensionType.CONTINUOUS) {
            controlNodes.push({ id: CONTROL_ID + DIMENSION_RANGE_V1, index: DIMENSION_RANGE_V1 });
            controlNodes.push({ id: CONTROL_ID + DIMENSION_RANGE_V2, index: DIMENSION_RANGE_V2 });
        } else if (DataUtil.channelIsContinuous(dimension.channel)) {
            controlNodes.push({ id: CONTROL_ID + "-1", index: -1 });
            dimension.ranges.forEach((range, index) => {
                controlNodes.push({ id: CONTROL_ID + index, index, });
            })
            controlNodes.push({ id: CONTROL_ID + dimension.ranges.length, index: dimension.ranges.length });
        }
        return controlNodes;
    }

    function getDiscreteYRange(index) {
        let top = DIMENSION_SETTINGS_HEIGHT + Size.CATEGORY_SIZE + Padding.CATEGORY * 2;
        let categoryheight = (mHeight - top - Size.CATEGORY_SIZE - Padding.CATEGORY * 2) / (mDimension.categories.length + 1);

        if (index == mDimension.categories.length + 1) {
            // none is at the bottom
            let y1 = mHeight - categoryheight + Padding.CATEGORY;
            let y2 = mHeight - Padding.CATEGORY;
            return [y1, y2];
        } else if (index == mDimension.categories.length) {
            // the add category button space is above none
            let y1 = mHeight - categoryheight - Size.CATEGORY_SIZE - Padding.CATEGORY;
            let y2 = mHeight - categoryheight - Padding.CATEGORY;
            return [y1, y2]
        } else {
            if (DataUtil.channelIsDiscrete(mDimension.channel)) {
                let y1 = top + index * categoryheight + Padding.CATEGORY;
                let y2 = y1 + categoryheight - Padding.CATEGORY;
                return [y1, y2];
            } else {
                let r1 = index == 0 ? 0 : mDimension.ranges[index - 1];
                let r2 = index == mDimension.ranges.length ? 1 : mDimension.ranges[index];
                let availableHeight = categoryheight * mDimension.categories.length;
                let y1 = top + r1 * availableHeight + Padding.CATEGORY;
                let y2 = top + r2 * availableHeight + Padding.CATEGORY;
                return [y1, y2];
            }
        }
    }

    function getContinuousYRange(isNone) {
        if (isNone) {
            let y1 = mHeight - DEFAULT_NONE_HEIGHT;
            let y2 = mHeight;
            return [y1, y2];
        } else {
            let top = DIMENSION_SETTINGS_HEIGHT + Size.CATEGORY_SIZE + Padding.CATEGORY * 2;
            let height = mHeight - top - DEFAULT_NONE_HEIGHT - (Size.CATEGORY_SIZE + Padding.CATEGORY * 2);
            if (height < 1) height = 1;
            return [top, top + height];
        }
    }

    // called only when the layout may have changed or we finish an interaction.
    function resetTargets() {
        if (!DataUtil.dimensionValid(mDimension)) return;

        if (mDimension.type == DimensionType.DISCRETE) {
            mAddButton.targetY = rangeAverage(mYRanges[FdlButtons.ADD]) - Size.CATEGORY_SIZE / 2;
            mAddButton.targetX = mCategoriesX;
        }

        mNone.targetY = rangeAverage(mYRanges[NO_CATEGORY_ID]) - Size.CATEGORY_SIZE / 2;
        mNone.targetX = mCategoriesX;

        updateControlTargets();
        resetDependantTargets();
    }

    // targets which depend on other possibly moving elemnts
    function resetDependantTargets() {
        if (!DataUtil.dimensionValid(mDimension)) return;

        updateCategoryTargets();
        updateNodeTargets();
    }

    function updateControlTargets() {
        if (mDimension.type == DimensionType.CONTINUOUS) {
            let r1 = mYRanges[mDimension.id][0];
            let r2 = mYRanges[mDimension.id][1];
            mControls[0].targetX = mDimenAxisX;
            mControls[0].targetY = (r2 - r1) * mDimension.domainRange[0] + r1;
            mControls[1].targetX = mDimenAxisX;
            mControls[1].targetY = (r2 - r1) * mDimension.domainRange[1] + r1;
        } else if (DataUtil.channelIsContinuous(mDimension.channel)) {
            for (let i = -1; i <= mDimension.ranges.length; i++) {
                let control = mControls.find(c => c.index == i);
                if (!control) { console.error("contorl not found for index!", i); continue; }
                let range = i == -1 ? 0 : i == mDimension.ranges.length ? 1 : mDimension.ranges[i];
                control.targetX = mDimenAxisX;
                control.targetY = (mYRanges[mDimension.id][1] - mYRanges[mDimension.id][0]) * range + mYRanges[mDimension.id][0];
            }
        }
    }

    function updateCategoryTargets() {
        mCategories.forEach(categoryNode => {
            if (categoryNode.id == DIMENSION_RANGE_V1) {
                categoryNode.targetY = mControls.find(c => c.id == CONTROL_ID + DIMENSION_RANGE_V1).y;
            } else if (categoryNode.id == DIMENSION_RANGE_V2) {
                categoryNode.targetY = mControls.find(c => c.id == CONTROL_ID + DIMENSION_RANGE_V2).y; - Size.CATEGORY_SIZE;
            } else if (IdUtil.isType(categoryNode.id, Data.Category)) {
                if (DataUtil.channelIsDiscrete(mDimension.channel)) {
                    categoryNode.targetY = rangeAverage(mYRanges[categoryNode.id]) - Size.CATEGORY_SIZE / 2;
                } else {
                    let index = mDimension.categories.findIndex(l => l.id == categoryNode.id);
                    let control1 = mControls.find(c => c.index == index - 1);
                    let control2 = mControls.find(c => c.index == index);
                    if (control1 && control2) {
                        let range = [control1.targetY, control2.targetY];
                        categoryNode.targetY = rangeAverage(range) - Size.CATEGORY_SIZE / 2;
                    } else {
                        console.error("Contorls not set yet!");
                    }
                }
            } else {
                console.error("Invalid category id", categoryNode.id)
            }
            categoryNode.targetX = mCategoriesX;
        })
    }

    function updateNodeTargets() {
        mNodes.forEach(node => {
            if (mDimension.unmappedIds.includes(node.id)) {
                let yRange = mYRanges[NO_CATEGORY_ID];
                node.targetY = DataUtil.limit(node.y, yRange[0] + Size.ELEMENT_NODE_SIZE + Padding.NODE, yRange[1] - Size.ELEMENT_NODE_SIZE - Padding.NODE);
                node.targetX = DataUtil.limit(node.x, mElementsFloatX + Size.ELEMENT_NODE_SIZE + Padding.NODE, mScreenEdge - Size.ELEMENT_NODE_SIZE - Padding.NODE);
            } else if (DataUtil.channelIsDiscrete(mDimension.channel)) {
                let category = mDimension.categories.find(l => l.elementIds.includes(node.id));
                let categoryId = category ? category.id : NO_CATEGORY_ID;
                let yRange = mYRanges[categoryId];

                node.targetX = DataUtil.limit(node.x,
                    mElementsFloatX + Size.ELEMENT_NODE_SIZE + Padding.NODE,
                    mScreenEdge - Size.ELEMENT_NODE_SIZE + Padding.NODE);
                if (!yRange) { console.error("Range not found for category!", categoryId); return; }
                node.targetY = DataUtil.limit(node.y,
                    yRange[0] + Size.ELEMENT_NODE_SIZE + Padding.NODE,
                    yRange[1] - Size.ELEMENT_NODE_SIZE + Padding.NODE);
            } else {
                node.targetY = mNodeLayout[node.id].y;
                // x may be undefined
                node.targetX = mNodeLayout[node.id].x ? mNodeLayout[node.id].x : node.x;
                node.targetX = DataUtil.limit(node.targetX,
                    mElementsAxisX + Size.ELEMENT_NODE_SIZE + Padding.NODE,
                    mScreenEdge - Size.ELEMENT_NODE_SIZE + Padding.NODE);

            }
        });
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

    function onResize(width, height) {
        mWidth = width;
        mHeight = height;
        if (DataUtil.dimensionValid(mDimension)) {
            calculateLayoutValues();
            resetTargets();
        }
        draw();
    }

    function draw() {
        mDrawingUtil.reset(mZoomTransform);

        // we haven't been set yet, don't draw.
        if (!mDimension) return;

        // Only draw mapping if we are valid
        if (DataUtil.dimensionValid(mDimension)) {
            let header;
            if (mDimension.type == DimensionType.DISCRETE) {
                header = "Categories"
                drawAddButton();
            } else {
                header = "Domain"
            }

            mDrawingUtil.drawStringNode({
                label: header,
                x: 10,
                y: mSettingsBottom + Padding.CATEGORY,
                height: Size.CATEGORY_SIZE,
                box: false
            })

            if (DataUtil.channelIsDiscrete(mDimension.channel)) {
                mCategories.forEach(({ id }) => drawContainer(id));
            } else {
                drawChannelRange();
                // draw the dimention range(s)
                mDrawingUtil.drawLine({
                    x1: mControls[0].x,
                    y1: mControls[0].y,
                    x2: mControls[mControls.length - 1].x,
                    y2: mControls[mControls.length - 1].y
                });
            }

            // mCategories includes the range labels
            mCategories.forEach(category => drawCategoryLabel(category));
            drawNoneLabel()
            drawContainer(NO_CATEGORY_ID)
            mControls.forEach(c => drawControlNode(c));

            let elements = mNodes.map(n => mModel.getElement(n.id));
            // Draw dragged nodes after non-dragged nodes
            let draggedIds = mDraggedNodes.map(n => n.id);

            if (DataUtil.channelIsContinuous(mDimension.channel)) {
                mNodes.filter(node => !mDimension.unmappedIds.includes(node.id) && !node.interacting).forEach(node => drawNodeLinkLine(node))
            }
            mNodes.filter(n => !draggedIds.includes(n.id)).forEach(node => drawNode(node, elements.find(e => e.id == node.id)));
            mNodes.filter(n => draggedIds.includes(n.id)).forEach(node => drawNode(node, elements.find(e => e.id == node.id)))

            if (mDraggedNodes.length > 0 && DataUtil.channelIsContinuous(mDimension.channel)) {
                mDrawingUtil.drawRect({
                    x: mControls[0].x,
                    y: mControls[0].y,
                    width: mScreenEdge - mControls[0].x,
                    height: mControls[mControls.length - 1].y - mControls[0].y,
                    color: "#00000000",
                    code: mCodeUtil.getCode(MAP_ELEMENTS, TARGET_NOT_NONE),
                })
            }
        }

        drawSettings();
    }

    function drawAddButton() {
        mDrawingUtil.drawStringNode({
            x: mAddButton.x,
            y: mAddButton.y,
            label: ADD_CATEGORY_LABEL,
            height: Size.CATEGORY_SIZE,
            outline: mSelectionIds.includes(FdlButtons.ADD) ? mColorMap(FdlButtons.ADD) : null,
            shadow: mHighlightIds.includes(FdlButtons.ADD),
            code: mCodeUtil.getCode(FdlButtons.ADD)
        });
    }

    function drawNoneLabel() {
        mDrawingUtil.drawStringNode({
            label: mNone.name,
            x: mNone.x,
            y: mNone.y,
            height: Size.CATEGORY_SIZE,
            box: false,
            outline: 'white',
            code: mCodeUtil.getCode(mNone.id, TARGET_NONE),
        });
    }

    function drawContainer(id) {
        mDrawingUtil.drawRect({
            x: mDimenAxisX,
            y: mYRanges[id][0],
            height: mYRanges[id][1] - mYRanges[id][0],
            width: mScreenEdge - mDimenAxisX,
            shadow: mHighlightIds.includes(id),
            color: CONTAINER_COLOR,
            code: mDraggedNodes.length > 0 ? mCodeUtil.getCode(id, TARGET_BAND) : null,
        })

        mDrawingUtil.drawLine({
            x1: mDimenAxisX,
            x2: mDimenAxisX,
            y1: mYRanges[id][0],
            y2: mYRanges[id][1],
            width: 1,
            color: "black",
        })
    }

    function drawControlNode(controlNode) {
        let drawCode = mDimension.type == DimensionType.CONTINUOUS ||
            controlNode.index > -1 && controlNode.index < mDimension.ranges.length;
        mDrawingUtil.drawColorCircle({
            x: controlNode.x,
            y: controlNode.y,
            r: AXIS_PADDING - 2,
            color: 'white',
            code: drawCode ? mCodeUtil.getCode(controlNode.id, TARGET_CONTROL) : null,
        })
    }

    function drawChannelRange() {
        let yRange = mYRanges[mDimension.id];

        mDrawingUtil.drawLine({
            x1: mElementsAxisX,
            x2: mElementsAxisX,
            y1: yRange[0],
            y2: yRange[1]
        });

        if (mDimension.channel == ChannelType.ANGLE) {
            let images = [];
            if (mDimension.angleType == AngleType.RELATIVE) {
                images.push(
                    "img/angle_180_rel.svg",
                    "img/angle_90_rel.svg",
                    "img/angle_0_rel.svg",
                    "img/angle_-90_rel.svg",
                    "img/angle_-180_rel.svg",
                )
            } else {
                images.push(
                    "img/angle_180_abs.svg",
                    "img/angle_90_abs.svg",
                    "img/angle_0_abs.svg",
                    "img/angle_-90_abs.svg",
                    "img/angle_-180_abs.svg",
                )
            }
            images.forEach((img, index) => {
                if (img) {
                    let yRange = mYRanges[mDimension.id];
                    let yPos = (yRange[1] - yRange[0]) * index / (images.length - 1) + yRange[0];
                    mDrawingUtil.drawImage({
                        x: mDimenAxisX + Padding.CATEGORY,
                        y: yPos - ANGLE_LABEL_SIZE / 2,
                        height: ANGLE_LABEL_SIZE,
                        width: ANGLE_LABEL_SIZE,
                        url: img,
                        shadow: true,
                    })
                }
            })
        } else if (mDimension.channel == ChannelType.POSITION) {
            mDrawingUtil.drawStringNode({
                label: "Start of Parent",
                x: mElementsAxisX,
                y: yRange[0] - (Size.CATEGORY_SIZE),
                height: Size.CATEGORY_SIZE,
                box: false,
            });
            mDrawingUtil.drawStringNode({
                label: "End of Parent",
                x: mElementsAxisX,
                y: yRange[1] + (Padding.CATEGORY),
                height: Size.CATEGORY_SIZE,
                box: false,
            });
        } else if (mDimension.channel == ChannelType.SIZE) {
            mDrawingUtil.drawStringNode({
                label: "Smallest Element",
                x: mElementsAxisX,
                y: yRange[0] - (Size.CATEGORY_SIZE),
                height: Size.CATEGORY_SIZE,
                box: false,
            });
            mDrawingUtil.drawStringNode({
                label: "Largest Element",
                x: mElementsAxisX,
                y: yRange[1] + (+ Padding.CATEGORY),
                height: Size.CATEGORY_SIZE,
                box: false,
            });
        }
    }

    function drawCategoryLabel(categoryItem) {
        mDrawingUtil.drawStringNode({
            x: categoryItem.x,
            y: categoryItem.y,
            label: categoryItem.name,
            height: Size.CATEGORY_SIZE,
            shadow: mHighlightIds.includes(categoryItem.id),
            code: mCodeUtil.getCode(categoryItem.id, TARGET_LABEL),
            outline: mSelectionIds.includes(categoryItem.id) ? mColorMap(categoryItem.id) : null,
            background: categoryItem.invalid ? "#FF6865" : "white"
        });
    }

    function drawNodeLinkLine(node) {
        mDrawingUtil.drawLine({
            x1: mElementsAxisX,
            x2: node.x,
            y1: node.y,
            y2: node.y,
            dash: 3,
        });
    }

    function drawNode(node, element) {
        let strokes = element.strokes;
        if (mDimension.channel == ChannelType.SHAPE) {
            strokes = DataUtil.getStraightenedStrokes(element);
        }
        mDrawingUtil.drawThumbnailCircle({
            strokes,
            cx: node.x,
            cy: node.y,
            r: node.radius,
            shadow: mHighlightIds.includes(node.id),
            outline: mSelectionIds.includes(node.id) ? mColorMap(node.id) : null,
            code: node.interacting ? null : mCodeUtil.getCode(node.id, TARGET_ELEMENT)
        });
    }

    function drawSettings() {
        mDrawingUtil.drawRect({
            x: 0,
            y: 0,
            width: mScreenEdge,
            height: mSettingsBottom,
            color: "white",
            // wipe out any other interactions under this
            code: "#00000000"
        })
        mDrawingUtil.drawLine({ x1: 0, x2: mScreenEdge, y1: mSettingsBottom, y2: mSettingsBottom });

        let labels = ["Name", "Type", "Level", "Channel"];
        let strings = [mDimension.name, DimensionLabels[mDimension.type], "Level " + mDimension.level, ChannelLabels[mDimension.channel]];
        let valid = [true, DataUtil.dimensionTypeValid(mDimension), DataUtil.dimensionLevelValid(mDimension), DataUtil.dimensionChannelValid(mDimension)];
        mSettingsTargets = [TARGET_LABEL, TARGET_TYPE, TARGET_LEVEL, TARGET_CHANNEL];
        if (mDimension.channel == ChannelType.ANGLE) {
            labels.push("Dependency");
            strings.push(mDimension.angleType);
            valid.push(true);
            mSettingsTargets.push(TARGET_ANGLE);
        } else if (mDimension.channel == ChannelType.SIZE) {
            labels.push("Metric");
            strings.push(mDimension.sizeType);
            valid.push(true);
            mSettingsTargets.push(TARGET_SIZE);
        }
        labels.push("");
        strings.push("❌");
        valid.push(true);
        mSettingsTargets.push(TARGET_DELETE);

        mSettingsWidths = strings.map((s, i) => Math.max(
            mDrawingUtil.measureStringNode(s, Size.CATEGORY_SIZE),
            mDrawingUtil.measureStringNode(labels[i], Size.CATEGORY_SIZE)));
        let totalWidth = mSettingsWidths.reduce((s, v) => s + v + Padding.CATEGORY, 0)
        mSettingsScale = (totalWidth + 10) < mWidth ? 1 : mWidth / (totalWidth + 10);
        mSettingsBottom = canvasCoordsToLocal({ x: 0, y: DIMENSION_SETTINGS_HEIGHT }).y;

        mSettingsXs = new Array(mSettingsWidths.length).fill('')
            .map((_, i) => mSettingsWidths.slice(0, i).reduce((s, v) => s + v * mSettingsScale + Padding.CATEGORY, 0) + Padding.CATEGORY);

        let labelY = canvasCoordsToLocal({ x: 0, y: DIMENSION_SETTINGS_HEIGHT - (Size.CATEGORY_SIZE * mSettingsScale) * 2 - Padding.CATEGORY }).y;
        mSettingsY = canvasCoordsToLocal({ x: 0, y: DIMENSION_SETTINGS_HEIGHT - Size.CATEGORY_SIZE * mSettingsScale - Padding.CATEGORY }).y;

        strings.forEach((string, index) => {
            if (labels[index]) {
                mDrawingUtil.drawStringNode({
                    x: mSettingsXs[index],
                    y: labelY,
                    label: labels[index],
                    height: Size.CATEGORY_SIZE * mSettingsScale,
                    box: false
                });
            }

            mDrawingUtil.drawStringNode({
                x: mSettingsXs[index],
                y: mSettingsY,
                label: string,
                height: Size.CATEGORY_SIZE * mSettingsScale,
                shadow: mHighlightIds.includes(mDimension.id),
                code: mCodeUtil.getCode(mDimension.id, mSettingsTargets[index]),
                background: valid[index] ? DataUtil.getLevelColor(mDimension.level) : "#FF6865",
            });
        })
    }

    function getSettingsBoundingBox(targetId) {
        let index = mSettingsTargets.findIndex(t => t == targetId);
        if (index == -1) { console.error("invalid target", targetId); return { x: 0, y: 0 } };
        return { x: mSettingsXs[index] - 10, y: mSettingsY - 1, width: mSettingsWidths[index], height: Size.CATEGORY_SIZE * mSettingsScale };
    }

    function start() {
        mSimulation.alphaTarget(0.3).restart();
    }

    function stop() {
        mSimulation.stop();
    }

    function interactionStart(interaction, modelCoords) {
        if (interaction.type != FdlInteraction.SELECTION) { console.error("Interaction not supported!"); return; }
        if (interaction.startTarget && interaction.startTarget.type == TARGET_CONTROL) {
            mDraggedNodes = [interaction.startTarget];
            mControls.forEach(node => node.startY = node.y);
        } else {
            mDraggedNodes = allItems().filter(n => interaction.target.includes(n.id));
            mDraggedNodes.forEach(node => {
                node.startX = node.x;
                node.startY = node.y;
                node.interacting = true;
            });
        }

        mSimulation.nodes(mNodes.filter(n => !interaction.target.includes(n.id)));
    }

    function interactionDrag(interaction, modelCoords) {
        if (interaction.type != FdlInteraction.SELECTION) { console.error("Interaction not supported!"); return; }
        let dist = VectorUtil.subtract(modelCoords, interaction.start);
        mDraggedNodes.filter(n => mDimension.type == DimensionType.DISCRETE &&
            IdUtil.isType(n.id, Data.Category)).forEach(l => {
                l.targetY = l.startY + dist.y;
            })

        mDraggedNodes.filter(n => IdUtil.isType(n.id, Data.Element)).forEach(n => {
            n.targetX = n.startX + dist.x;
            n.targetY = n.startY + dist.y;
        })

        if (interaction.startTarget && interaction.startTarget.type == TARGET_CONTROL) {
            let targetIndex = mControls.findIndex(c => c.id == interaction.startTarget.id);
            mControls[targetIndex].targetY = Math.min(Math.max(modelCoords.y, mYRanges[mDimension.id][0]), mYRanges[mDimension.id][1]);
            mControls.forEach((node, index) => {
                if (index < targetIndex) {
                    if (node.startY > mControls[targetIndex].targetY) {
                        node.targetY = mControls[targetIndex].targetY;
                    } else {
                        node.targetY = node.startY
                    }
                } else if (index > targetIndex) {
                    if (node.startY < mControls[targetIndex].targetY) {
                        node.targetY = mControls[targetIndex].targetY;
                    } else {
                        node.targetY = node.startY
                    }
                }
            });
            updateCategoryTargets();
        } if (interaction.mouseOverTarget && (IdUtil.isType(interaction.mouseOverTarget.id, Data.Category) || interaction.mouseOverTarget.id == NO_CATEGORY_ID)) {
            let yRange = mYRanges[interaction.mouseOverTarget.id];
            mDraggedNodes.forEach(node => {
                if (IdUtil.isType(node.id, Data.Element)) {
                    node.targetY = DataUtil.limit(node.targetY, yRange[1] - Size.ELEMENT_NODE_SIZE + Padding.NODE, yRange[0] + Size.ELEMENT_NODE_SIZE + Padding.NODE);
                    node.targetX = DataUtil.limit(node.targetX, mScreenEdge - Size.ELEMENT_NODE_SIZE + Padding.NODE, mElementsFloatX + Size.ELEMENT_NODE_SIZE + Padding.NODE);
                }
            });
        }
    }

    function interactionEnd(interaction, modelCoords) {
        if (interaction.type == FdlInteraction.SELECTION) {
            if (VectorUtil.dist(interaction.start, modelCoords) < 5 && interaction.startTarget) {
                // Handle Click
                if (interaction.startTarget && interaction.startTarget.id == mDimension.id) {
                    let targetBB = getSettingsBoundingBox(interaction.startTarget.type);
                    if (interaction.startTarget.type == TARGET_LABEL) {
                        mEditNameCallback(interaction.startTarget.id, targetBB.x, targetBB.y, targetBB.width, targetBB.height);
                    } else if (interaction.startTarget.type == TARGET_TYPE) {
                        mEditTypeCallback(interaction.startTarget.id, targetBB.x, targetBB.y, targetBB.width, targetBB.height);
                    } else if (interaction.startTarget.type == TARGET_CHANNEL) {
                        mEditChannelCallback(interaction.startTarget.id, targetBB.x, targetBB.y, targetBB.width, targetBB.height);
                    } else if (interaction.startTarget.type == TARGET_LEVEL) {
                        mEditLevelCallback(interaction.startTarget.id, targetBB.x, targetBB.y, targetBB.width, targetBB.height);
                    } else if (interaction.startTarget.type == TARGET_ANGLE) {
                        mEditAngleTypeCallback(interaction.startTarget.id, targetBB.x, targetBB.y, targetBB.width, targetBB.height);
                    } else if (interaction.startTarget.type == TARGET_SIZE) {
                        mEditSizeTypeCallback(interaction.startTarget.id, targetBB.x, targetBB.y, targetBB.width, targetBB.height);
                    } else if (interaction.startTarget.type == TARGET_DELETE) {
                        mDeleteDimensionCallback(interaction.startTarget.id);
                    } else {
                        console.error("Unsupported Target Type", interaction.startTarget.type);
                    }
                } else if (interaction.startTarget && IdUtil.isType(interaction.startTarget.id, Data.Category)) {
                    let categoryNode = mCategories.find(l => l.id == interaction.startTarget.id);
                    if (!categoryNode) { console.error("Invalid category id", interaction.startTarget.id); return; }
                    mEditNameCallback(interaction.startTarget.id, categoryNode.x, categoryNode.y,
                        mDrawingUtil.measureStringNode(categoryNode.name, Size.CATEGORY_SIZE), Size.CATEGORY_SIZE);
                } else if (interaction.startTarget && interaction.endTarget && interaction.endTarget.id == FdlButtons.ADD) {
                    mAddCategoryCallback(mDimension.id);
                } else if (interaction.startTarget && (interaction.startTarget.id == DIMENSION_RANGE_V2 || interaction.startTarget.id == DIMENSION_RANGE_V1)) {
                    let node = mCategories.find(l => l.id == interaction.startTarget.id);
                    mEditDomainCallback(mDimension.id, interaction.startTarget.id, node.x, node.y,
                        mDrawingUtil.measureStringNode(node.name, Size.CATEGORY_SIZE), Size.CATEGORY_SIZE)
                }
            } else if (interaction.startTarget && interaction.startTarget.type == TARGET_CONTROL) {
                let target = mControls.find(node => node.id == interaction.startTarget.id);
                let yPos = Math.min(Math.max(modelCoords.y, mYRanges[mDimension.id][0]), mYRanges[mDimension.id][1]);
                let percent = (yPos - mYRanges[mDimension.id][0]) / (mYRanges[mDimension.id][1] - mYRanges[mDimension.id][0]);
                mUpdateRangeControlCallback(mDimensionId, target.index, percent);
            } else {
                let elementTargetIds = mDraggedNodes.map(i => i.id).filter(id => IdUtil.isType(id, Data.Element));
                if (elementTargetIds.length > 0) {
                    if (interaction.endTarget && IdUtil.isType(interaction.endTarget.id, Data.Category)) {
                        mUpdateCategoryCallback(mDimension.id, interaction.endTarget.id, elementTargetIds);
                    } else if (interaction.endTarget && IdUtil.isType(interaction.endTarget.id, Data.Element)) {
                        let categoryTarget = mModel.getCategoryForElement(mDimension.id, interaction.endTarget.id);
                        mUpdateCategoryCallback(mDimension.id, categoryTarget, elementTargetIds);
                    } else if (interaction.endTarget && interaction.endTarget.id == NO_CATEGORY_ID) {
                        mUpdateCategoryCallback(mDimension.id, NO_CATEGORY_ID, elementTargetIds);
                    } else if (interaction.endTarget && interaction.endTarget.id == MAP_ELEMENTS) {
                        mUpdateCategoryCallback(mDimension.id, MAP_ELEMENTS, elementTargetIds);
                    }
                }

                let categoryTargetIds = mDraggedNodes.map(i => i.id).filter(id => IdUtil.isType(id, Data.Category));
                if (categoryTargetIds.length > 0) {
                    let categoriesOrdering = mDimension.categories.map(l => {
                        let categoryNode = mCategories.find(i => i.id == l.id);
                        if (!categoryNode) { console.error("Node not found for category id", l.id); return { id: l.id, y: 0 } }
                        return { id: l.id, y: categoryNode.y };
                    })
                    categoriesOrdering.sort((a, b) => a.y - b.y);
                    mCategoryOrderUpdateCallback(mDimension.id, categoriesOrdering.map(lo => lo.id));
                }

                mSimulation.nodes(mNodes);
            }
        } else if (interaction.type == FdlInteraction.LASSO) {
            if (DataUtil.dimensionValid(mDimension)) {
                mOverlayUtil.reset(mZoomTransform);
                mOverlayUtil.drawBubble(interaction.path);
                let selectedIds = mCategories.concat(mNodes).filter(obj => mOverlayUtil.covered(obj)).map(n => n.id);
                return selectedIds;
            } else {
                return [];
            }
        } else { console.error("Interaction not supported!"); return; }

        mDraggedNodes.forEach(node => {
            node.startX = null;
            node.startY = null;
            node.interacting = null;
        });
        resetTargets();

        mDraggedNodes = [];
    }

    function pan(x, y) {

    }

    function zoom(x, y, scale) {

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
        return mNodes.concat(mCategories)
            .concat(mControls)
            .concat([mAddButton, mNone]);
    }

    function canvasCoordsToLocal(canvasCoords) {
        return {
            x: (canvasCoords.x - mZoomTransform.x) * mZoomTransform.k,
            y: (canvasCoords.y - mZoomTransform.y) * mZoomTransform.k
        }
    }

    function rangeAverage(range) {
        return (range[1] - range[0]) / 2 + range[0];
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
        onResize,
        setDimension,
        getTranslate,
        getScale,
        getZoomTransform,
        setAddCategoryCallback: (func) => mAddCategoryCallback = func,
        setEditNameCallback: (func) => mEditNameCallback = func,
        setEditDomainCallback: (func) => mEditDomainCallback = func,
        setEditTypeCallback: (func) => mEditTypeCallback = func,
        setEditChannelCallback: (func) => mEditChannelCallback = func,
        setEditLevelCallback: (func) => mEditLevelCallback = func,
        setEditAngleTypeCallback: (func) => mEditAngleTypeCallback = func,
        setEditSizeTypeCallback: (func) => mEditSizeTypeCallback = func,
        setUpdateCategoryCallback: (func) => mUpdateCategoryCallback = func,
        setDeleteDimensionCallback: (func) => mDeleteDimensionCallback = func,
        setCategoryOrderUpdateCallback: (func) => mCategoryOrderUpdateCallback = func,
        setUpdateRangeControlCallback: (func) => mUpdateRangeControlCallback = func,
    }
}