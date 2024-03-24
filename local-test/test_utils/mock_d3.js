import { Size } from '../../local/js/constants.js';
import { VectorUtil } from '../../local/js/utils/vector_util.js';
import { createCanvas } from './mock_canvas.js';

let mJspreadsheet;

function MockElement(type) {
    let mAttrs = {};
    let mStyles = {};
    let mType = type;
    let mChildren = [];
    let mClasses = [];
    let mCallBacks = {};
    let mCanvas = null;
    let transform = new mockTransform();

    this.append = function (appendee) {
        if (typeof appendee == 'string') {
            let result = new MockElement(appendee);
            mChildren.push(result);
            return result;
        } else {
            mChildren.push(appendee);
            return appendee;
        }
    }
    this.select = function (selector) {
        if (selector instanceof MockElement) return selector;
        let stack = [...mChildren]
        while (stack.length > 0) {
            let found = stack.find(child => child.matches(selector));
            if (found) return found;
            stack = (stack.map(item => item.getChildren())).flat();
        }
        return { node: () => null, remove: () => null };
    }
    this.attr = function (att, val = null) {
        if (!att) {
            return mAttrs;
        }
        if (val !== null) {
            mAttrs[att] = val;
            if (mCanvas && (att == 'width' || att == 'height')) {
                mCanvas[att] = val;
            }
            return this;
        };
        return mAttrs[att];
    };
    this.text = function (val = null) {
        if (!val) {
            return mAttrs['text'];
        }
        if (val !== null) {
            mAttrs['text'] = val;
            return this;
        };
    };
    this.html = function (html) {
        if (html) {
            this.innerHtml = html;
            return this;
        } else {
            return this.innerHtml;
        }
    }
    this.style = function (style, val = null) {
        if (val !== null) {
            mStyles[style] = val
            return this;
        };
        return mStyles[style];
    };
    this.property = function (property, val = null) {
        if (val !== null) {
            mAttrs[property] = val
            return this;
        };
        return mAttrs[property];
    };
    this.classed = function (name, isClass) {
        if (!name) return mClasses;
        if (isClass) {
            mClasses.indexOf(name) === -1 ? mClasses.push(name) : null;
        } else {
            mClasses = mClasses.filter(c => c != name);
        }
        return this;
    }
    this.on = function (event, callback) {
        mCallBacks[event] = callback;
        return this;
    }
    this.node = function () {
        // just put all the D3 and element mocks on the same object. Simpler that way.
        return this;
    }
    this.lower = function () {
        return this;
    }
    this.focus = function () {
        return this;
    }
    this.matches = function (selector) {
        if (selector == "*") {
            return true;
        } else if (selector[0] == "#") {
            return "#" + mAttrs["id"] == selector;
        } else if (selector[0] == ".") {
            return mClasses.some(c => "." + c == selector);
        } else {
            return mType == selector;
        }
    }
    this.getContext = function (type) {
        if (!mCanvas) {
            mCanvas = createCanvas()
            mCanvas.height = mAttrs['height'];
            mCanvas.width = mAttrs['width'];

        };
        return mCanvas.getContext(type);
    }
    this.getBoundingClientRect = function () {
        let x = 0, y = 0;
        let canvasContainer = d3.select("#canvas-view-container").select('.canvas-container');
        let fdlContainer = d3.select("#fdl-view-container").select('.canvas-container');
        let tabsContainer = d3.select("#tabs-container").select('.canvas-container');
        if (canvasContainer.select('.interaction-canvas') == this || canvasContainer.select('.interface-canvas') == this) {
            // x and y are 0, that's fine
        } else if (fdlContainer.select('.interaction-canvas') == this || fdlContainer.select('.interface-canvas') == this) {
            x = fdlContainer.select('.interface-canvas').attr('width')
            y = tabsContainer.select('.interaction-canvas').attr('height')
        } else if (tabsContainer.select('.interaction-canvas') == this || tabsContainer.select('.view-canvas') == this) {
            x = tabsContainer.select('.interaction-canvas').attr('width')
            // y is 0
        } else {
            console.error("Unexpected!", this)
        }

        return { x, y, width: mAttrs['width'], height: mAttrs['height'] };
    }
    this.getBBox = function () { return { x: mAttrs['x'], y: mAttrs['y'], height: 50, width: 100 } }
    this.getCallbacks = () => mCallBacks;
    this.call = function (something, newZoomTransform) {
        transform = newZoomTransform;
    };
    this.getTransform = function () {
        return transform;
    }
    this.console = {
        log: function () {
            if (mCanvas) {
                let c = mCanvas.console
                c.log();
            }
        }
    }
    this.remove = function () {
        delete this;
    }
    this.getChildren = () => mChildren;
}

function polygonHull(points) {
    if (points.length == 0) return null;
    let yMax = Math.max(...points.map(p => p[1]));
    let yMin = Math.min(...points.map(p => p[1]));
    let xMax = Math.max(...points.map(p => p[0]));
    let xMin = Math.min(...points.map(p => p[0]));
    return [
        [xMax, yMax],
        [xMax, yMin],
        [xMin, yMin],
        [xMin, yMax]
    ];
}

function mockTransform(x = 0, y = 0, k = 1) {
    this.x = x;
    this.y = y;
    this.k = k;
    this.translate = function (x, y) { return new mockTransform(this.x + x, this.y + y, this.k) }
    this.scale = function (k) { return new mockTransform(this.x, this.y, this.k * k) }
}

function mockForceSim() {
    let tickCallback = () => { };
    let nodes = [];
    this.stopped = false;

    this.tick = function () {
        if (this.stopped) return;

        if (this.forceFunc) {
            nodes.forEach((node, index) => {
                let rad = this.forceFunc(node);
                nodes.forEach(otherNode => {
                    if (otherNode != node) {
                        if (VectorUtil.dist(node, otherNode) < rad * 2) {
                            let dir = VectorUtil.normalize(VectorUtil.subtract(node, otherNode))
                            if (VectorUtil.length(dir) == 0) dir = { x: 0, y: 1 };
                            node.x += dir.x * rad;
                            node.y += dir.y * rad;
                        }
                    }
                })
            })
        }

        tickCallback();
    }

    this.getPosition = (nodeId) => {
        let result = nodes.find(n => n.id == nodeId);
        if (result) {
            return { x: result.x + 1, y: result.y + 1 }
        } else console.error("Item not in view", nodeId);
    }

    this.alpha = (val) => {
        if (val) {
            this.stopped = false;
            return this;
        } else {
            return 0.1;
        }
    };

    this.restart = () => {
        this.stopped = false;
        tickCallback();
        return this;
    };

    this.stop = () => {
        this.stopped = true;
        return this;
    };

    this.force = function (name, force) {
        if (name == 'collide') {
            this.forceFunc = force.func;
        }
        return this
    };

    this.nodes = (n) => { if (n) { nodes = n; return this; } else return nodes; };
    this.alphaDecay = () => { return this };
    this.velocityDecay = () => { return this };
    this.alphaTarget = () => { return this };
    this.on = function (event, func) {
        if (event == 'tick') {
            tickCallback = func;
        } else {
            console.error("not handled", event);
        };
        return this;
    };
    this.getNodes = () => nodes;
}

function mockForceCollide(func) {
    this.func = func;
    this.strength = () => { return this; };
}

function mockForceX(val) {
    this.val = val;
    this.strength = () => { return this; };
}

function mockXMLPromise(img) {
    this.then = function (callback) {
        return this;
    }
    this.catch = function () {
        return this;
    }
}

function ordinalScale(value) {
    return "#FF0000";
}
ordinalScale.domain = function () { return this };

function mockQuadTree() {
    this.x = () => { return this };
    this.y = () => { return this };
    this.extent = () => { return this };
    this.addAll = () => { return this };
    this.visit = () => { return this };

}

export function mockD3(jspreadsheet) {
    mJspreadsheet = jspreadsheet;
    let rootNode = new MockElement();
    rootNode.append('div').attr("id", "canvas-view-container").append(new MockElement().classed("canvas-container", true));
    rootNode.append('div').attr("id", "fdl-view-container").append(new MockElement().classed("canvas-container", true));
    rootNode.append('div').attr("id", "tabs-container").append(new MockElement().classed("canvas-container", true));
    rootNode.append('div').attr("id", "color-container");
    rootNode.append('div').attr("id", "interface-container").append(new MockElement().attr("id", "interface-svg"));
    rootNode.append('div').attr("id", "dashboard-container");
    rootNode.append('div').attr("id", "canvas-container");
    rootNode.append('div').attr("id", "tab-view-container");
    rootNode.append('div').attr("id", "canvas-container");
    rootNode.append('div').attr("id", "table-view-container");
    rootNode.append('div').attr("id", "input-box");
    rootNode.append('div').attr("id", "dropdown-container");
    rootNode.append('div').attr("id", "tooltips");

    let documentCallbacks = {};

    function select(selector) {
        if (selector.isDocument || selector.isWindow) {
            return { on: (event, callback) => documentCallbacks[event] = callback };
        } else {
            return rootNode.select(selector);
        }
    }

    function tree() {
        function treeFunc(heirarchy) {
            let nodes = []
            function getChildren(data, index, startX) {
                let x = startX;
                data.children.forEach(child => {
                    x += Size.ELEMENT_NODE_SIZE * 10 / index;
                    nodes.push({ x, y: Size.ELEMENT_NODE_SIZE * index, data: child });
                    getChildren(child, index + 1, x);
                })
            }
            getChildren(heirarchy, 0);

            let tree = {
                each: func => nodes.forEach(func),
            }

            return tree;
        }
        treeFunc.nodeSize = function () { return this; };
        return treeFunc;
    }

    function hierarchy(tree) {
        return tree;
    }

    this.forceSims = [];
    this.tick = () => this.forceSims.forEach(sim => sim.tick())
    this.getSimulationNodePosition = (id) => this.forceSims.find(sim => !sim.stopped).getPosition(id);
    this.select = select;
    this.tree = tree;
    this.hierarchy = hierarchy;
    this.polygonHull = polygonHull;
    this.zoomIdentity = new mockTransform();
    this.getCallbacks = () => documentCallbacks;
    this.forceSimulation = () => { this.forceSims.push(new mockForceSim()); return this.forceSims[this.forceSims.length - 1] };
    this.scaleOrdinal = () => ordinalScale;
    this.forceCollide = (func) => new mockForceCollide(func);
    this.forceX = (val) => new mockForceX(val);
    this.xml = (img) => new mockXMLPromise(img);
    this.getPosition = (id) => forceSim.getPosition(id);
    this.getLinkPosition = (id) => forceSim.getLinkPosition(id);
    this.getNodes = () => forceSim.getNodes();
}