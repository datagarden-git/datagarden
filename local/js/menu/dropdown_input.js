import { AngleType, ChannelLabels, ChannelType, DimensionLabels, DimensionType, DropDown, SizeType } from "../constants.js";
import { DataUtil } from "../utils/data_util.js";

export function DropdownInput() {
    let mSelectedCallback = (item) => { };

    let mShowingId = false;
    let mShowingType = null;
    let mDropdownContainer = d3.select('#dropdown-container');
    let mTypeSelect = mDropdownContainer.append("select").attr('id', 'type-select');
    mTypeSelect.append("option").attr("value", DimensionType.DISCRETE).html(DimensionLabels[DimensionType.DISCRETE]);
    mTypeSelect.append("option").attr("value", DimensionType.CONTINUOUS).html(DimensionLabels[DimensionType.CONTINUOUS]);
    let mChannelSelect = mDropdownContainer.append("select").attr('id', 'channel-select');
    mChannelSelect.append("option").attr("value", ChannelType.LABEL).html(ChannelLabels[ChannelType.LABEL]);
    mChannelSelect.append("option").attr("value", ChannelType.SHAPE).html(ChannelLabels[ChannelType.SHAPE]);
    mChannelSelect.append("option").attr("value", ChannelType.COLOR).html(ChannelLabels[ChannelType.COLOR]);
    mChannelSelect.append("option").attr("value", ChannelType.SIZE).html(ChannelLabels[ChannelType.SIZE]);
    mChannelSelect.append("option").attr("value", ChannelType.ANGLE).html(ChannelLabels[ChannelType.ANGLE]);
    mChannelSelect.append("option").attr("value", ChannelType.POSITION).html(ChannelLabels[ChannelType.POSITION]);
    let mAngleSelect = mDropdownContainer.append("select").attr('id', 'angle-select');
    mAngleSelect.append("option").attr("value", AngleType.RELATIVE).html("Relative");
    mAngleSelect.append("option").attr("value", AngleType.ABSOLUTE).html("Absolute");
    let mSizeSelect = mDropdownContainer.append("select").attr('id', 'size-select');
    mSizeSelect.append("option").attr("value", SizeType.LENGTH).html("Length");
    mSizeSelect.append("option").attr("value", SizeType.AREA).html("Area");
    let mLevelSelect = mDropdownContainer.append("select").attr('id', 'level-select');

    mTypeSelect.on('change', onChange).on('blur', onBlur);
    mChannelSelect.on('change', onChange).on('blur', onBlur);
    mLevelSelect.on('change', onChange).on('blur', onBlur);
    mAngleSelect.on('change', onChange).on('blur', onBlur);
    mSizeSelect.on('change', onChange).on('blur', onBlur);

    function onChange() {
        if (mShowingId) {
            mSelectedCallback(mShowingType, mShowingId, d3.select(this).property("value"));
            mShowingId = false;
        }
        hide();
    }

    function onBlur() {
        hide();
    }

    function onModelUpdate(model) {
        let maxLevel = model.getElements().reduce((max, element) => Math.max(max, model.getElementLevel(element.id)), 0);
        mLevelSelect.html("");
        for (let i = 0; i <= maxLevel; i++) {
            mLevelSelect.append("option").attr("value", i).html("Level " + i).style("background", DataUtil.getLevelColor(i));
        }
    }

    function show(dropdownType, itemId, value, x, y, width, height) {
        mTypeSelect.style("display", "none");
        mChannelSelect.style("display", "none");
        mLevelSelect.style("display", "none");
        mAngleSelect.style("display", "none");
        mSizeSelect.style("display", "none");
        mDropdownContainer.style('top', y + 'px')
            .style('left', (x + 10) + 'px')
            .style('height', height + 'px')
            .style('width', width + 'px');
        let selectedDropdown;
        if (dropdownType == DropDown.TYPE) {
            selectedDropdown = mTypeSelect;
        } else if (dropdownType == DropDown.CHANNEL) {
            selectedDropdown = mChannelSelect;
        } else if (dropdownType == DropDown.LEVEL) {
            selectedDropdown = mLevelSelect;
        } else if (dropdownType == DropDown.ANGLE) {
            selectedDropdown = mAngleSelect;
        } else if (dropdownType == DropDown.SIZE) {
            selectedDropdown = mSizeSelect;
        }
        selectedDropdown.property("value", value)
            .style('height', height + 'px')
            .style('width', width + 'px')
            .style("display", "");
        selectedDropdown.node().focus();

        mShowingType = dropdownType;
        mShowingId = itemId;
        mDropdownContainer.style("display", "");
    }

    function hide() {
        mDropdownContainer.style("display", "none");
    }

    hide();

    return {
        show,
        hide,
        onModelUpdate,
        isShowing: () => mShowingId ? true : false,
        setSelectedCallback: (func) => mSelectedCallback = func,
    }
}
