import { AngleType, ChannelLabels, ChannelType, DimensionType, SizeType } from "../constants.js";
import { DataModel, DataTable } from "../data_model.js";
import { Data } from "../data_structs.js";
import { DataUtil } from "./data_util.js";
import { IdUtil } from "./id_util.js";
import { PathUtil } from "./path_util.js";
import { VectorUtil } from "./vector_util.js";

export let GenerationUtil = function () {
    function modelFromTables(template, dataTables) {
        let model = new DataModel();
        model.setDimensions(template.getDimensions().map(dimen => dimen.clone()));
        model.getDimensions().forEach(dimen => {
            dimen.categories.forEach(category => {
                category.elementIds = [];
            });
            dimen.unmappedIds = [];
        })

        let originalTables = template.getTables();

        let elementMap = {};
        dataTables.forEach(table => {
            let dataArray = table.getDataArray();
            if (dataArray.length == 0) { return; }

            // make the elements
            let maxTableLevel = Math.max(...table.getColumns().map(c => c.level));
            let elementReference = new Array(maxTableLevel + 1).fill(0).map(_ => new Array(dataArray.length).fill(false));
            for (let level = 0; level <= maxTableLevel; level++) {
                let labelDimenIndex = table.getColumns().findIndex(d => d.level == level && d.channel == ChannelType.LABEL);
                if (labelDimenIndex > -1) {
                    let column = table.getColumns().find(d => d.level == level && d.channel == ChannelType.LABEL);

                    let levelLabels = dataArray.map(r => r[labelDimenIndex].value);
                    // make sure the elements are created
                    DataUtil.unique(levelLabels).forEach(label => {
                        if (!elementMap[column.id + label]) {
                            elementMap[column.id + label] = makeNewElement(model);
                            if (IdUtil.isType(column.id, Data.Dimension)) {
                                // set up the dimension
                                let dimension = model.getDimension(column.id);
                                let category = dimension.categories.find(c => c.name == label);
                                if (!category) {
                                    category = new Data.Category();
                                    category.name = label;
                                    dimension.categories.push(category);
                                }
                                category.elementIds = [elementMap[column.id + label].id];
                            }
                        }
                    })
                    levelLabels.forEach((label, rowIndex) => {
                        elementReference[level][rowIndex] = elementMap[column.id + label];
                    })
                } else {
                    // no label, we're either in the one element per parent or one element per row cases
                    if (oneElementPerParent(template, level)) {
                        if (level == 0) {
                            if (!elementMap['Level0Element']) elementMap['Level0Element'] = makeNewElement(model);
                            elementReference[level] = elementReference[level].map(() => elementMap['Level0Element']);
                        } else {
                            elementReference[level] = elementReference[level].map((_, i) => {
                                let parentId = elementReference[level - 1][i].id;
                                if (!elementMap["Parent" + parentId]) elementMap["Parent" + parentId] = makeNewElement(model);
                                return elementMap["Parent" + parentId];
                            });
                        }
                    } else if (oneElementPerRow(template, level)) {
                        elementReference[level] = elementReference[level].map(() => makeNewElement(model));
                    } else {
                        console.error("Cannot determine element mapping scheme");
                        elementReference[level] = elementReference[level].map(() => makeNewElement(model));
                    }
                }
            }

            // set the parents.
            for (let level = 1; level < maxTableLevel + 1; level++) {
                elementReference[level].forEach((element, row) => {
                    element.parentId = elementReference[level - 1][row].id;
                });
            }

            // set the unmappedIds 
            let columns = table.getColumns();
            let tableDimensionIds = columns.map(c => c.id);
            model.getDimensions().filter(d => !tableDimensionIds.includes(d.id) && d.level < elementReference.length).forEach(d => {
                d.unmappedIds = DataUtil.unique(d.unmappedIds.concat(elementReference[d.level].map(e => e.id)));
            })

            // set the table
            dataArray.forEach((row, rowIndex) => {
                row.forEach(((cell, colIndex) => {
                    let elementId = elementReference[columns[colIndex].level][rowIndex].id;
                    table.setCell(columns[colIndex].id, rowIndex, cell.value, elementId);
                }))
            })
        })

        let maxLevel = Math.max(...model.getDimensions().map(d => d.level))
        for (let level = 0; level < maxLevel + 1; level++) {
            // now go through and create new data tables for each level
            // these tabels join all the tables to make sure all the element data is in one table
            let modelDataTables = {};
            let templateTableElements = {};
            dataTables.forEach((table, tableIndex) => {
                let maxLevel = Math.max(...table.getColumns().map(c => c.level))
                if (maxLevel < level) return;

                let columns = table.getColumns().filter(d => d.level == level)
                if (columns.length == 0) {
                    // we are in a one or many case, either way, stick to this tables elements
                    let key = "NoColumns_" + tableIndex + "_" + level

                    let leafColumn = table.getColumns().find(c => c.level == maxLevel);

                    modelDataTables[key] = {
                        level, elementIds: DataUtil.unique(table.getColumnData(leafColumn.id)
                            .map(data => getAncestorAtLevel(model.getElement(data.id), level, model))
                            .map(e => e.id))
                    };

                    let originalTable = originalTables[tableIndex];
                    templateTableElements[key] = DataUtil.unique(originalTable.getColumnData(leafColumn.id)
                        .map(data => getAncestorAtLevel(template.getElement(data.id), level, template))
                        .map(e => e.id));
                } else {
                    let key = columns.sort(DataUtil.compareDimensions)
                        .map(c => c.id).join(",");
                    if (!modelDataTables[key]) {
                        modelDataTables[key] = new DataTable();
                        for (const dimen of columns) {
                            modelDataTables[key].addColumn(dimen.clone());
                        }
                        templateTableElements[key] = [];
                    }

                    let lastModelIndex = modelDataTables[key].getDataArray().length;
                    columns.forEach(col => {
                        table.getColumnData(col.id).forEach((item, index) => {
                            modelDataTables[key].setCell(col.id, lastModelIndex + index, item.value, item.id);
                        });
                    })

                    let originalTable = originalTables[tableIndex];
                    let levelColumn = originalTable.getColumns().find(c => c.level == level)
                    originalTable.getColumnData(levelColumn.id).map(item => item.id).forEach(id => templateTableElements[key].push(id))
                    templateTableElements[key] = DataUtil.unique(templateTableElements[key]);
                }
            })

            let keys = Object.keys(modelDataTables);
            for (let level = 0; level < maxLevel + 1; level++) {
                let levelKeys = keys.filter(key => {
                    if ('level' in modelDataTables[key]) {
                        return modelDataTables[key].level == level;
                    } else {
                        return modelDataTables[key].getColumns()[0].level == level
                    }
                });
                levelKeys.forEach(key => {
                    let table = modelDataTables[key];
                    if ('level' in table) table = table.elementIds;
                    let templateElementIds = templateTableElements[key];
                    deriveShape(template, templateElementIds, model, table, level);
                    deriveColor(template, templateElementIds, model, table, level);
                    deriveSize(template, templateElementIds, model, table, level);
                    derivePosition(template, templateElementIds, model, table, level);
                    deriveAngle(template, templateElementIds, model, table, level);
                })
            }
        }
        return model;
    }

    function makeNewElement(model) {
        let element = new Data.Element();
        model.getElements().push(element);
        return element;
    }

    function deriveShape(template, templateTableIds, model, table, level) {
        let mappedSets = getMappedSets(template, templateTableIds, model, table, level, ChannelType.SHAPE);
        let modelElements = [];
        let templateElements = [];
        for (let i = 0; i < mappedSets.modelIdSets.length; i++) {
            if (mappedSets.templateIdSets[i].length == 0) { console.error("invalid shape value!", mappedSets.values[i]); mappedSets.templateIdSets[i] = template.getLevelElements(level) }
            for (let j = 0; j < mappedSets.modelIdSets[i].length; j++) {
                modelElements.push(model.getElement(mappedSets.modelIdSets[i][j]))
                templateElements.push(template.getElement(mappedSets.templateIdSets[i][j % mappedSets.templateIdSets[i].length]))
            }
        }

        if (mappedSets.dimensionId) {
            for (let index in mappedSets.values) {
                let dimension = model.getDimension(mappedSets.dimensionId);
                let category = dimension.categories.find(c => c.name == mappedSets.values[index]);
                if (!category) { console.error("invalid value!", mappedSets.values[index]) }
                category.elementIds = DataUtil.unique(category.elementIds.concat(mappedSets.modelIdSets[index]));
            }
        }

        modelElements.forEach((element, index) => {
            let templateElement = templateElements[index].copy();
            element.strokes = templateElement.strokes;
            element.spine = templateElement.spine;
            element.root = templateElement.root;
            element.angle = templateElement.angle;
            if (element.parentId) {
                let templateParent = template.getElement(templateElement.parentId);
                let templatePosition = PathUtil.getClosestPointOnPath(templateElement.root, templateParent.spine);
                let templateNormal = PathUtil.getNormalForPercent(templateParent.spine, templatePosition.percent);

                let elementParent = model.getElement(element.parentId);
                let elementPosition = PathUtil.getPositionForPercent(elementParent.spine, templatePosition.percent);
                let elementNormal = PathUtil.getNormalForPercent(elementParent.spine, templatePosition.percent);

                let translation = VectorUtil.subtract(elementPosition, templatePosition);
                let rotation = VectorUtil.rotation(elementNormal, templateNormal);

                transformElement(element, translation, 0, { x: 0, y: 0 })
                transformElement(element, { x: 0, y: 0 }, rotation, elementPosition)
            }
        })
    }

    function deriveColor(template, templateTableIds, model, table, level) {
        let mappedSets = getMappedSets(template, templateTableIds, model, table, level, ChannelType.COLOR);
        if (mappedSets.dimensionId) {
            for (let index in mappedSets.values) {
                if (mappedSets.templateIdSets[index].length == 0) { console.error('invalid color value!', mappedSets.values[index]); continue; }
                let sampleColorSets = mappedSets.templateIdSets[index].map(eId => template.getElement(eId).strokes.map(s => s.color)).sort();
                let modelElements = mappedSets.modelIdSets[index].map(id => model.getElement(id));
                for (let element of modelElements) {
                    let elementColors = element.strokes.map(s => s.color).sort();
                    let setDists = sampleColorSets.map(set => {
                        // we don't need to divide because it's going to be the same number of colors every time.
                        return elementColors.reduce((sum, c) => {
                            return sum + Math.min(...set.map(setC => DataUtil.colorDist(setC, c)))
                        }, 0)
                    })
                    let minDist = Math.min(...setDists);
                    if (minDist == 0) {
                        // colors all good
                        continue;
                    }
                    let closestSet = sampleColorSets[setDists.indexOf(minDist)];
                    element.strokes.forEach(stroke => {
                        stroke.color = DataUtil.closestColor(stroke.color, closestSet);
                    })
                }

                let dimension = model.getDimensions().find(d => d.id == mappedSets.dimensionId);
                let category = dimension.categories.find(c => c.name == mappedSets.values[index]);
                category.elementIds = DataUtil.unique(category.elementIds.concat(mappedSets.modelIdSets[index]));
            }
        }
    }

    function deriveSize(template, templateTableIds, model, table, level) {
        let mappedSets = getMappedSets(template, templateTableIds, model, table, level, ChannelType.SIZE);
        if (mappedSets.dimensionId) {
            let dimension = model.getDimension(mappedSets.dimensionId);
            if (mappedSets.values == DimensionType.CONTINUOUS) {
                for (let index in mappedSets.modelIdSets[0]) {
                    let element = model.getElement(mappedSets.modelIdSets[0][index])
                    let newSize = mappedSets.templateIdSets[0][index];
                    DataUtil.resizeElement(element, newSize, dimension.sizeType);
                }
            } else {
                for (let setIndex in mappedSets.values) {
                    let templateElementIds = mappedSets.templateIdSets[setIndex];
                    let templateElements = templateElementIds.map(eId => template.getElement(eId));
                    let templateSizes = templateElements.map((e, i) => DataUtil.getSize(e, dimension.sizeType));
                    if (templateSizes.length == 0) { console.error('Invalid size range! No examples!'); continue; }

                    let averageSize = templateSizes.reduce((a, b) => a + b, 0) / templateSizes.length;

                    let elementIds = mappedSets.modelIdSets[setIndex];
                    elementIds.forEach(elementId => {
                        let element = model.getElement(elementId);
                        DataUtil.resizeElement(element, averageSize, dimension.sizeType);
                    })
                }
            }
        }
    }

    function derivePosition(template, templateTableIds, model, table, level) {
        let mappedSets = getMappedSets(template, templateTableIds, model, table, level, ChannelType.POSITION);
        if (mappedSets.dimensionId) {
            if (mappedSets.values == DimensionType.CONTINUOUS) {
                for (let index in mappedSets.modelIdSets[0]) {
                    let element = model.getElement(mappedSets.modelIdSets[0][index])
                    let elementParent = model.getElement(element.parentId);
                    let oldPosition = PathUtil.getClosestPointOnPath(element.root, elementParent.spine);
                    let oldNormal = PathUtil.getNormalForPercent(elementParent.spine, oldPosition.percent);
                    let offset = VectorUtil.subtract(element.root, oldPosition);
                    let dist = VectorUtil.dist(oldPosition, element.root) * (VectorUtil.dot(offset, oldNormal) > 0 ? 1 : -1);

                    let newPercent = mappedSets.templateIdSets[0][index];
                    let newParentPos = PathUtil.getPositionForPercent(elementParent.spine, newPercent);
                    let newNormal = PathUtil.getNormalForPercent(elementParent.spine, newPercent);
                    let newRoot = VectorUtil.add(VectorUtil.scale(newNormal, dist), newParentPos);

                    let translation = VectorUtil.subtract(newRoot, element.root);
                    let rotation = VectorUtil.rotation(newNormal, oldNormal);
                    transformElement(element, translation, rotation, element.root);
                }
            } else {
                for (let setIndex in mappedSets.values) {
                    let templateElementIds = mappedSets.templateIdSets[setIndex];
                    let dimension = model.getDimension(mappedSets.dimensionId);
                    let startPercent = setIndex == 0 ? 0 : dimension.ranges[setIndex - 1];
                    let endPercent = setIndex == dimension.ranges.length ? 1 : dimension.ranges[setIndex];
                    let elementIds = mappedSets.modelIdSets[setIndex];
                    redistributedElements(model, elementIds, template, templateElementIds, startPercent, endPercent);
                }
            }
        } else {
            if (level == 0) {
                let positions = mappedSets.templateIdSets[0].map(eId => template.getElement(eId).root);
                if (positions.length == 1) {
                    let bb = DataUtil.getBoundingBox(template.getElements());
                    positions.push({ x: positions[0].x + bb.width, y: bb.y + bb.height });
                } else {
                    let xDist = Math.max(...positions.map(p => p.x)) - Math.min(...positions.map(p => p.x));
                    let yDist = Math.max(...positions.map(p => p.y)) - Math.min(...positions.map(p => p.y));
                    if (xDist > yDist) {
                        positions.sort(({ x1, y1 }, { x2, y2 }) => x1 - x2);
                    } else {
                        positions.sort(({ x1, y1 }, { x2, y2 }) => y1 - y2);
                    }
                }
                let offsets = positions.map((p, i) => VectorUtil.subtract(p, i == 0 ? { x: 0, y: 0 } : positions[i - 1]));

                for (let i = offsets.length; i < mappedSets.modelIdSets[0].length; i++) {
                    offsets.push(offsets[i + 1 - offsets.length]);
                }
                let elements = mappedSets.modelIdSets[0].map(eId => model.getElement(eId));
                elements.forEach((element, i) => {
                    let newRoot = offsets.slice(0, i + 1).reduce((sum, o) => VectorUtil.add(sum, o), { x: 0, y: 0 });
                    let translation = VectorUtil.subtract(newRoot, element.root)
                    transformElement(element, translation, 0, element.root);
                })
            } else {
                let templateElementIds = mappedSets.templateIdSets[0];
                let elementIds = mappedSets.modelIdSets[0];
                let startPercent = 0;
                let endPercent = 1;
                redistributedElements(model, elementIds, template, templateElementIds, startPercent, endPercent);
            }
        }
    }

    function redistributedElements(model, elementIds, template, templateElementIds, startPercent, endPercent,) {
        let templateElements = templateElementIds.map(id => template.getElement(id));
        let templateParents = templateElements.map(e => template.getElement(e.parentId));
        let templatePositions = templateElements.map((e, i) => PathUtil.getClosestPointOnPath(e.root, templateParents[i].spine));
        let percents = templatePositions.map(p => p.percent);

        let percentSets = {}
        percents.forEach((percent, index) => {
            if (!percentSets[templateParents[index].id]) percentSets[templateParents[index].id] = []
            percentSets[templateParents[index].id].push(percent);
        })
        percentSets = Object.values(percentSets);

        percentSets.forEach(percents => percents.sort());
        let patternSets = percentSets.map(percents =>
            percents.map((p, i) => p - (i == 0 ? startPercent : percents[i - 1])));

        let allElements = elementIds.map(eId => model.getElement(eId));
        let elementSets = {};
        allElements.forEach(e => {
            if (!elementSets[e.parentId]) elementSets[e.parentId] = [];
            elementSets[e.parentId].push(e);
        })
        elementSets = Object.values(elementSets);

        elementSets.forEach(elements => {
            let patternDists = patternSets.map(p => Math.abs(p.length - elements.length));
            let minDist = Math.min(...patternDists);
            let index = patternDists.findIndex(pd => pd == minDist);
            let pattern = patternSets[index];

            let lastPercent = startPercent;
            let newPercents = []
            for (let i = 0; i <= elements.length; i++) {
                newPercents.push(lastPercent + pattern[i % pattern.length]);
                lastPercent = newPercents[newPercents.length - 1];
            }


            if (lastPercent > endPercent) {
                let scale = (endPercent - startPercent) / (lastPercent - startPercent);
                newPercents = newPercents.map(p => (p - startPercent) * scale + startPercent);
            }

            for (let elementIndex in elements) {
                let element = elements[elementIndex];
                let elementParent = model.getElement(element.parentId);

                let oldPosition = PathUtil.getClosestPointOnPath(element.root, elementParent.spine);
                let oldNormal = PathUtil.getNormalForPercent(elementParent.spine, oldPosition.percent);
                let offset = VectorUtil.subtract(element.root, oldPosition);
                let dist = VectorUtil.dist(oldPosition, element.root) * (VectorUtil.dot(offset, oldNormal) > 0 ? 1 : -1);

                let newPercent = newPercents[elementIndex];
                let newParentPos = PathUtil.getPositionForPercent(elementParent.spine, newPercent);
                let newNormal = PathUtil.getNormalForPercent(elementParent.spine, newPercent);
                let newRoot = VectorUtil.add(VectorUtil.scale(newNormal, dist), newParentPos);

                let translation = VectorUtil.subtract(newRoot, element.root);
                let rotation = VectorUtil.rotation(newNormal, oldNormal);

                transformElement(element, translation, rotation, element.root);
            }
        })
    }

    function deriveAngle(template, templateTableIds, model, table, level) {
        let mappedSets = getMappedSets(template, templateTableIds, model, table, level, ChannelType.ANGLE);
        if (mappedSets.dimensionId) {
            let dimension = model.getDimension(mappedSets.dimensionId);
            if (mappedSets.values == DimensionType.CONTINUOUS) {
                for (let index in mappedSets.modelIdSets[0]) {
                    let element = model.getElement(mappedSets.modelIdSets[0][index])
                    let elementParent = dimension.angleType == AngleType.RELATIVE ? model.getElement(element.parentId) : null;
                    let oldAngle = DataUtil.getRelativeAngle(element, elementParent);
                    let newAngle = mappedSets.templateIdSets[0][index];
                    let rotation = newAngle - oldAngle;
                    transformElement(element, { x: 0, y: 0 }, rotation, element.root);
                }
            } else {
                for (let setIndex in mappedSets.values) {
                    let templateElementIds = mappedSets.templateIdSets[setIndex];
                    let templateElements = templateElementIds.map(eId => template.getElement(eId));
                    let templateParents = templateElements.map(e => dimension.angleType == AngleType.RELATIVE ? template.getElement(e.parentId) : null)
                    let templateAngles = templateElements.map((e, i) => DataUtil.getRelativeAngle(e, templateParents[i]));

                    let minPercent = setIndex == 0 ? 0 : dimension.ranges[setIndex - 1];
                    let minAngle = DataUtil.percentToAngle(minPercent);
                    let maxPercent = setIndex == dimension.ranges.length ? 1 : dimension.ranges[setIndex];
                    let maxAngle = DataUtil.percentToAngle(maxPercent);

                    templateAngles.push(minAngle, maxAngle);
                    let averageAngle = templateAngles.reduce((a, b) => a + b, 0) / templateAngles.length;

                    let elementIds = mappedSets.modelIdSets[setIndex];
                    elementIds.forEach(elementId => {
                        let currentValue = getMappedValue(model, dimension.id, elementId)
                        if (currentValue != mappedSets.values[setIndex]) {
                            let element = model.getElement(elementId);
                            let elementParent = dimension.angleType == AngleType.RELATIVE ? model.getElement(element.parentId) : null;
                            let oldAngle = DataUtil.getRelativeAngle(element, elementParent);
                            let rotation = averageAngle - oldAngle;
                            transformElement(element, { x: 0, y: 0 }, rotation, element.root);
                        }
                    })
                }
            }
        }
    }

    function transformElement(element, translation, rotation, transformationRoot) {
        element.root = VectorUtil.rotateAroundPoint(element.root, transformationRoot, rotation)
        element.angle = VectorUtil.rotate(element.angle, rotation);
        element.strokes.forEach(stroke => stroke.path = stroke.path.map(p => VectorUtil.rotateAroundPoint(p, transformationRoot, rotation)));
        element.spine = element.spine.map(p => VectorUtil.rotateAroundPoint(p, transformationRoot, rotation));

        element.root = VectorUtil.add(element.root, translation);
        element.strokes.forEach(stroke => stroke.path = PathUtil.translate(stroke.path, translation));
        element.spine = PathUtil.translate(element.spine, translation)
    }

    function getMappedValue(model, dimensionId, elementId) {
        let dimension = model.getDimension(dimensionId);
        if (dimension.unmappedIds.includes(elementId)) return null;
        if (DataUtil.channelIsDiscrete(dimension.channel)) {
            let category = dimension.categories.find(category => category.elementIds.includes(elementId));
            return category ? category.name : null;
        } else {
            let element = model.getElement(elementId);
            let percent = getChannelPercentForElement(element, dimension, model)
            if (dimension.type == DimensionType.CONTINUOUS) {
                if (dimension.domainRange[1] - dimension.domainRange[0] == 0) {
                    percent = 0;
                } else {
                    percent = (percent - dimension.domainRange[0]) / (dimension.domainRange[1] - dimension.domainRange[0]);
                }
                percent = DataUtil.limit(percent, 0, 1);
                let value = (parseDomainValue(dimension.domain[1]) - parseDomainValue(dimension.domain[0])) * percent + parseDomainValue(dimension.domain[0]);
                return isTime(dimension.domain[0]) ? formatTime(value) : value;
            } else {
                let category = getCategoryForPercent(dimension, percent);
                return category ? category.name : null;
            }
        }
    }

    // takes a value and returns either a set of elements or an angle, size, or position
    function unmapValue(model, dimensionId, value) {
        let dimension = model.getDimension(dimensionId);

        if (DataUtil.channelIsDiscrete(dimension.channel)) {
            // the dimension must also be discrete. 
            let category = dimension.categories.find(category => category.name == value);
            if (category) {
                return category.elementIds.filter(eId => {
                    let element = model.getElement(eId);
                    return element && model.getElementLevel(eId) == dimension.level;
                });
            } else return null;
        } else {
            if (dimension.type == DimensionType.CONTINUOUS) {
                if (typeof value == 'string') value = parseFloat(value);
                if (isNaN(value)) { console.error('invalid value for dimension'); return null; }

                let domainPercent = DataUtil.limit((value - dimension.domain[0]) / (dimension.domain[1] - dimension.domain[0]), 0, 1);
                let channelPercent = (dimension.domainRange[1] - dimension.domainRange[0]) * domainPercent + dimension.domainRange[0];
                if (dimension.channel == ChannelType.POSITION) {
                    return channelPercent;
                } else if (dimension.channel == ChannelType.ANGLE) {
                    return 2 * Math.PI * channelPercent - Math.PI;
                } else if (dimension.channel == ChannelType.SIZE) {
                    let elements = model.getElements().filter(e => model.getElementLevel(e.id) == dimension.level && !dimension.unmappedIds.includes(e.id));
                    let sizes;
                    if (dimension.sizeType == SizeType.LENGTH) {
                        sizes = elements.map(e => PathUtil.getPathLength(e.spine));
                    } else {
                        sizes = elements.map(e => { let bb = DataUtil.getBoundingBox(e); return bb.height * bb.width });
                    }
                    let min = Math.min(...sizes);
                    let max = Math.max(...sizes)

                    return (max - min) * channelPercent + min;
                }
            } else {
                let categoryIndex = dimension.categories.findIndex(category => category.name == value);
                if (categoryIndex != null) {
                    let elements = model.getElements().filter(e =>
                        model.getElementLevel(e.id) == dimension.level &&
                        !dimension.unmappedIds.includes(e.id));
                    let rangePercentMin = categoryIndex == 0 ? 0 : dimension.ranges[categoryIndex - 1];
                    let rangePercentMax = dimension.ranges[categoryIndex];
                    elements.filter(element => {
                        let percent = getChannelPercentForElement(element, dimension, model)
                        if (percent >= rangePercentMin && percent < rangePercentMax) {
                            return true;
                        } else {
                            return false;
                        }
                    });
                    return elements.map(e => e.id);
                } else return null;
            }
        }
    }

    function getChannelPercentForElement(element, dimension, model) {
        let percent;
        if (dimension.channel == ChannelType.POSITION) {
            let parent = model.getElement(element.parentId)
            if (!parent) { console.error("Inavlid position element", element); return null }
            percent = PathUtil.getClosestPointOnPath(element.root, parent.spine).percent;
        } else if (dimension.channel == ChannelType.ANGLE) {
            let parent = dimension.angleType == AngleType.RELATIVE ? model.getElement(element.parentId) : null;
            percent = DataUtil.angleToPercent(DataUtil.getRelativeAngle(element, parent));
        } else if (dimension.channel == ChannelType.SIZE) {
            let elements = model.getElements().filter(e => model.getElementLevel(e.id) == dimension.level && !dimension.unmappedIds.includes(e.id));
            let sizes = elements.map(e => DataUtil.getSize(e, dimension.sizeType));
            let eSize = DataUtil.getSize(element, dimension.sizeType)
            let min = Math.min(...sizes);
            let max = Math.max(...sizes)
            if (min == max) {
                percent = 0;
            } else {
                percent = (eSize - min) / (max - min);
            }
        }
        return percent;
    }

    function getCategoryForPercent(dimension, percent) {
        if (dimension.categories.length == 0) return null
        if (dimension.categories.length == 1) return dimension.categories[0];
        for (let i = 0; i < dimension.ranges.length; i++) {
            if (percent <= dimension.ranges[i]) return dimension.categories[i];
        }
        if (percent > dimension.ranges[dimension.ranges.length - 1]) {
            return dimension.categories[dimension.categories.length - 1];
        }

        console.error("No valid category found for percent", percent);
        return null;
    }

    function needsLabel(template, level) {
        // label is NOT needed if:
        if (oneElementPerParent(template, level)) return false;
        if (oneElementPerRow(template, level)) return false;
        if (hasUniqueLabel(template, level)) return false;
        return true;
    }

    function oneElementPerParent(template, level) {
        // There is exactly one element for each parent
        // or one element for level 0
        let levelElements = template.getLevelElements(level);
        let levelParents = level == 0 ? ["OneElement"] : DataUtil.unique(levelElements.map(e => e.parentId));
        return levelElements.length == levelParents.length;
    }

    function oneElementPerRow(template, level) {
        let rowsForLevel = getLeaves(template).map(e => getAncestorAtLevel(e, level, template)).filter(e => e);
        let elementsForLevel = DataUtil.unique(rowsForLevel);
        return elementsForLevel.length == rowsForLevel.length;
    }

    function hasUniqueLabel(template, level) {
        let levelElements = template.getLevelElements(level);
        let labels = levelElements.map(e => getLabelForElement(e.id, template)).filter(l => l);
        return DataUtil.unique(labels).length == levelElements.length;
    }

    function hasMappedValue(element, template) {
        let level = template.getElementLevel(element.id);
        return template.getDimensions().some(d => {
            if (d.level != level) return false;
            if (d.unmappedIds.includes(element.id)) return false;
            if (DataUtil.channelIsContinuous(d.channel)) return true;
            if (DataUtil.channelIsDiscrete(d.channel)) {
                return d.categories.map(c => c.elementIds).flat().includes(element.id);
            }
            console.error("Invalid state!");
            return false;
        });
    }

    function getLowestMappedLevel(template) {
        return Math.max(...template.getElements().map(e => hasMappedValue(e, template) ? template.getElementLevel(e.id) : 0));
    }

    function getLabelForElement(eId, template) {
        let level = template.getElementLevel(eId);
        let labelDimens = template.getDimensions().filter(d => d.level == level && d.channel == ChannelType.LABEL);
        let labelCat = labelDimens.map(d => d.categories).flat().find(c => c.elementIds.includes(eId));
        return labelCat ? labelCat.name : null;
    }

    function getLeaves(template) {
        // it must be mapped to be a leaf
        let mappedElements = template.getElements().filter(e => hasMappedValue(e, template));
        let mappedElementIds = mappedElements.map(e => e.id);
        // if it's an ancestor of a leaf, it's not a leaf
        let leaves = mappedElements.filter(e => template.getElementDecendants(e.id).every(e => !mappedElementIds.includes(e.id)));
        return leaves
    }

    function getAncestorAtLevel(element, level, template) {
        let elementLevel = template.getElementLevel(element.id);
        if (level == elementLevel) return element;
        if (level > elementLevel) return null;
        for (let i = elementLevel; i > level; i--) {
            element = template.getElement(element.parentId);
        }
        return element;
    }

    function isTime(str) {
        if (typeof str != "string") return false;
        if (str.includes(':') && DataUtil.isNumeric(str.split(':')[0]) && DataUtil.isNumeric(str.split(':')[1])) { return true };
    }

    function parseDomainValue(str) {
        if (isTime(str)) {
            return parseInt(str.split(':')[0]) + parseInt(str.split(':')[1]) / 60;
        } else {
            return parseFloat(str);
        }
    }

    function formatTime(num) {
        let hours = Math.floor(num);
        let minutes = Math.round((num - hours) * 60);
        return String(hours).padStart(2, '0') + ":" + String(minutes).padStart(2, '0');
    }

    // returns a modelIds -> templateIds mapping for deriving values
    function getMappedSets(template, templateTableIds, model, table, level, channel) {
        let result = { modelIdSets: [], templateIdSets: [] };
        if (!(table instanceof DataTable)) {
            if (!Array.isArray(table)) { console.error("Invalid table", table) }
            result.templateIdSets.push(templateTableIds);
            result.modelIdSets.push(table);
            return result;
        }

        let tableIds = getTableIds(model, table)

        let dimens = table.getColumns().filter(d => d.level == level).filter(d => d.channel == channel);
        if (dimens.length == 0) {
            result.templateIdSets.push(templateTableIds);
            result.modelIdSets.push(model.getLevelElements(level).map(e => e.id).filter(eId => tableIds.includes(eId)));
            return result;
        }

        if (dimens.length > 1) { console.error("Not supported! Impliment me!") }
        let dimen = dimens[0];
        let cells = DataUtil.unique(table.getColumnData(dimen.id));
        result.dimensionId = dimen.id;
        if (dimen.type == DimensionType.CONTINUOUS) {
            result.values = DimensionType.CONTINUOUS;
            result.modelIdSets.push(cells.map(c => c.id));
            result.templateIdSets.push(cells.map(c => unmapValue(template, dimen.id, c.value)));
        } else {
            let originalValues = templateTableIds.map(eId => { return { id: eId, value: getMappedValue(template, dimen.id, eId) } })
            result.values = [];
            cells.forEach(cell => {
                if (!result.values.includes(cell.value)) {
                    let originalMatchingValues = originalValues.filter(c => c.value == cell.value);
                    if (originalMatchingValues.length == 0) {
                        console.error("No examples for value!", value)
                        originalMatchingValues = originalValues;
                    }
                    result.templateIdSets.push(originalMatchingValues.map(c => c.id));
                    result.modelIdSets.push([]);
                    result.values.push(cell.value);
                }
                let index = result.values.findIndex(v => v == cell.value);
                result.modelIdSets[index].push(cell.id)
            });
        }
        return result;
    }

    function getTableIds(model, table) {
        let maxLevelDimen = table.getColumns().reduce((max, cur) => cur.level >= max.level ? cur : max, { level: 0 });
        let leafIds = table.getColumnData(maxLevelDimen.id).map(l => l.id);
        let allIds = leafIds.map(id => getAncestorIds(model, id).concat([id])).flat();
        return DataUtil.unique(allIds);
    }

    function getAncestorIds(model, elementId) {
        let result = [];
        while (elementId) {
            let element = model.getElement(elementId);
            if (element.parentId) result.push(element.parentId);
            elementId = element.parentId;
        }
        return result;
    }

    function validateTables(template, tables) {
        let invalidCells = {};
        tables.forEach((table, tableIndex) => {
            invalidCells[tableIndex] = {};
            let invalidColumns = {};
            let hasColumn = [];
            table.getColumns().forEach(dimen => {
                if (!hasColumn[dimen.level]) hasColumn[dimen.level] = {};
                if (!hasColumn[dimen.level][dimen.channel]) {
                    hasColumn[dimen.level][dimen.channel] = dimen;
                } else {
                    invalidColumns[dimen.id] = "Cannot have more than one " + ChannelLabels[dimen.channel] + " column";
                }
            })

            let parentIds = {};
            let labelChannels = table.getColumns().filter(c => c.channel == ChannelType.LABEL).sort((a, b) => parseInt(b.level) - parseInt(a.level));
            let labelCols = labelChannels.map(c => table.getColumns().findIndex(col => c.id == col.id));
            table.getDataArray().forEach((row, rowIndex) => {
                for (let i = 0; i < labelCols.length - 1; i++) {
                    // note down the parent's id. 
                    let currentId = row[labelCols[i]].value;
                    let nextIdUp = row[labelCols[i + 1]].value;
                    if (!parentIds[currentId]) parentIds[currentId] = nextIdUp;
                    if (parentIds[currentId] != nextIdUp) {
                        let cellIndex = jspreadsheet.helpers.getColumnNameFromCoords(labelCols[i], rowIndex);
                        invalidCells[tableIndex][cellIndex] = "Element cannot have two parents";
                    }
                }
            });

            table.getDataArray().forEach((row, rowIndex) => {
                row.forEach((cell, colIndex) => {
                    let cellIndex = jspreadsheet.helpers.getColumnNameFromCoords(colIndex, rowIndex);
                    let dimension = table.getColumns()[colIndex];
                    if (IdUtil.isType(dimension.id, Data.Dimension)) dimension = template.getDimension(dimension.id)
                    if (invalidColumns[dimension.id]) {
                        invalidCells[tableIndex][cellIndex] = invalidColumns[dimension.id];
                        return;
                    }
                    if (dimension.type == DimensionType.DISCRETE && dimension.channel != ChannelType.LABEL) {
                        let category = dimension.categories.find(c => c.name == cell.value);
                        if (!category) {
                            invalidCells[tableIndex][cellIndex] = "Invalid category";
                            return;
                        } else if (DataUtil.channelIsDiscrete(dimension.channel) && category.elementIds.length == 0) {
                            invalidCells[tableIndex][cellIndex] = "Category has no examples";
                            return;
                        }
                    }
                    if (dimension.type == DimensionType.CONTINUOUS) {
                        if (isNaN(parseFloat(cell.value))) {
                            invalidCells[tableIndex][cellIndex] = "Numbers only, sorry";
                        }
                    }
                })
            })
        })

        return invalidCells;
    }

    return {
        getMappedValue,
        modelFromTables,
        getLeaves,
        getLowestMappedLevel,
        needsLabel,
        getAncestorAtLevel,
        getLabelForElement,
        validateTables,
        hasMappedValue
    }
}();