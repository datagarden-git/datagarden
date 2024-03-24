export function ToolTip() {
    let mText = d3.select('#tooltips')
        .append("div")
        .style("position", "absolute")
        .style('width', '200px')
        .style("font", "16px DefaultFont")
        .style("stroke-linejoin", "round")
        .style("fill", "black")
        .style("stroke", "white")
        .style("stroke-width", "1px")
        .style("paint-order", "stroke");
    mText.style("display", "none")

    function show(x, y, text) {
        mText.style("left", (x + 10) + "px")
            .style("top", (y + 10) + "px")
            .html(text)
            .style("display", "");
    }

    function hide() {
        mText.style("display", "none");
    }

    return {
        show,
        hide,
    }
}