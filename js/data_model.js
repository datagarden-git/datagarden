import { ChannelType, DimensionType, SUPPLIMENTAL_ID } from "./constants.js";
import { Data } from "./data_structs.js";
import { DataUtil } from "./utils/data_util.js";
import { GenerationUtil } from "./utils/generation_utils.js";
import { IdUtil } from "./utils/id_util.js";

export function DataModel() {
    let mElements = [];
    let mDimensions = [];

    function clone() {
        let clone = new DataModel();
        clone.setElements(getElements().map(e => e.clone()));
        clone.setDimensions(getDimensions().map(e => e.clone()));
        return clone;
    }

    function toObject() {
        let model = this.clone();
        return {
            elements: model.getElements(),
            dimensions: model.getDimensions()
        }
    }

    function getStroke(strokeId) {
        return getStrokes().find(s => s.id == strokeId);
    }

    function getStrokes() {
        return getElements().map(e => e.strokes).flat();
    }

    function getElement(elementId) {
        if (!IdUtil.isType(elementId, Data.Element)) { console.error("Not an element id! " + elementId); return null; };
        return getElements().find(e => e.id == elementId);
    }

    function getElementForStroke(strokeId) {
        if (!IdUtil.isType(strokeId, Data.Stroke)) { console.error("Not an stroke id! " + strokeId); return null; };
        return getElements().find(e => e.strokes.some(s => s.id == strokeId))
    }

    function getElements() {
        return mElements;
    }

    function getLevelElements(level) {
        return getElements().filter(e => {
            return getElementLevel(e.id) == level;
        });
    }

    function setElements(elements) {
        mElements = elements;
    }

    function getElementChildren(elementId) {
        return getElements().filter(e => e.parentId == elementId);
    }

    // returns an array with the element's decendants
    function getElementDecendants(elementId) {
        if (!IdUtil.isType(elementId, Data.Element)) { console.error("Not an element id! " + elementId); return null; };
        let elements = [];
        let allElements = getElements();
        let elementQueue = [...allElements.filter(e => e.parentId == elementId)];
        while (elementQueue.length > 0) {
            let elem = elementQueue.shift();
            elements.push(elem);
            elementQueue.push(...allElements.filter(e => e.parentId == elem.id));
        }
        return elements;
    }

    function getElementMappedValues(elementId) {
        let level = getElementLevel(elementId)
        let result = [];
        getDimensions().filter(d => d.level == level && DataUtil.dimensionValid(d)).forEach(dimension => {
            let value = GenerationUtil.getMappedValue(this, dimension.id, elementId);
            if (typeof value == "number") { value = Math.round(value * 100) / 100 }
            if (value || value === 0) {
                result.push({ dimensionId: dimension.id, dimensionName: dimension.name, value: value });
            }
        })
        return result;
    }

    function getElementLevel(elementId) {
        let element = getElement(elementId);
        if (!element) { console.error("invalid element id", elementId); return -1; }

        let level = 0;
        let touched = [elementId];
        let curr = element;
        while (curr.parentId) {
            let parent = getElement(curr.parentId)
            if (!parent) { console.error("Invalid state, parent not found", curr.parentId); return -1; };
            level++;
            curr = parent;
            if (touched.includes(curr.id)) { console.error("Invalid State, loop", touched); return -1; }
            touched.push(curr.id);
        }
        return level;
    }

    function getDimension(dimensionId) {
        if (!IdUtil.isType(dimensionId, Data.Dimension)) { console.error("Not an dimension id! " + dimensionId); return null; };
        return getDimensions().find(d => d.id == dimensionId)
    }

    function getDimensions() {
        return mDimensions;
    }

    function getDimenstionForCategory(categoryId) {
        if (!IdUtil.isType(categoryId, Data.Category)) { console.error("Not a category id! " + categoryId); return null; };
        return getDimensions().find(d => d.categories.some(l => l.id == categoryId))
    }

    function setDimensions(dimensions) {
        mDimensions = dimensions;
    }

    function getDimensionForCategory(categoryId) {
        if (!IdUtil.isType(categoryId, Data.Category)) { console.error("Not an category id! " + categoryId); return null; };
        return getDimensions().find(d => d.categories.some(l => l.id == categoryId));
    }

    function getCategory(categoryId) {
        if (!IdUtil.isType(categoryId, Data.Category)) { console.error("Not an category id! " + categoryId); return null; };
        return getDimensions().map(d => d.categories).flat().find(l => l.id == categoryId);
    }

    function getCategories() {
        return getDimensions().map(d => {
            if (d.type == DimensionType.DISCRETE) {
                return d.categories;
            } else {
                return []
            }
        }).flat();
    }

    function getCategoryForElement(dimensionId, elementId) {
        let dimension = getDimension(dimensionId);
        if (!dimension) return null;
        return dimension.categories.find(l => l.elementIds.includes(elementId));
    }

    function getTables() {
        let dimensions = mDimensions
            .filter(d => DataUtil.dimensionValid(d))
            .filter(d => d.type == DimensionType.DISCRETE || DataUtil.domainIsValid(d.domain));
        if (dimensions.length == 0) return [];

        // leaves are just the elements, they can be at many levels.
        let leafs = GenerationUtil.getLeaves(this);

        let maxLevel = GenerationUtil.getLowestMappedLevel(this);
        let suplimentalLabelDimensions = []
        for (let i = 0; i < maxLevel; i++) {
            if (GenerationUtil.needsLabel(this, i)) {
                let labelDimen = new Data.Dimension();
                labelDimen.id = IdUtil.getUniqueId(SUPPLIMENTAL_ID);
                labelDimen.type = DimensionType.DISCRETE;
                labelDimen.channel = ChannelType.LABEL;
                labelDimen.name = "\t";
                labelDimen.level = i;
                let levelRowElements = DataUtil.unique(leafs.map(e => GenerationUtil.getAncestorAtLevel(e, i, this))
                    .filter(e => e && !GenerationUtil.getLabelForElement(e.id, this)));
                labelDimen.categories = levelRowElements.map((e, index) => {
                    let category = new Data.Category();
                    category.name = "" + index;
                    category.elementIds = [e.id];
                    return category;
                })
                suplimentalLabelDimensions[i] = labelDimen;
            }
        }

        let tableCells = []
        mElements.forEach(element => {
            let level = getElementLevel(element.id);
            dimensions.filter(d => d.level == level).forEach(dimension => {
                let value = GenerationUtil.getMappedValue(this, dimension.id, element.id);
                if (typeof value == "number") { value = Math.round(value * 100) / 100 }
                if (value || value === 0) {
                    tableCells.push({
                        elementId: element.id,
                        dimensionId: dimension.id,
                        value: value,
                        level: level,
                    });
                }
            })
            if (suplimentalLabelDimensions[level]) {
                let category = suplimentalLabelDimensions[level].categories.find(c => c.elementIds.includes(element.id))
                if (category) {
                    tableCells.push({
                        elementId: element.id,
                        dimensionId: suplimentalLabelDimensions[level].id,
                        value: category.name,
                        level: level,
                    });
                }
            }
        });

        let rows = []
        leafs.forEach(leaf => {
            let rowData = [];
            let nextId = leaf.id;
            while (nextId) {
                rowData.push(...tableCells.filter(c => c.elementId == nextId))
                let element = getElement(nextId);
                nextId = element.parentId;
            }
            let key = rowData.map(c => { return { id: c.dimensionId, level: c.level } })
                .sort(DataUtil.compareDimensions)
                .map(c => c.id).join(",");
            rows.push({ key, rowData });
        })

        let tables = {};
        rows.forEach(({ key, rowData }) => {
            if (!tables[key]) {
                tables[key] = new DataTable();
                rowData.map(c => c.dimensionId).forEach(id => {
                    let dimension;
                    if (IdUtil.isType(id, SUPPLIMENTAL_ID)) {
                        dimension = suplimentalLabelDimensions.find(d => d ? d.id == id : false);
                    } else {
                        dimension = dimensions.find(d => d.id == id);
                    }
                    tables[key].addColumn(dimension.clone());
                })
            }
        })

        // do this by table so we get good indexes for the rows
        Object.keys(tables).forEach(tableKey => {
            rows.filter(r => r.key == tableKey).forEach(({ key, rowData }, index) => {
                rowData.forEach(tableCell => {
                    tables[key].setCell(tableCell.dimensionId, index, tableCell.value, tableCell.elementId)
                })
            });
        })

        return Object.values(tables);
    }

    function getTree() {
        let elements = getElements();
        let addChildren = function (container) {
            container.children = elements.filter(e => e.parentId == container.id).map(e => { return { id: e.id } });
            container.children.forEach(child => addChildren(child));
        }

        let root = { children: getElements().filter(e => !e.parentId).map(e => { return { id: e.id } }) };
        root.children.forEach(child => addChildren(child));

        return root;
    }

    return {
        clone,
        toObject,
        getStroke,
        getStrokes,
        getElement,
        getElementForStroke,
        getElements,
        getLevelElements,
        setElements,
        getElementDecendants,
        getElementMappedValues,
        getElementChildren,
        getElementLevel,
        getDimension,
        getDimensions,
        getDimenstionForCategory,
        setDimensions,
        getDimensionForCategory,
        getCategory,
        getCategories,
        getCategoryForElement,
        getTables,
        getTree,
    }
}

DataModel.fromObject = function (obj) {
    let model = new DataModel();
    if (!Array.isArray(obj.elements) || !Array.isArray(obj.dimensions)) {
        console.error("Invalid data model object", obj);
        return;
    }
    model.setElements(obj.elements.map(g => Data.Element.fromObject(g)));
    model.setDimensions(obj.dimensions.map(d => Data.Dimension.fromObject(d)));
    return model;
}

export function DataTable() {
    let mDimensions = []
    let mRows = []

    function addColumn(dimension) {
        if (mDimensions.find(c => c.id == dimension.id)) return;
        mDimensions.push(dimension);
        mDimensions.sort(DataUtil.compareDimensions);
    }

    function setCell(colId, rowIndex, value, id = null) {
        let colIndex = mDimensions.findIndex(c => c.id == colId)
        if (colIndex == -1) { console.error("Invalid column id, cell not added", colId); return; }
        if (!mRows[rowIndex]) mRows[rowIndex] = [];

        let cell = mRows[rowIndex].find(c => c.colId == colId);
        if (!cell) {
            cell = { colId };
            mRows[rowIndex].push(cell);
        }
        cell.value = value;
        if (id) cell.id = id;
    }

    function clearCells() {
        mRows = [];
    }

    function getColumns() {
        return [...mDimensions]
    }

    function getDataArray() {
        return mRows.map(row => mDimensions.map(col => {
            let cell = row.find(cell => cell.colId == col.id)
            return {
                id: cell.id,
                value: cell.value
            }
        }));
    }

    function getColumnData(columnId) {
        return mRows.map(row => row.find(c => c.colId == columnId));
    }

    this.getColumns = getColumns;
    this.addColumn = addColumn;
    this.setCell = setCell;
    this.clearCells = clearCells;
    this.getDataArray = getDataArray;
    this.getColumnData = getColumnData;
}