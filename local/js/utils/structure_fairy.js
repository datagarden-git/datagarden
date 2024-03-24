import { ChannelType, DEFAULT_CATEGORY_NAME, DimensionType, MAP_ELEMENTS, NO_CATEGORY_ID } from "../constants.js";
import { Data } from "../data_structs.js";
import { ClassifierUtil } from "./classifier_util.js";
import { DataUtil } from "./data_util.js";
import { PathUtil } from "./path_util.js";
import { VectorUtil } from "./vector_util.js";

export let StructureFairy = function () {
    function getMerge(stroke, model) {
        let bb = DataUtil.getBoundingBox([stroke]);
        bb.x -= bb.width / 4
        bb.y -= bb.height / 4
        bb.width *= 1.5
        bb.height *= 1.5;

        let elements = model.getElements();
        let nearElements = elements.filter(e => DataUtil.boundingBoxIntersects(bb, DataUtil.getBoundingBox(e)));

        let overlappingElements = nearElements.filter(e => {
            return e.strokes.some(s => {
                return PathUtil.pathOverlaps(stroke.path, s.path)
            })
        })

        return overlappingElements;
    }

    function getParent(stroke, model) {
        let bb = DataUtil.getBoundingBox([stroke]);
        bb.x -= bb.width / 4
        bb.y -= bb.height / 4
        bb.width *= 1.5
        bb.height *= 1.5;

        let elements = model.getElements();
        let nearElements = elements.filter(e => DataUtil.boundingBoxIntersects(bb, DataUtil.getBoundingBox(e)));
        if (nearElements.length == 0) return null;

        let elementDists = nearElements.map(element => {
            let strokeDists = element.strokes.map(s => {
                return stroke.path.reduce((closestDist, p) => {
                    let closestPoint = PathUtil.getClosestPointOnPath(p, s.path);
                    return Math.min(closestDist, VectorUtil.dist(closestPoint, p));
                }, Infinity)
            })
            return { element, dist: Math.min(...strokeDists) };
        })

        let size;
        if (PathUtil.isLineLike(stroke.path)) {
            size = PathUtil.getPathLength(stroke.path) / 4
        } else {
            size = Math.max(bb.width, bb.height) * 2;
        }

        let minDist = Math.min(...elementDists.map(ed => ed.dist));
        if (minDist < size) {
            return elementDists.find(ed => ed.dist == minDist).element.id;
        } else {
            return null;
        }

    }

    // Adds all relevant elements to the categories. 
    // Creates the categories if they do not exist.
    function getCluster(dimenId, model) {
        let dimension = model.getDimension(dimenId);
        if (!dimension) {
            console.error("invalid dimension id.", dimenId);
            return;
        }
        let elements = model.getElements()
            .filter(e => dimension.level == model.getElementLevel(e.id));
        if (elements.length == 0) return;

        if (dimension.type == DimensionType.DISCRETE) {
            let categories = dimension.categories;
            if (dimension.unmappedIds.length > 0) {
                categories.push({ id: NO_CATEGORY_ID, elementIds: dimension.unmappedIds });
            }

            let clusters = [];
            if (dimension.channel == ChannelType.COLOR) {
                clusters = ClassifierUtil.clusterElementColors(elements, categories);
            } else {
                clusters = ClassifierUtil.clusterElementShapes(elements, categories);
            }

            if (dimension.channel == ChannelType.LABEL) {
                let noMappingIndex = categories.findIndex(c => c.id == NO_CATEGORY_ID);
                if (noMappingIndex != -1) categories[noMappingIndex].elementIds = DataUtil.unique(clusters
                    .map((cluster, elementIndex) => cluster == noMappingIndex ? elementIndex : -1)
                    .filter(i => i != -1)
                    .map(i => elements[i].id));

                let mappedIds = DataUtil.unique(clusters
                    .map((cluster, elementIndex) => cluster != noMappingIndex ? elementIndex : -1)
                    .filter(i => i != -1)
                    .map(i => elements[i].id));

                let elementIds = elements.map(e => e.id);
                let emptyCategories = categories.filter(c => !c.elementIds.some(eId => elementIds.includes(eId)) && c.id != NO_CATEGORY_ID);
                let unlabledElements = mappedIds.filter(id => !categories.find(c => c.elementIds.includes(id)));

                unlabledElements.forEach((id, i) => {
                    let emptyCat = emptyCategories[i];
                    if (!emptyCat) {
                        emptyCat = new Data.Category();
                        emptyCat.name = DataUtil.getNextDefaultName(dimension.name, dimension.categories.map(c => c.name));
                        categories.push(emptyCat)
                    }
                    emptyCat.elementIds = [id];
                })
            } else {
                let clusterCount = Math.max(...clusters) + 1;
                for (let i = 0; i < clusterCount; i++) {
                    let category = categories[i];
                    if (!category) {
                        if (i == 0 || DataUtil.channelIsDiscrete(dimension.channel)) {
                            category = new Data.Category();
                            category.name = DEFAULT_CATEGORY_NAME + (i + 1);
                            categories.push(category)
                        } else {
                            // don't make new categories unless we are using a discrete channel.
                            category = categories[0];
                        }
                    }
                    let clusterElementIds = clusters
                        .map((cluster, elementIndex) => cluster == i ? elementIndex : -1)
                        .filter(i => i != -1)
                        .map(i => elements[i].id);
                    category.elementIds = DataUtil.unique(category.elementIds.concat(clusterElementIds));
                }
                for (let i = clusterCount; i < categories.length; i++) {
                    categories[i].elementIds = [];
                }
            }

            if (dimension.unmappedIds.length == 0) {
                // we always return this category, but we don't map there unless the user already is using it
                categories.push({ id: NO_CATEGORY_ID, elementIds: [] });
            }

            return categories;
        } else {
            let categories = [
                { id: NO_CATEGORY_ID, elementIds: dimension.unmappedIds },
                { id: MAP_ELEMENTS, elementIds: elements.map(e => e.id).filter(eId => !dimension.unmappedIds.includes(eId)) },
            ];

            let clusters = ClassifierUtil.clusterElementShapes(elements, categories);
            let unmappedIds = clusters.map((c, index) => c == 0 ? elements[index].id : null).filter(id => id);

            return dimension.categories.concat([{ id: NO_CATEGORY_ID, elementIds: unmappedIds }]);
        }
    }

    return {
        getMerge,
        getParent,
        getCluster,
    }
}();
