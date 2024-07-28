import { Data } from "../data_structs.js";
import { DataModel, DataTable } from "../data_model.js";
import { IdUtil } from "../utils/id_util.js";
import { ModelUtil } from "../utils/model_util.js";
import { GenerationUtil } from "../utils/generation_utils.js";
import { ToolTip } from "../menu/tooltip.js";

export function TableViewController(mColorMap) {
    const TABLE_ID = "data-table-"

    const GENERATE_MODEL_LABEL = 'Enable Table Editing (Unstable, save your work!)';
    const CLEAR_MODEL_LABEL = 'Disable Table Editing';

    const DEFAULT_COL_WIDTH = 100;

    let mSelectionCallback = () => { };
    let mHighlightCallback = () => { };
    let mModelGeneratedCallback = () => { }
    let mClearGeneratedModelCallback = () => { }

    let mEditingMode = false;
    let mPasting = false;

    let mModel = new DataModel();

    let mViewContainer = d3.select("#table-view-container")
    let mGenerateButton = mViewContainer.append('button')
        .attr('id', 'generate-button')
        .html(GENERATE_MODEL_LABEL)
        .on('click', modelGenerationMode)
    let mTablesContainer = mViewContainer.append('div').attr('id', 'tables-container');

    let mErrorTooltip = new ToolTip();

    let mJTables = [];
    let mTableDivs = [];
    let mDataTables = [];

    let mSelection = []
    let mHighlight = [];
    let mInvalidCells = {};


    function onModelUpdate(model) {
        mModel = model;
        let tables = model.getTables();
        for (let index in tables) if (!mTableDivs[index]) createTable(index);
        trimTables(tables.length)

        mDataTables = [];
        tables.forEach((modelTable, index) => {
            mDataTables.push(modelTable)
            let colCount = mJTables[index].getData()[0].length;
            let newColCount = modelTable.getColumns().length;
            for (let i = colCount; i < newColCount; i++) {
                mJTables[index].insertColumn();
                mJTables[index].setWidth(i, DEFAULT_COL_WIDTH)
            }
            for (let i = newColCount; i < colCount; i++) {
                mJTables[index].deleteColumn();
            }

            mJTables[index].setData(modelTable.getDataArray().map(r => r.map(c => c.value)));
            modelTable.getColumns().forEach((col, i) => { mJTables[index].setHeader(i, col.name); });
            mJTables[index].setMeta(modelTable.getDataArray().reduce((obj, rowData, rowIndex) => {
                rowData.forEach((cellData, colIndex) => {
                    let cellIndex = jspreadsheet.helpers.getColumnNameFromCoords(colIndex, rowIndex);
                    obj[cellIndex] = cellData
                })
                return obj;
            }, {}));
        })

        restyle();
    }

    function createTable(index) {
        mTableDivs[index] = mTablesContainer.append("div")
            .attr('id', TABLE_ID + index)
            .attr('tableIndex', index)
        mJTables[index] = jspreadsheet(mTableDivs[index].node(), {
            data: [['']],
            columns: [{ width: DEFAULT_COL_WIDTH }],
            meta: {},
            contextMenu: () => { },
            onselection,
            onbeforechange,
            onchange,
            onbeforepaste,
            onpaste,
        });
    }

    function trimTables(length) {
        mTableDivs.splice(length, mTableDivs.length - length).forEach(div => div.remove());
        mJTables.splice(length, mJTables.length - length);
    }

    function onselection(tableDiv, colStart, rowStart, colEnd, rowEnd) {
        mSelection = [];
        let showError = null;
        for (let col = colStart; col <= colEnd; col++) {
            for (let row = rowStart; row <= rowEnd; row++) {
                let index = d3.select(tableDiv).attr("tableIndex");
                let cellIndex = jspreadsheet.helpers.getColumnNameFromCoords(col, row);
                let meta = mJTables[index].getMeta(cellIndex);
                if (meta && IdUtil.isType(meta.id, Data.Element)) mSelection.push(meta.id)
                if (mInvalidCells[index] && mInvalidCells[index][cellIndex]) {
                    let cell = mJTables[index].getCell(cellIndex);
                    let bBox = cell.getBoundingClientRect();
                    showError = [bBox.x + bBox.width, bBox.y + bBox.height, mInvalidCells[index][cellIndex]];
                }
            }
        }
        mSelectionCallback(mSelection);
        if (showError) mErrorTooltip.show(...showError);
    }

    function onbeforechange(instance, cell, x, y, value) {
        if (mEditingMode) {
            return value;
        } else {
            let index = d3.select(instance).attr('tableindex');
            let cellIndex = jspreadsheet.helpers.getColumnNameFromCoords(x, y);
            let meta = mJTables[index].getMeta(cellIndex)
            return meta.value;
        }
    }

    function onchange(instance, cell, x, y, value) {
        if (mEditingMode && !mPasting) {
            parseTables();
        }
    }

    function onbeforepaste(instance, data, x, y) {
        if (mEditingMode) {
            mPasting = true;
        } else return false;
    }

    function onpaste(instance, data) {
        mPasting = false;
        if (mEditingMode) {
            parseTables();
        }
    }


    function restyle() {
        getCurrentJTables().forEach((jTable, index) => {
            let cellIndexes = []
            for (let row = 0; row < jTable.length; row++) {
                for (let col = 0; col < jTable[0].length; col++) {
                    cellIndexes.push(jspreadsheet.helpers.getColumnNameFromCoords(col, row))
                }
            }

            let styles = {}
            cellIndexes.forEach(cellIndex => {
                let meta = mJTables[index].getMeta(cellIndex);
                let style = '';
                style += 'color: black; ';
                if (meta && mSelection.includes(meta.id)) {
                    style += 'background-color: ' + mColorMap(meta.id) + '; ';
                } else {
                    style += 'background-color:white; ';
                }
                if (mInvalidCells[index] && mInvalidCells[index][cellIndex]) {
                    style += "borderColor: red; ";
                }
                styles[cellIndex] = style;
            })
            mJTables[index].setStyle(styles)
        })
    }

    function modelGenerationMode() {
        mEditingMode = true;
        mGenerateButton.html(CLEAR_MODEL_LABEL);
        mGenerateButton.on('click', clearModelMode);
        parseTables();
    }

    function clearModelMode() {
        mEditingMode = false;
        mInvalidCells = {};
        mGenerateButton.html(GENERATE_MODEL_LABEL);
        mGenerateButton.on('click', modelGenerationMode);
    }

    function parseTables() {
        let jTables = getCurrentJTables();
        if (jTables.length == 0) return mModel;

        let originalTables = mModel.getTables();
        let tables = jTables.map((jTable, tableIndex) => {
            let table = originalTables[tableIndex];
            table.getColumns().forEach(dimen => {
                dimen.categories.forEach(c => c.elementIds = []);
                dimen.unmappedIds = [];
            })
            table.clearCells();
            let cols = table.getColumns();
            jTable.forEach((row, rowIndex) => {
                row.forEach((value, colIndex) => {
                    let colId = cols[colIndex].id;
                    table.setCell(colId, rowIndex, value);
                });
            })
            return table;
        })

        mInvalidCells = GenerationUtil.validateTables(mModel.clone(), tables)
        if (Object.values(mInvalidCells).map(o => Object.keys(o)).flat().length > 0) { restyle(); return; }

        let model = GenerationUtil.modelFromTables(mModel.clone(), tables);
        mModelGeneratedCallback(model);
    }

    function onResize(width, height) {
        mViewContainer.style("height", height + "px")
            .style("width", width + "px");
    }

    function hide() {
        mViewContainer.style("display", "none");
    }

    function show() {
        mViewContainer.style("display", "");
    }

    function onSelection(selection) {
        mSelection = [];
        mSelection.push(...selection.filter(id => IdUtil.isType(id, Data.Element)))
        selection.filter(id => IdUtil.isType(id, Data.Stroke)).forEach(strokeId => {
            let element = mModel.getElementForStroke(strokeId);
            if (element) {
                mSelection.push(element.id);
            } else {
                console.error("invalid stroke id", strokeId);
            }
        });
        if (mSelection == []) mErrorTooltip.hide();
        restyle();
    }

    function getCurrentJTables() {
        return mJTables.map(t => t.getData());
    }

    function onHighlight() {
        // TODO impliment
    }

    return {
        onResize,
        onModelUpdate,
        onSelection,
        onHighlight,
        setSelectionCallback: (func) => mSelectionCallback = func,
        setHighlightCallback: (func) => mHighlightCallback = func,
        setModelGeneratedCallback: (func) => mModelGeneratedCallback = func,
        setClearGeneratedModelCallback: (func) => mClearGeneratedModelCallback = func,
        hide,
        show,
    }
}