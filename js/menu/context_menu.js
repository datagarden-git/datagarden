import { ContextButtons } from "../constants.js";
import { RadialContextMenu } from "./radial_context_menu.js";

export function ContextMenu(svg) {
    let mContextMenuId = "context-menu";
    let mButtonData = {}
    let mSvg = svg;

    mButtonData[ContextButtons.MERGE] = {
        id: ContextButtons.MERGE,
        img: "img/merge_elements.svg",
        tooltip: "Merge these strokes into a new element",
    }
    mButtonData[ContextButtons.SPINE] = {
        id: ContextButtons.SPINE,
        img: "img/fit_spine.svg",
        tooltip: "Recalculate element spine and strip",
    }
    mButtonData[ContextButtons.STYLE_STRIP] = {
        id: ContextButtons.STYLE_STRIP,
        img: "img/style_strip.svg",
        tooltip: "Style element using calculated strip",
    }
    mButtonData[ContextButtons.STYLE_STROKES] = {
        id: ContextButtons.STYLE_STROKES,
        img: "img/style_strokes.svg",
        tooltip: "Style element using it's strokes",
    }
    mButtonData[ContextButtons.DELETE] = {
        id: ContextButtons.DELETE,
        img: "img/delete_icon.svg",
        tooltip: "Delete all the things",
    }
    mButtonData[ContextButtons.PARENT] = {
        id: ContextButtons.PARENT,
        img: "img/parent_icon.svg",
        tooltip: "Set the parent for the selection",
    }
    mButtonData[ContextButtons.COLOR] = {
        id: ContextButtons.COLOR,
        img: "img/color_selector_rainbow.png",
        tooltip: "Set the color of all items in selection",
    }

    function showContextMenu(pos, buttons, callback) {
        hideContextMenu();
        let buttonData = buttons.filter(b => {
            if (!mButtonData[b]) {
                console.error("Not a supported button id", b);
                return false;
            }
            return true;
        });
        if (buttonData.length == 0) { console.error("No valid buttons provided"); return; }
        buttonData = buttonData.map(b => mButtonData[b]);
        let contextMenu = new RadialContextMenu(mSvg, mContextMenuId, buttonData, 40);
        contextMenu.onClick((id) => {
            if (id == ContextButtons.CENTER) {
                hideContextMenu();
            } else {
                callback(id);
            }
        })
        contextMenu.setPosition(pos.x, pos.y);
        contextMenu.show();
    }

    function hideContextMenu() {
        d3.select("#" + mContextMenuId).remove();
    }

    return {
        showContextMenu,
        hideContextMenu,
    }
}