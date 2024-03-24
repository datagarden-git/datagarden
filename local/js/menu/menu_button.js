import { MENU_BUTTON_SIZE } from "../constants.js";
import { FiltersUtil } from "../utils/filters_util.js";

export function MenuButton({ id, parentSvg, img, buttonSize = MENU_BUTTON_SIZE, clickCallback, onLoad, hotkey }) {
    const HOTKEY_HEIGHT = 25;

    let mPosition = { x: 0, y: 0 };

    let mButton = parentSvg.append('g')
        .attr("id", id);
    let mSvg = mButton.append('g')
        .attr("filter", FiltersUtil.DROP_SHADOW);
    if (hotkey) mButton.append("text")
        .style("font", HOTKEY_HEIGHT + "px DefaultFont")
        .style("stroke-linejoin", "round")
        .style("fill", "black")
        .style("stroke", "white")
        .style("stroke-width", "1px")
        .style("paint-order", "stroke")
        .attr("x", buttonSize - 8)
        .attr("y", buttonSize)
        .text(hotkey);

    mButton.append("rect")
        .classed("button-overlay", true)
        .attr("height", buttonSize)
        .attr("width", buttonSize)
        .attr("opacity", 0)
        .on('pointerdown', (event) => {
            event.stopPropagation();
        }).on('pointerup', async (event) => {
            event.stopPropagation();
            await clickCallback();
        });

    d3.xml(img).then(data => {
        let width = data.documentElement.getAttribute('width');
        let scale = buttonSize / width;
        mSvg.attr("transform", "scale(" + scale + " " + scale + ")")
        mSvg.node().append(data.documentElement);
        onLoad ? onLoad() : null;
    }).catch(() => {
        // Failed to load XML, we are probably not on the server, getting images instead
        mSvg.append("image")
            .attr("href", img)
            .attr("height", buttonSize)
            .attr("width", buttonSize);
    });

    function setPosition(x, y) {
        mPosition = { x, y };
        mButton.attr("transform", "translate(" + (x - buttonSize / 2) + "," + (y - buttonSize / 2) + ")");
    }

    function getPosition() {
        return mPosition;
    }

    function setActive(active) {
        if (active) {
            mButton.attr("filter", FiltersUtil.OUTLINE)
        } else {
            mButton.attr("filter", FiltersUtil.DROP_SHADOW)
        }
    }

    function hide() {
        mButton.style("display", "none");
    }

    function show() {
        mButton.style("display", "");

    }

    this.setPosition = setPosition;
    this.getPosition = getPosition;
    this.hide = hide;
    this.show = show;
    this.setActive = setActive;
}
