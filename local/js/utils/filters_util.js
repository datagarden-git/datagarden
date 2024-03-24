export let FiltersUtil = function () {
    const DROP_SHADOW = 'dropshadow';
    const OUTLINE = 'outline';

    function addShadowFilter(svg) {
        const defs = (svg.select('defs').node()
            ? svg.select('defs')
            : svg.append("defs"));
        const shadow = defs.append("filter")
            .attr("id", DROP_SHADOW)
            .attr("y", "-40%")
            .attr("height", "180%")
            .attr("x", "-40%")
            .attr("width", "180%")
        shadow.append("feGaussianBlur")
            .attr("in", "SourceAlpha")
            .attr("stdDeviation", 4)
            .attr("result", "blur");
        shadow.append("feOffset")
            .attr("in", "blur")
            .attr("dx", 2)
            .attr("dy", 2)
            .attr("result", "offsetBlur");
        const feMerge = shadow.append("feMerge");
        feMerge.append("feMergeNode")
            .attr("in", "offsetBlur")
        feMerge.append("feMergeNode")
            .attr("in", "SourceGraphic");
    }

    function addOutlineFilter(svg) {
        const defs = (svg.select('defs').node()
            ? svg.select('defs')
            : svg.append("defs"));
        const outline = defs.append("filter")
            .attr("id", OUTLINE)
            .attr("y", "-40%")
            .attr("height", "180%")
            .attr("x", "-40%")
            .attr("width", "180%")
        outline.append("feMorphology")
            .attr("in", "SourceAlpha")
            .attr("operator", "dilate")
            .attr("radius", "3")
            .attr("result", "expanded");
        outline.append("feFlood")
            .attr("flood-color", "green")
            .attr("result", "color");
        outline.append("feComposite")
            .attr("in", "color")
            .attr("in2", "expanded")
            .attr("operator", "in")
        outline.append("feComposite")
            .attr("in", "SourceGraphic");
    }

    return {
        addShadowFilter,
        addOutlineFilter,
        DROP_SHADOW: "url(#" + DROP_SHADOW + ")",
        OUTLINE: "url(#" + OUTLINE + ")",
    }
}();