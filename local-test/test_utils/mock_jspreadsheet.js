function mockSpreadSheet(element, config) {
    let data = config.data;
    let columns = config.columns;
    let meta = config.meta;

    element.spreadsheet = this;

    function getData() {
        return data;
    }

    function setData(d) {
        return data = d;
    }

    function setMeta(m) {
        return meta = m;
    }

    function getMeta(cellIndex) {
        return meta[cellIndex];
    }

    function insertColumn() {
        columns.push({});
    }

    function deleteColumn() {
        columns.pop();
    }

    function setWidth(i, width) {
        columns[i].width = width;
    }

    function setHeader(i, title) {
        columns[i].title = title;
    }

    function getCallbacks() {
        return config;
    }

    this.getData = getData;
    this.setData = setData;
    this.getMeta = getMeta;
    this.setMeta = setMeta;
    this.insertColumn = insertColumn;
    this.deleteColumn = deleteColumn;
    this.setWidth = setWidth;
    this.setHeader = setHeader;
    this.getCallbacks = getCallbacks;
    this.setStyle = () => { };
}


export function mockJspreadsheet(element, config) {
    return new mockSpreadSheet(element, config);
}

mockJspreadsheet.helpers = {
    getColumnNameFromCoords: function (x, y) {
        if (isNaN(x) || isNaN(y)) console.error("invalid coords", x, y);
        return x + "_" + y;
    }
}