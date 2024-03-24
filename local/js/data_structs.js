import { AngleType, ChannelType, DimensionType, SizeType } from "./constants.js";
import { IdUtil } from "./utils/id_util.js";

export let Data = function () {
    function Stroke(path, size, color) {
        this.id = IdUtil.getUniqueId(Stroke);
        this.creationTime = Date.now();
        this.path = path.map(p => { return { x: p.x, y: p.y } });
        this.size = size;
        this.color = color;

        this.clone = function () {
            let clone = new Stroke(this.path, this.size, this.color);
            clone.id = this.id;
            clone.creationTime = this.creationTime;
            return clone;
        };

        this.copy = function () {
            let stroke = this.clone();
            stroke.id = IdUtil.getUniqueId(Stroke);
            return stroke;
        }

        this.update = function (stroke) {
            this.id = stroke.id;
            this.creationTime = stroke.creationTime;
            this.path = stroke.path.map(p => { return { x: p.x, y: p.y } });
            this.size = stroke.size;
            this.color = stroke.color;
        };
    }
    Stroke.fromObject = function (obj) {
        let storke = new Stroke(obj.path, obj.size, obj.color);
        storke.id = obj.id;
        storke.creationTime = obj.creationTime;
        return storke;
    }

    function Element() {
        this.id = IdUtil.getUniqueId(Element);
        this.creationTime = Date.now();
        this.strokes = [];

        this.spine = null;

        this.angle = null;
        this.root = null;

        this.parentId = null;

        this.clone = function () {
            let clone = new Element();
            clone.id = this.id;
            clone.parentId = this.parentId;
            clone.creationTime = this.creationTime;
            clone.strokes = this.strokes.map(s => s.clone());
            clone.spine = this.spine ? this.spine.map(p => { return { x: p.x, y: p.y } }) : null;
            clone.angle = this.angle ? { x: this.angle.x, y: this.angle.y } : { x: 0, y: 0 };
            clone.root = this.root ? { x: this.root.x, y: this.root.y } : { x: 0, y: 0 };
            return clone;
        };

        this.copy = function () {
            let element = this.clone();
            element.id = IdUtil.getUniqueId(Element);
            element.strokes = element.strokes.map(s => s.copy());
            return element;
        }

        this.update = function (element) {
            this.id = element.id;
            this.parentId = element.parentId;
            this.creationTime = element.creationTime;
            this.strokes = element.strokes.map(s => s.clone());
            this.spine = element.spine.map(p => { return { x: p.x, y: p.y } });
            this.angle = element.angle ? { x: element.angle.x, y: element.angle.y } : { x: 0, y: 0 };
            this.root = element.root ? { x: element.root.x, y: element.root.y } : { x: 0, y: 0 };
        };
    }
    Element.fromObject = function (obj) {
        let element = new Element();
        element.id = obj.id;
        element.parentId = obj.parentId;
        element.creationTime = obj.creationTime;
        element.strokes = obj.strokes.map(s => Stroke.fromObject(s));
        element.spine = obj.spine ? obj.spine.map(p => { return { x: p.x, y: p.y } }) : null;
        element.angle = obj.angle ? { x: obj.angle.x, y: obj.angle.y } : { x: 0, y: 0 };
        element.root = obj.root ? { x: obj.root.x, y: obj.root.y } : { x: 0, y: 0 };
        return element;
    }

    function Dimension() {
        this.id = IdUtil.getUniqueId(Dimension);
        this.creationTime = Date.now();
        this.name = "Dimension";
        this.type = DimensionType.DISCRETE;
        this.channel = ChannelType.SHAPE;
        this.angleType = AngleType.RELATIVE;
        this.sizeType = SizeType.AREA;
        this.level = 0;
        this.unmappedIds = []
        // discrete dimensions
        this.categories = [];
        // discrete dimensions to continuous channels
        // length = categories - 1
        this.ranges = []
        // continuous dimensions
        this.domain = [0, 1]
        this.domainRange = [0, 1]

        this.clone = function () {
            let clone = new Dimension();
            clone.id = this.id;
            clone.creationTime = this.creationTime;
            clone.name = this.name;
            clone.type = this.type;
            clone.channel = this.channel;
            clone.level = this.level;
            clone.angleType = this.angleType;
            clone.sizeType = this.sizeType;
            clone.unmappedIds = [...this.unmappedIds];
            clone.categories = this.categories.map(c => c.clone());
            clone.ranges = [...this.ranges];
            clone.domain = [...this.domain];
            clone.domainRange = [...this.domainRange];
            return clone;
        };

        this.copy = function () {
            let dimension = this.clone();
            dimension.id = IdUtil.getUniqueId(Dimension);
            dimension.categories = dimension.categories.map(c => c.copy());
            return dimension;
        }

        this.update = function (dimension) {
            this.id = dimension.id;
            this.creationTime = dimension.creationTime;
            this.name = dimension.name;
            this.type = dimension.type;
            this.channel = dimension.channel;
            this.level = dimension.level;
            this.angleType = dimension.angleType;
            this.sizeType = dimension.sizeType;
            this.unmappedIds = [...dimension.unmappedIds];
            this.categories = dimension.categories.map(l => l.clone());
            this.ranges = [...dimension.ranges];
            this.domain = [...dimension.domain];
            this.domainRange = [...dimension.domainRange];
        };
    }
    Dimension.fromObject = function (obj) {
        let dimension = new Dimension();
        dimension.id = obj.id;
        dimension.creationTime = obj.creationTime;
        dimension.name = obj.name;
        dimension.type = obj.type;
        dimension.channel = obj.channel;
        dimension.level = obj.level;
        dimension.angleType = obj.angleType ? obj.angleType : AngleType.RELATIVE;
        dimension.sizeType = obj.sizeType ? obj.sizeType : SizeType.AREA;
        dimension.unmappedIds = obj.unmappedIds ? [...obj.unmappedIds] : [];
        dimension.categories = obj.categories ? obj.categories.map(c => Category.fromObject(c)) : [];
        dimension.ranges = obj.ranges ? [...obj.ranges] : [];
        dimension.domain = obj.domain ? [...obj.domain] : [0, 1];
        dimension.domainRange = obj.domainRange ? [...obj.domainRange] : [0, 1];
        return dimension;
    }


    function Category() {
        this.id = IdUtil.getUniqueId(Category);
        this.creationTime = Date.now();
        this.name = "";
        this.elementIds = [];

        this.clone = function () {
            let clone = new Category();
            clone.id = this.id;
            clone.creationTime = this.creationTime;
            clone.name = this.name;
            clone.elementIds = [...this.elementIds];
            return clone;
        };

        this.copy = function () {
            let category = this.clone();
            category.id = IdUtil.getUniqueId(Category);
            return category;
        }

        this.update = function (category) {
            this.id = category.id;
            this.creationTime = category.creationTime;
            this.name = category.name;
            this.elementIds = [...category.elementIds];
        };
    }
    Category.fromObject = function (obj) {
        let category = new Category();
        category.id = obj.id;
        category.creationTime = obj.creationTime;
        category.name = obj.name;
        category.elementIds = [...obj.elementIds];
        return category;
    }

    return {
        Stroke,
        Element,
        Dimension,
        Category,
    }
}();