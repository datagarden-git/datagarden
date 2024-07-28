import { Buttons, ContextButtons, DIMENSION_RANGE_V1, DIMENSION_RANGE_V2, DropDown, FdlMode, Tab } from "../constants.js";
import { DataModel } from "../data_model.js";
import { Data } from "../data_structs.js";
import { FileHandler } from "../file_handler.js";
import { ContextMenu } from "../menu/context_menu.js";
import { CursorTag } from "../menu/cursor_tag.js";
import { DropdownInput } from "../menu/dropdown_input.js";
import { FloatingButton } from "../menu/floating_button.js";
import { TextInput } from "../menu/text_input.js";
import { ClassifierUtil } from "../utils/classifier_util.js";
import { DataUtil } from "../utils/data_util.js";
import { DrawingUtil } from "../utils/drawing_util.js";
import { IdUtil } from "../utils/id_util.js";
import { CanvasController } from "./canvas_controller.js";
import { FdlViewController } from "./fdl/fdl_view_controller.js";
import { MenuController } from "./menu_controller.js";
import { SystemState } from "./system_state_controller.js";
import { TabController } from "./tab_controller.js";
import { TableViewController } from "./table_view_controller.js";

export function DashboardController() {
    const TAB_HEIGHT = 60;

    let mColorMap = d3.scaleOrdinal(d3.schemeCategory10);

    let mCanvasController = new CanvasController(mColorMap);
    let mFdlViewController = new FdlViewController(mColorMap);
    let mTableViewController = new TableViewController(mColorMap);
    let mTabController = new TabController();

    let mActiveTab = mFdlViewController;
    mTableViewController.hide();

    let mMenuController = new MenuController();
    let mContextMenu = new ContextMenu(d3.select('#interface-svg'));
    let mCursorTag = new CursorTag(d3.select('#interface-svg'));
    let mTextInput = new TextInput();
    let mDropdownInput = new DropdownInput();
    let mDimentionViewBackButton = new FloatingButton(d3.select('#interface-svg'));

    let mSystemState = new SystemState();
    let mSelection = [];

    let mModel = new DataModel();

    let mCanvasPercent = 0.5;
    let mWidth = 1;
    let mHeight = 1;

    activateStateButtons();

    let mAddDimensionCallback = () => { };
    let mDeleteCallback = () => { };
    let mCalculateSpineCallback = () => { };
    let mUndoCallback = () => { };
    let mRedoCallback = () => { };
    let mUpdateCategoryNameCallback = () => { };
    let mUpdateDimensionNameCallback = () => { };
    let mUpdateDimensionDomainCallback = () => { };
    let mUpdateDimensionTypeCallback = () => { };
    let mUpdateDimensionChannelCallback = () => { };
    let mUpdateDimensionLevelCallback = () => { };
    let mUpdateAngleTypeCallback = () => { };
    let mUpdateSizeTypeCallback = () => { };
    let mUpdateColorCallback = () => { };
    let mLoadModelCallback = async () => { };
    let mMergeCallback = () => { };

    function modelUpdate(model) {
        mModel = model;
        // interface
        mTabController.onModelUpdate(model);
        // main controllers
        mCanvasController.onModelUpdate(model);
        mActiveTab.onModelUpdate(model);
        // minor controllers
        mDropdownInput.onModelUpdate(model);
        mSelection = mSelection.filter(id => {
            // if it's not an id for a data item, then it won't have been deleted. 
            if (!DataUtil.isDataId(id)) return true;
            if (DataUtil.itemExists(id, model)) return true;
            return false;
        });
    }

    function onResize(width, height) {
        mMenuController.onResize(width, height);
        mCanvasController.onResize(mCanvasPercent * width, height);
        mTabController.onResize((1 - mCanvasPercent) * width, TAB_HEIGHT);
        mActiveTab.onResize((1 - mCanvasPercent) * width, height - TAB_HEIGHT);

        mWidth = width;
        mHeight = height;
    }

    function onPointerDown(screenCoords) {
        mMenuController.hideColorPicker();
        mContextMenu.hideContextMenu();
        if (screenCoords.x < mWidth * mCanvasPercent) {
            mCanvasController.onPointerDown(screenCoords, mSystemState);
        } else if (screenCoords.y < TAB_HEIGHT) {
            mTabController.onPointerDown(screenCoords, mSystemState)
        } else if (mActiveTab == mFdlViewController) {
            mFdlViewController.onPointerDown(screenCoords, mSystemState)
        } else {
            // The table is active and will handle it's own mouse events. I hope.
        }
        if (mSystemState.getToolState() == ContextButtons.PARENT ||
            mSystemState.getToolState() == ContextButtons.MERGE) {
            mSystemState.clearOverrideToolState();
            mCursorTag.hide()
        }
    }

    function onDblClick(screenCoords) {
        if (screenCoords.x < mWidth * mCanvasPercent) {
            mCanvasController.onDblClick(screenCoords, mSystemState);
        } else if (screenCoords.y < TAB_HEIGHT) {
            // no tab double clicking
        } else if (mActiveTab == mFdlViewController) {
            mFdlViewController.onDblClick(screenCoords, mSystemState)
        } else {
            // The table is active and will handle it's own mouse events. I hope.
        }
    }

    function onPointerMove(screenCoords) {
        mCanvasController.onPointerMove(screenCoords, mSystemState);
        mTabController.onPointerMove(screenCoords, mSystemState);
        mFdlViewController.onPointerMove(screenCoords, mSystemState);
        mCursorTag.onPointerMove(screenCoords, mSystemState);
    }

    function onPointerUp(screenCoords) {
        mCanvasController.onPointerUp(screenCoords, mSystemState);
        mTabController.onPointerUp(screenCoords, mSystemState);
        mFdlViewController.onPointerUp(screenCoords, mSystemState);
    }

    function onWheel(screenCoords, delta) {
        if (screenCoords.x < mWidth * mCanvasPercent) {
            mCanvasController.onWheel(screenCoords, delta, mSystemState);
        } else if (screenCoords.y < TAB_HEIGHT) {
            // do nothing, tab don't wheel
        } else if (mActiveTab == mFdlViewController) {
            mFdlViewController.onWheel(screenCoords, delta, mSystemState);
        } else {
            // table will handle it's own wheeling, let the event propogate
        }
    }

    function onLongPress(screenCoords) {

    }

    function onKeyStateChange(keysDown) {
        mSystemState.setKeys(keysDown);
        activateStateButtons();
    }

    function onUndo() {
        // if next undo is a selection, do that, otherwise pass it along
        // return the undo promise
        return mUndoCallback();
    }

    function onRedo() {
        // if next redo is a selection, do that, otherwise pass it along
        // return the redo promise
        return mRedoCallback();
    }


    function onEnter() {
        if (mTextInput.isShowing()) {
            mTextInput.returnText();
        }
    }

    function onDelete() {
        mDeleteCallback(mSelection)
    }

    async function onExportElementsSet() {
        try {
            let workspace = await FileHandler.getWorkspace()
            mModel.getElements().forEach((element, index) => {
                workspace.writePNG(ClassifierUtil.elementToImg(element, 16), 'trainingData', "16p" + Date.now() + "e" + index);
                workspace.writePNG(ClassifierUtil.elementToImg(element, 32), 'trainingData', "32p" + Date.now() + "e" + index);
            });
        } catch (e) {
            console.error(e);
        }
    }

    mTextInput.setTextChangedCallback((itemId, text) => {
        if (itemId.dimension) {
            let dimension = mModel.getDimension(itemId.dimension);
            let domain = dimension.domain;
            if (itemId.id == DIMENSION_RANGE_V2) {
                domain[1] = text;
            } else if (itemId.id == DIMENSION_RANGE_V1) {
                domain[0] = text;
            } else { console.error("Invalid id", itemId); return; }
            mUpdateDimensionDomainCallback(itemId.dimension, domain);
        } else if (IdUtil.isType(itemId, Data.Category)) {
            mUpdateCategoryNameCallback(itemId, text);
        } else if (IdUtil.isType(itemId, Data.Dimension)) {
            mUpdateDimensionNameCallback(itemId, text);
        } else {
            console.error("Invalid id", itemId);
        }
    })

    mDropdownInput.setSelectedCallback((dropdownType, dimensionId, value) => {
        if (dropdownType == DropDown.TYPE) {
            mUpdateDimensionTypeCallback(dimensionId, value);
        } else if (dropdownType == DropDown.CHANNEL) {
            mUpdateDimensionChannelCallback(dimensionId, value);
        } else if (dropdownType == DropDown.LEVEL) {
            mUpdateDimensionLevelCallback(dimensionId, value);
        } else if (dropdownType == DropDown.ANGLE) {
            mUpdateAngleTypeCallback(dimensionId, value);
        } else if (dropdownType == DropDown.SIZE) {
            mUpdateSizeTypeCallback(dimensionId, value);
        } else {
            console.error("Invalid type");
        }
    })

    mTabController.setSetTabCallback(tabId => {
        mTabController.setActiveTab(tabId);
        mDimentionViewBackButton.hide();
        mActiveTab.hide();

        if (tabId == Tab.TABLE) {
            mActiveTab = mTableViewController;
        } else {
            mActiveTab = mFdlViewController;
        }

        mActiveTab.onModelUpdate(mModel);
        mActiveTab.onResize((1 - mCanvasPercent) * mWidth, mHeight - TAB_HEIGHT);
        mActiveTab.onSelection(mSelection);
        mActiveTab.show();

        if (tabId == Tab.PARENT) {
            mFdlViewController.setMode(FdlMode.PARENT);
        } else if (tabId == Tab.LEGEND) {
            mFdlViewController.setMode(FdlMode.LEGEND);
        } else if (IdUtil.isType(tabId, Data.Dimension)) {
            setDimensionTab(tabId);
        }

        mDropdownInput.hide();
    })

    mCanvasController.setHighlightCallback(onHighlight)
    mFdlViewController.setHighlightCallback(onHighlight)
    mTableViewController.setHighlightCallback(onHighlight)
    function onHighlight(highlightedIds) {
        mCanvasController.onHighlight(highlightedIds);
        mActiveTab.onHighlight(highlightedIds);
    }

    mCanvasController.setSelectionCallback(onSelection)
    mFdlViewController.setSelectionCallback(onSelection)
    mTableViewController.setSelectionCallback(onSelection)
    function onSelection(selectedIds) {
        mSelection = selectedIds;
        mCanvasController.onSelection(selectedIds);
        mActiveTab.onSelection(selectedIds);
    }

    mCanvasController.setContextMenuCallback(onContextMenu);
    mFdlViewController.setContextMenuCallback(onContextMenu);
    function onContextMenu(screenCoords, selection, target) {
        if (!selection || !Array.isArray(selection)) { console.error("Invalid selection!", selection); return; }
        if (!selection.some(id =>
            IdUtil.isType(id, Data.Stroke)
            || IdUtil.isType(id, Data.Element)
            || IdUtil.isType(id, Data.Category))) {
            // if it's not one of the above, there's no context menu.  
            return;
        }
        let buttons = [ContextButtons.DELETE];
        if (selection.some(id => IdUtil.isType(id, Data.Stroke) || IdUtil.isType(id, Data.Element))) {
            buttons.push(ContextButtons.MERGE);
            buttons.push(ContextButtons.PARENT);
            buttons.push(ContextButtons.SPINE);
            buttons.push(ContextButtons.COLOR)
        }

        mContextMenu.showContextMenu(screenCoords, buttons, (buttonId) => {
            if (buttonId == ContextButtons.MERGE) {
                mSystemState.setOverrideToolState(ContextButtons.MERGE);
                mCursorTag.show(ContextButtons.MERGE)
            } else if (buttonId == ContextButtons.SPINE) {
                let element;
                if (IdUtil.isType(target, Data.Stroke)) {
                    element = mModel.getElementForStroke(target);
                } else if (IdUtil.isType(target, Data.Element)) {
                    element = mModel.getElement(target);
                }
                if (!element) console.error("Cannot find element for id", id);
                mCalculateSpineCallback(element.id);
            } else if (buttonId == ContextButtons.PARENT) {
                mSystemState.setOverrideToolState(ContextButtons.PARENT);
                mCursorTag.show(ContextButtons.PARENT)
            } else if (buttonId == ContextButtons.DELETE) {
                mDeleteCallback(selection);
            } else if (buttonId == ContextButtons.COLOR) {
                mMenuController.showColorPicker(screenCoords);
            }
            mContextMenu.hideContextMenu();
        });

    }

    mFdlViewController.setAddDimensionCallback(() => {
        let newDimension = mAddDimensionCallback();
        setDimensionTab(newDimension.id);
    });

    mFdlViewController.setClickDimensionCallback((dimenId) => {
        setDimensionTab(dimenId)
    });

    mFdlViewController.setEditNameCallback((itemId, x, y, width, height) => {
        let item;
        if (IdUtil.isType(itemId, Data.Category)) {
            item = mModel.getCategory(itemId);
        } else {
            item = mModel.getDimension(itemId);
        }
        mTextInput.show(itemId, item.name, x, y, width, height);
    });

    mFdlViewController.setEditDomainCallback((dimensionId, minMax, x, y, width, height) => {
        let dimension = mModel.getDimension(dimensionId);
        mTextInput.show({ dimension: dimensionId, id: minMax },
            minMax == DIMENSION_RANGE_V1 ? dimension.domain[0] : dimension.domain[1],
            x, y, width, height);
    });

    mFdlViewController.setEditTypeCallback((dimensionId, x, y, width, height) => {
        let dimension = mModel.getDimension(dimensionId);
        mDropdownInput.show(DropDown.TYPE, dimensionId, dimension.type, x, y, width, height);
    });

    mFdlViewController.setEditChannelCallback((dimensionId, x, y, width, height) => {
        let dimension = mModel.getDimension(dimensionId);
        mDropdownInput.show(DropDown.CHANNEL, dimensionId, dimension.channel, x, y, width, height);
    });

    mFdlViewController.setEditLevelCallback((dimensionId, x, y, width, height) => {
        let dimension = mModel.getDimension(dimensionId);
        mDropdownInput.show(DropDown.LEVEL, dimensionId, dimension.level, x, y, width, height);
    });

    mFdlViewController.setEditAngleTypeCallback((dimensionId, x, y, width, height) => {
        let dimension = mModel.getDimension(dimensionId);
        mDropdownInput.show(DropDown.ANGLE, dimensionId, dimension.angleType, x, y, width, height);
    });

    mFdlViewController.setEditSizeTypeCallback((dimensionId, x, y, width, height) => {
        let dimension = mModel.getDimension(dimensionId);
        mDropdownInput.show(DropDown.SIZE, dimensionId, dimension.sizeType, x, y, width, height);
    });

    mCanvasController.setMergeCallback((strokeIds, elementId) => {
        mMergeCallback(strokeIds, elementId);
    });

    mFdlViewController.setMergeCallback((elementIds, elementId) => {
        let targetElement = mModel.getElement(elementId);
        if (!targetElement) { console.error("Invalid element id", elementId); return; }
        let targetStrokes = targetElement.strokes.map(s => s.id);
        let strokeIds = mSelection.filter(id => IdUtil.isType(id, Data.Stroke) || IdUtil.isType(id, Data.Element))
            .map(id => {
                if (IdUtil.isType(id, Data.Stroke)) {
                    return [id]
                } else {
                    let element = mModel.getElement(id);
                    if (!element) { console.error("Invalid element Id", id); return []; }
                    return element.strokes.map(s => s.id);
                }
            }).flat().filter(sId => !targetStrokes.includes(sId));
        if (strokeIds.length > 0) {
            mMergeCallback(strokeIds, elementId);
        }
    })

    mFdlViewController.setDeleteDimensionCallback((dimenId) => {
        mDimentionViewBackButton.hide();
        mTabController.resetDimensionTab();
        mTabController.setActiveTab(Tab.LEGEND);
        mFdlViewController.setMode(FdlMode.LEGEND);
        mDeleteCallback([dimenId]);
    });

    mTableViewController.setClearGeneratedModelCallback((model) => {
        modelUpdate(model);
    });

    mMenuController.setColorChangeCallback((color, interfaceOnly) => {
        if (!interfaceOnly) {
            let strokes = mSelection.filter(id => IdUtil.isType(id, Data.Stroke) || IdUtil.isType(id, Data.Element)).map(id =>
                IdUtil.isType(id, Data.Stroke) ? mModel.getStroke(id) : mModel.getElement(id).strokes).flat();
            strokes.forEach(stroke => {
                stroke.color = color;
            });
            modelUpdate(mModel);
        } else {
            mCanvasController.setColor(color);
        }
    });

    mMenuController.setColorPickedCallback((color, interfaceOnly) => {
        if (!interfaceOnly) {
            mUpdateColorCallback(mSelection.filter(id => IdUtil.isType(id, Data.Stroke) || IdUtil.isType(id, Data.Element)), color);
        } else {
            mCanvasController.setColor(color);
        }
    });

    mMenuController.setOnClickCallback(async (button) => {
        if (button == Buttons.BRUSH_BUTTON ||
            button == Buttons.SPINE_BRUSH_BUTTON ||
            button == Buttons.ANGLE_BRUSH_BUTTON ||
            button == Buttons.SELECTION_BUTTON ||
            button == Buttons.CURSOR_BUTTON ||
            button == Buttons.PANNING_BUTTON ||
            button == Buttons.ZOOM_BUTTON) {
            mSystemState.setDefaultToolState(button)
        } else if (button == Buttons.VIEW_BUTTON) {
            mSystemState.toggleStructureViewActive();
            mCanvasController.setStructureMode(mSystemState.isStructureViewActive());
            if (!mSystemState.isStructureViewActive() &&
                (mSystemState.getToolState() == Buttons.SPINE_BRUSH_BUTTON || mSystemState.getToolState() == Buttons.ANGLE_BRUSH_BUTTON)) {
                mSystemState.setDefaultToolState(Buttons.CURSOR_BUTTON);
            }
        } else if (button == Buttons.DOWNLOAD) {
            FileHandler.downloadJSON(mModel.toObject());
        } else if (button == Buttons.DOWNLOAD_IMAGE) {
            let boundingbox = DataUtil.getBoundingBox(mModel.getElements());
            let canvas = document.createElement("canvas");
            canvas.width = boundingbox.width + 50;
            canvas.height = boundingbox.height + 50;

            let dummy = { reset: () => { }, translate: () => { }, scale: () => { } };
            let drawingUtil = new DrawingUtil(canvas.getContext('2d'), dummy, dummy)
            drawingUtil.reset({ x: -boundingbox.x + 25, y: -boundingbox.y + 25, k: 1 });
            mModel.getElements().forEach(elem => {
                elem.strokes.forEach(stroke => {
                    drawingUtil.drawStroke({
                        path: stroke.path,
                        color: stroke.color,
                        width: stroke.size
                    })
                })
            })
            FileHandler.downloadPNG(canvas);
        } else if (button == Buttons.UPLOAD) {
            await mLoadModelCallback();
        }
        activateStateButtons();
    })

    mDimentionViewBackButton.setOnClickCallback(() => {
        mDimentionViewBackButton.hide();
        mTabController.resetDimensionTab();
        mTabController.setActiveTab(Tab.LEGEND);
        mFdlViewController.setMode(FdlMode.LEGEND);
    })

    function setDimensionTab(dimenId) {
        let dimension = mModel.getDimension(dimenId);
        mTabController.setDimensionTab(dimenId, dimension.name);
        mTabController.setActiveTab(dimenId);
        mFdlViewController.setMode(FdlMode.DIMENSION, dimenId);
        let tabBB = mTabController.getTabBB(dimenId);
        mDimentionViewBackButton.show(tabBB.x + 1, tabBB.y + 3 + tabBB.height, "<- Back to All Dimentions");
    }

    function activateStateButtons() {
        mMenuController.deactivateAll()
        mMenuController.activateButton(mSystemState.getToolState());
        if (mSystemState.isStructureViewActive()) mMenuController.activateButton(Buttons.VIEW_BUTTON);
    }

    return {
        modelUpdate,
        onResize,
        onPointerDown,
        onPointerMove,
        onPointerUp,
        onWheel,
        onDblClick,
        onLongPress,
        onKeyStateChange,
        onUndo,
        onRedo,
        onEnter,
        onDelete,
        onExportElementsSet,
        setNewStrokeCallback: (func) => mCanvasController.setNewStrokeCallback(func),
        setStructureMode: (to) => mCanvasController.setStructureMode(to),
        setParentUpdateCallback: (func) => { mFdlViewController.setParentUpdateCallback(func); mCanvasController.setParentUpdateCallback(func); },
        setTranslateStrokesCallback: (func) => mCanvasController.setTranslateStrokesCallback(func),
        setUpdateAngleCallback: (func) => mCanvasController.setUpdateAngleCallback(func),
        setUpdateSpineCallback: (func) => mCanvasController.setUpdateSpineCallback(func),
        setDeleteCallback: (func) => mDeleteCallback = func,
        setMergeCallback: (func) => mMergeCallback = func,
        setCalculateSpineCallback: (func) => mCalculateSpineCallback = func,
        setUndoCallback: (func) => mUndoCallback = func,
        setRedoCallback: (func) => mRedoCallback = func,
        setAddDimensionCallback: (func) => mAddDimensionCallback = func,
        setAddCategoryCallback: (func) => mFdlViewController.setAddCategoryCallback(func),
        setUpdateCategoryCallback: (func) => mFdlViewController.setUpdateCategoryCallback(func),
        setCategoryOrderUpdateCallback: (func) => mFdlViewController.setCategoryOrderUpdateCallback(func),
        setUpdateRangeControlCallback: (func) => mFdlViewController.setUpdateRangeControlCallback(func),
        setUpdateCategoryNameCallback: (func) => mUpdateCategoryNameCallback = func,
        setUpdateDimensionNameCallback: (func) => mUpdateDimensionNameCallback = func,
        setUpdateDimensionDomainCallback: (func) => mUpdateDimensionDomainCallback = func,
        setUpdateDimensionTypeCallback: (func) => mUpdateDimensionTypeCallback = func,
        setUpdateDimensionChannelCallback: (func) => mUpdateDimensionChannelCallback = func,
        setUpdateDimensionLevelCallback: (func) => mUpdateDimensionLevelCallback = func,
        setUpdateAngleTypeCallback: (func) => mUpdateAngleTypeCallback = func,
        setUpdateSizeTypeCallback: (func) => mUpdateSizeTypeCallback = func,
        setUpdateColorCallback: (func) => mUpdateColorCallback = func,
        setLoadModelCallback: (func) => mLoadModelCallback = func,
        setModelGeneratedCallback: (func) => mTableViewController.setModelGeneratedCallback(func),
    }
}