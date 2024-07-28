import { ContextButtons } from "../constants.js";

export function FloatingButton(svg) {
    const BUTTON_PADDING = 5;

    let mClickCallback = () => { };
    let mGroup = svg.append('g')
        .attr('class', 'floating-button');
    let mBox = mGroup.append("rect")
        .style("fill", "white")
        .style("stroke", "black")
        .style("stroke-width", "1px");
    let mText = mGroup.append("text")
        .style("font", "16px DefaultFont")
        .style("dominant-baseline", "hanging")
        .style("fill", "black");


    mGroup.on("pointerdown", function (event) {
        // catch the event, but don't send back the call yet
        event.stopPropagation();
    }).on("pointerup", function (event) {
        // also catch this event, now send a click call
        mClickCallback(ContextButtons.CENTER);
        event.stopPropagation();
    });

    function show(x, y, text) {
        mText.attr("x", x + BUTTON_PADDING)
            .attr("y", y + BUTTON_PADDING)
            .text(text)
            .style("display", "");
        let bb = mText.node().getBBox();
        mBox.attr("x", bb.x - BUTTON_PADDING)
            .attr("y", bb.y - BUTTON_PADDING)
            .attr("width", bb.width + BUTTON_PADDING * 2)
            .attr("height", bb.height + BUTTON_PADDING * 2)
            .style("display", "");
    }

    function hide() {
        mText.style("display", "none");
        mBox.style("display", "none");
    }

    return {
        show,
        hide,
        setOnClickCallback: (func) => mClickCallback = func,
    }
}