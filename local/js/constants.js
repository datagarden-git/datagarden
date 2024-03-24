export const NO_CATEGORY_ID = "no_category";
export const SUPPLIMENTAL_ID = { name: "aSupplimental" };
export const MAP_ELEMENTS = "apply_mapping";
export const DIMENSION_RANGE_V1 = 'range_top';
export const DIMENSION_RANGE_V2 = 'range_bottom';

export const DEFAULT_CATEGORY_NAME = "Category";

export const DIMENSION_SETTINGS_HEIGHT = 100;

export const MENU_BUTTON_SIZE = 40;

export const Buttons = {
    CURSOR_BUTTON: "Cursor",
    BRUSH_BUTTON: "Brush",
    SELECTION_BUTTON: "Selection",
    PANNING_BUTTON: "Pan",
    ZOOM_BUTTON: "Zoom",
    VIEW_BUTTON: "View",
    COLOR_BUTTON: "Color",
    DOWNLOAD: "Download",
    DOWNLOAD_IMAGE: "DownloadImage",
    UPLOAD: "Upload",
    SPINE_BRUSH_BUTTON: "Spine",
    ANGLE_BRUSH_BUTTON: "Angle",
}

export const FdlButtons = {
    ADD: "Add",
}

export const Size = {
    ELEMENT_NODE_SIZE: 20,
    DIMENSION_SIZE: 40,
    CATEGORY_SIZE: 30,
}

export const Padding = {
    NODE: 5,
    CLUSTER: 20,
    CATEGORY: 5,
}

export const ContextButtons = {
    CENTER: 'center',
    MERGE: 'merge-mode',
    SPINE: 'recalculate-spine',
    STYLE_STRIP: 'style-element-strip',
    STYLE_STROKES: 'style-element-strokes',
    DELETE: 'delete-the-stuff',
    PARENT: 'parent-mode',
    COLOR: 'color'
}

export const ChannelType = {
    LABEL: "label",
    SHAPE: "form",
    COLOR: "color",
    SIZE: "size",
    ANGLE: "angle",
    POSITION: "position",
}

export const DimensionType = {
    DISCRETE: 'discrete',
    CONTINUOUS: 'continuous',
}

export const AngleType = {
    RELATIVE: 'Relative',
    ABSOLUTE: 'Absolute',
}

export const SizeType = {
    LENGTH: 'Length',
    AREA: 'Area',
}


export const Tab = {
    PARENT: "parent",
    LEGEND: "legend",
    TABLE: "table"
}

export const FdlMode = {
    DIMENSION: "dimension",
    PARENT: "parent",
    LEGEND: "legend",
}

export const DimensionLabels = {};
DimensionLabels[DimensionType.DISCRETE] = 'Categorical';
DimensionLabels[DimensionType.CONTINUOUS] = 'Number';

export const ChannelLabels = {};
ChannelLabels[ChannelType.LABEL] = 'Label';
ChannelLabels[ChannelType.SHAPE] = 'Shape';
ChannelLabels[ChannelType.COLOR] = 'Color';
ChannelLabels[ChannelType.SIZE] = 'Size';
ChannelLabels[ChannelType.ANGLE] = 'Angle';
ChannelLabels[ChannelType.POSITION] = 'Position';

export const SimulationValues = {
    ALPHA: .0005,
    VELOCITY: 0.7,
    STRENGTH_X: 0.05,
    STRENGTH_COLLIDE: 1,
}

export const DropDown = {
    TYPE: "type",
    CHANNEL: "channel",
    LEVEL: "level",
    ANGLE: "angle",
    SIZE: "size",
}

export const FdlInteraction = {
    ZOOMING: 'zooming',
    PANNING: 'panning',
    SELECTION: 'selection',
    LASSO: 'lasso',
}