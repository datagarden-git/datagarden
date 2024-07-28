export function TextInput() {
    let mTextChangedCallback = (text) => { };

    let mShowingItem = false;
    let mInputbox = d3.select('#input-box');

    mInputbox.on('change', function (e) {
        hide();
    }).on('blur', function (e) {
        if (mShowingItem) {
            mTextChangedCallback(mShowingItem, mInputbox.property("value"));
            mShowingItem = false;
        }
        hide();
    });

    function show(itemId, text, x, y, width, height) {
        mShowingItem = itemId;
        mInputbox.style('top', (y - 2) + 'px')
            .style('left', (x + 8) + 'px')
            .style('height', height + 'px')
            .style('width', width + 'px');
        mInputbox.property("value", text);
        mInputbox.style("display", "");
        mInputbox.node().focus();
    }

    function hide() {
        mInputbox.style("display", "none");
    }

    function returnText() {
        if (mShowingItem) {
            mTextChangedCallback(mShowingItem, mInputbox.property("value"));
            mShowingItem = false;
        }
        hide();
    }

    hide();

    return {
        show,
        hide,
        returnText,
        isShowing: () => mShowingItem ? true : false,
        setTextChangedCallback: (func) => mTextChangedCallback = func,
    }
}
