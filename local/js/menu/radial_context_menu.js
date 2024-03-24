import { ContextButtons } from "../constants.js";
import { FiltersUtil } from "../utils/filters_util.js";
import { ToolTip } from "./tooltip.js";

export function RadialContextMenu(svg, id, items, buttonSize) {
    const BUTTON_PADDING = 10;
    const MIN_BUTTONS = 5;

    let mX = 0;
    let mY = 0;

    let mMenuContainer = svg.append("g")
        .attr("id", id);
    let mClickCallback = () => { };

    let mTooltip = new ToolTip();

    let radius = buttonSize + BUTTON_PADDING * 2;
    let buttonCenterDist = buttonSize / 2 + BUTTON_PADDING;
    let innerRadius = BUTTON_PADDING;
    let angle = (2 * Math.PI) / Math.max(MIN_BUTTONS, items.length);
    if (angle < Math.PI) {
        buttonCenterDist = buttonSize / Math.sin(angle / 2);
        radius = buttonCenterDist + buttonSize / 2 + BUTTON_PADDING;
        innerRadius = buttonCenterDist - buttonSize / 2 - BUTTON_PADDING;
    }

    if (items.length >= MIN_BUTTONS) {
        let shadowCircleD = "M" + -radius + ",0 " +
            "A" + Math.round(radius) + "," + Math.round(radius) + ",0,1,0," + -radius + ",-1 " +
            "Z" +
            "M" + -innerRadius + ",0 " +
            "A" + Math.round(innerRadius) + "," + Math.round(innerRadius) + ",0,1,0," + -innerRadius + ",-1 " +
            "Z"
        mMenuContainer.append('path')
            .attr("d", shadowCircleD)
            .attr('fill', "#FFFFFF00")
            .attr('stroke', "#000000")
            .attr('stroke-width', "3")
            .attr("filter", FiltersUtil.DROP_SHADOW);
    }

    mMenuContainer.append('circle')
        .attr("cx", 0)
        .attr("cx", 0)
        .attr("r", innerRadius)
        .attr('fill', "#FFFFFF00")
        .on("pointerdown", function (event) {
            // catch the event, but don't send back the call yet
            event.stopPropagation();
        })
        .on("pointerup", function (event) {
            // also catch this event, now send a click call
            mClickCallback(ContextButtons.CENTER);
            event.stopPropagation();
        });

    for (let i = 0; i < items.length; i++) {
        let a = i * angle;
        let a2 = (i + 1) * angle;
        let aMid = (i + 0.5) * angle;
        let p1 = { x: Math.round(radius * Math.cos(a)), y: Math.round(radius * Math.sin(a)) }
        let p2 = { x: Math.round(radius * Math.cos(a2)), y: Math.round(radius * Math.sin(a2)) }
        let p3 = { x: Math.round(innerRadius * Math.cos(a2)), y: Math.round(innerRadius * Math.sin(a2)) }
        let p4 = { x: Math.round(innerRadius * Math.cos(a)), y: Math.round(innerRadius * Math.sin(a)) }

        let pImg = { x: Math.round(buttonCenterDist * Math.cos(aMid)), y: Math.round(buttonCenterDist * Math.sin(aMid)) }
        let d = "M" + p1.x + "," + p1.y + " "
        d += "A" + Math.round(radius) + "," + Math.round(radius) + ",0,0,1," + p2.x + "," + p2.y + " ";
        d += "L" + p3.x + "," + p3.y + " "
        d += "A" + Math.round(innerRadius) + "," + Math.round(innerRadius) + ",0,0,0," + p4.x + "," + p4.y + " ";
        d += "Z";
        let tile = mMenuContainer.append("g")
            .attr("id", items[i].id)
            .on('pointerover', function (e) {
                d3.select(this).raise().attr("filter", FiltersUtil.DROP_SHADOW);
                mTooltip.show(e.clientX + 10, e.clientY + 10, items[i].tooltip);
            }).on('pointerleave', function () {
                d3.select(this).attr("filter", "");
                mTooltip.hide();
            }).on('pointerdown', function (event) {
                d3.select(this).attr("filter", "");
                mTooltip.hide();
                event.stopPropagation();
            }).on('pointerup', function (event) {
                d3.select(this).attr("filter", FiltersUtil.DROP_SHADOW);
                mClickCallback(items[i].id);
                event.stopPropagation();
            });
        tile.append("path")
            .attr("d", d)
            .attr("stroke", "black")
            .attr("stroke-width", 3)
            .attr('fill', 'white')
        tile.append("image")
            .attr("x", pImg.x - buttonSize / 2)
            .attr("y", pImg.y - buttonSize / 2)
            .attr("href", items[i].img)
            .attr("height", buttonSize)
            .attr("width", buttonSize);
    }

    function setPosition(x, y) {
        mX = x; mY = y;
        mMenuContainer.attr("transform", "translate(" + x + "," + y + ")")
    }

    function show() {
        mMenuContainer.style('display', '');
    }

    function hide() {
        mMenuContainer.style('display', 'none');
        mTooltip.hide();
    }

    this.setPosition = setPosition;
    this.show = show;
    this.hide = hide;
    this.onClick = (func) => mClickCallback = func;
}