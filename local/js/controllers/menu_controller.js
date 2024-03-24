import { Buttons, MENU_BUTTON_SIZE } from "../constants.js";
import { MenuButton } from "../menu/menu_button.js";
import { FiltersUtil } from "../utils/filters_util.js";

export function MenuController() {
    let mColorPicker;
    let mColorPickerContainer;

    let mColorPickerInternalOpen = true;
    let mLastColor = null;

    let mColorChangeCallback = () => { };
    let mColorPickedCallback = () => { };
    let mOnClickCallack = async () => { };

    let mSvg = d3.select('#interface-svg');

    FiltersUtil.addOutlineFilter(mSvg);
    FiltersUtil.addShadowFilter(mSvg);

    const BUTTON_LIST = [
        Buttons.CURSOR_BUTTON,
        Buttons.SELECTION_BUTTON,
        Buttons.COLOR_BUTTON,
        Buttons.BRUSH_BUTTON,
        Buttons.VIEW_BUTTON,
        Buttons.ANGLE_BRUSH_BUTTON,
        Buttons.SPINE_BRUSH_BUTTON,
        Buttons.PANNING_BUTTON,
        Buttons.ZOOM_BUTTON,
        Buttons.DOWNLOAD,
        Buttons.DOWNLOAD_IMAGE,
        Buttons.UPLOAD,
    ]
    const BUTTON_PARENTS = [
        [Buttons.PANNING_BUTTON, Buttons.ZOOM_BUTTON],
        [Buttons.BRUSH_BUTTON, Buttons.COLOR_BUTTON],
        [Buttons.VIEW_BUTTON, Buttons.SPINE_BRUSH_BUTTON],
        [Buttons.VIEW_BUTTON, Buttons.ANGLE_BRUSH_BUTTON],
    ]
    const BUTTON_IMAGES = {}
    BUTTON_IMAGES[Buttons.COLOR_BUTTON] = "img/color_selector.svg";
    BUTTON_IMAGES[Buttons.BRUSH_BUTTON] = "img/color_brush_button.svg";
    BUTTON_IMAGES[Buttons.PANNING_BUTTON] = "img/panning_button.svg";
    BUTTON_IMAGES[Buttons.ZOOM_BUTTON] = "img/zoom_button.svg";
    BUTTON_IMAGES[Buttons.SELECTION_BUTTON] = "img/selection_button.svg";
    BUTTON_IMAGES[Buttons.CURSOR_BUTTON] = "img/cursor_button.svg";
    BUTTON_IMAGES[Buttons.VIEW_BUTTON] = "img/eyecon_button.svg";
    BUTTON_IMAGES[Buttons.SPINE_BRUSH_BUTTON] = "img/spine_brush_button.svg";
    BUTTON_IMAGES[Buttons.ANGLE_BRUSH_BUTTON] = "img/angle_brush_button.svg";
    BUTTON_IMAGES[Buttons.DOWNLOAD] = "img/download.svg";
    BUTTON_IMAGES[Buttons.DOWNLOAD_IMAGE] = "img/download_image.svg";
    BUTTON_IMAGES[Buttons.UPLOAD] = "img/upload.svg";
    const BUTTON_HOTKEYS = {}
    BUTTON_HOTKEYS[Buttons.BRUSH_BUTTON] = "d";
    BUTTON_HOTKEYS[Buttons.SELECTION_BUTTON] = "s";
    BUTTON_HOTKEYS[Buttons.PANNING_BUTTON] = "a";
    BUTTON_HOTKEYS[Buttons.ZOOM_BUTTON] = "a+s";
    BUTTON_HOTKEYS[Buttons.CURSOR_BUTTON] = "x";
    BUTTON_HOTKEYS[Buttons.SPINE_BRUSH_BUTTON] = "c";
    BUTTON_HOTKEYS[Buttons.ANGLE_BRUSH_BUTTON] = "v";

    let mButtons = {}
    for (const buttonId of BUTTON_LIST) {
        let clickCallback = async () => await mOnClickCallack(buttonId);
        let onLoad = null;
        if (buttonId == Buttons.COLOR_BUTTON) {
            clickCallback = () => openBrushColorPicker();
            onLoad = () => {
                // When loaded, set the color, this triggers on change
                mColorPicker.setColor("#33333300", false)
            }
        }
        mButtons[buttonId] = new MenuButton({
            id: buttonId,
            parentSvg: mSvg,
            img: BUTTON_IMAGES[buttonId],
            clickCallback,
            onLoad,
            hotkey: BUTTON_HOTKEYS[buttonId] ? BUTTON_HOTKEYS[buttonId] : null,
        })

    }

    let buttonSpacing = MENU_BUTTON_SIZE * 1.5;
    let subButtonSpacing = MENU_BUTTON_SIZE * 1.1;
    BUTTON_LIST.filter(b => !BUTTON_PARENTS.find(([parent, child]) => child == b)).forEach((id, index) => {
        mButtons[id].setPosition(MENU_BUTTON_SIZE, buttonSpacing * (0.5 + index));
        BUTTON_PARENTS.filter(row => row[0] == id).forEach(([parentId, childId], subIndex) => {
            mButtons[childId].setPosition(MENU_BUTTON_SIZE + subButtonSpacing * (0.7 + subIndex), buttonSpacing * (0.25 + index) + buttonSpacing * 0.5)
        });
    });

    mColorPickerContainer = d3.select("#color-container")
        .style('display', 'none');
    mColorPicker = new Picker({
        parent: mColorPickerContainer.node(),
        popup: false,
        editor: false,
    });

    mColorPicker.onChange = function (color) {
        mColorChangeCallback(color.hex, mColorPickerInternalOpen);
        mLastColor = color.hex;
        if (mColorPickerInternalOpen) {
            d3.select("#color-selector-color").style("fill", color.hex)
        }
    };
    mColorPicker.onDone = hideColorPicker;

    function activateButton(buttonId) {
        // if the active button is not a menu button do nothing.
        if (!buttonId in mButtons) { return; }
        let button = mButtons[buttonId];
        button.setActive(true);
        button.show();
        BUTTON_PARENTS.filter(([parentId, childId]) => parentId == buttonId)
            .map(([parentId, childId]) => childId)
            .forEach(buttonId => mButtons[buttonId].show());
    }

    function deactivateButton(buttonId) {
        // if the active button is not a menu button do nothing.
        if (!buttonId in mButtons) { return; }
        mButtons[buttonId].setActive(false);
        if (BUTTON_PARENTS.find(([parentId, childId]) => childId == buttonId)) {
            mButtons[buttonId].hide();
        }
        BUTTON_PARENTS.filter(([parentId, childId]) => parentId == buttonId)
            .map(([parentId, childId]) => childId)
            .forEach(buttonId => mButtons[buttonId].hide());
    }

    function deactivateAll() {
        Object.values(mButtons).forEach(button => button.setActive(false));
        BUTTON_PARENTS.forEach(([parentId, childId]) => mButtons[childId].hide());
    }

    function onResize(width, height) {
        mSvg.attr('width', width)
        mSvg.attr('height', height)
    }

    function openBrushColorPicker() {
        mColorPickerInternalOpen = true;
        let position = mButtons[Buttons.COLOR_BUTTON].getPosition();
        openColorPicker({ x: position.x + MENU_BUTTON_SIZE * 0.5, y: position.y - MENU_BUTTON_SIZE * 0.5 });
    }

    function showColorPicker(coords) {
        mColorPickerInternalOpen = false;
        openColorPicker(coords)
    }

    function openColorPicker(coords) {
        mColorPickerContainer
            .style("left", coords.x + "px")
            .style("top", coords.y + "px")
            .style('display', '');
    }

    function hideColorPicker() {
        if (mLastColor) mColorPickedCallback(mLastColor, mColorPickerInternalOpen);
        mLastColor = null;
        mColorPickerContainer.style('display', 'none');
    }

    return {
        onResize,
        activateButton,
        deactivateButton,
        deactivateAll,
        showColorPicker,
        hideColorPicker,
        setColorChangeCallback: (func) => mColorChangeCallback = func,
        setColorPickedCallback: (func) => mColorPickedCallback = func,
        setOnClickCallback: (func) => mOnClickCallack = func,
    }
}