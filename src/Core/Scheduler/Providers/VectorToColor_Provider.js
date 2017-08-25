/**
 * Class: VectorToColor_Provider
 * Description: Provides textures from a vector data
 */


import * as THREE from 'three';
import togeojson from 'togeojson';
import Extent from '../../Geographic/Extent';
import GeoJSON2Texture from '../../../Renderer/ThreeExtended/GeoJSON2Texture';
import GeoJSON2Three from '../../../Renderer/ThreeExtended/GeoJSON2Three';

function getExtentFromGpxFile(file) {
    const bound = file.getElementsByTagName('bounds')[0];
    if (bound) {
        const west = bound.getAttribute('minlon');
        const east = bound.getAttribute('maxlon');
        const south = bound.getAttribute('minlat');
        const north = bound.getAttribute('maxlat');
        return new Extent('EPSG:4326', west, east, south, north);
    }
    return new Extent('EPSG:4326', -180, 180, -90, 90);
}

function VectorToColor_Provider() {
}

VectorToColor_Provider.prototype.preprocessDataLayer = function preprocessDataLayer(layer) {
    if (!layer.file) {
        throw new Error('layer.file is required');
    }

    if (!layer.projection) {
        throw new Error('layer.projection is required');
    }

    layer.options = layer.options || {};

    // Know if it's an xml file, then it can be kml or gpx
    if (layer.file.getElementsByTagName) {
        if (layer.file.getElementsByTagName('kml')[0]) {
            layer.options.mimetype = 'vector/kml';
            // KML crs specification : 'EPSG:4326'
            layer.crsFile = layer.crsFile || 'EPSG:4326';
        } else if (layer.file.getElementsByTagName('gpx')[0]) {
            // GPX crs specification : 'EPSG:4326'
            layer.options.mimetype = 'vector/gpx';
            layer.crsFile = layer.crsFile || 'EPSG:4326';
        } else {
            throw new Error('Unsupported xml file data vector');
        }
    // Know if it's an geojson file
    } else if (layer.file.type == 'Feature' || layer.file.type == 'FeatureCollection') {
        layer.options.mimetype = 'vector/geojson';
    } else {
        throw new Error('Unsupported json file data vector');
    }

    if (!(layer.extent instanceof Extent)) {
        layer.extent = new Extent(layer.projection, layer.extent);
    }

    if (!layer.options.zoom) {
        layer.options.zoom = { min: 5, max: 21 };
    }

    layer.format = layer.options.mimetype || 'vector/kml';
    layer.style = layer.style || {};

    // Rasterization of data vector
    // It shouldn't use parent's texture outside the extent
    // Otherwise artefacts appear at the outer edge
    layer.noTextureParentOutsideLimit = true;

    const options = { toMesh: false, buildExtent: true, crsIn: layer.crsFile };

    if (layer.options.mimetype === 'vector/geojson') {
        layer.geojson = GeoJSON2Three.parse(layer.projection, layer.file, layer.extent, options);
        layer.extent = layer.geojson.extent || layer.geojson.geometry.extent;
    } else if (layer.options.mimetype === 'vector/kml') {
        const geojson = togeojson.kml(layer.file);
        layer.geojson = GeoJSON2Three.parse(layer.projection, geojson, layer.extent, options);
        layer.extent = layer.geojson.extent;
    } else if (layer.options.mimetype === 'vector/gpx') {
        const geojson = togeojson.gpx(layer.file);
        layer.style.stroke = layer.style.stroke || 'red';
        layer.extent = getExtentFromGpxFile(layer.file);
        layer.geojson = GeoJSON2Three.parse(layer.projection, geojson, layer.extent, options);
    }
};

VectorToColor_Provider.prototype.tileInsideLimit = function tileInsideLimit(tile, layer) {
    return tile.level >= layer.options.zoom.min && tile.level <= layer.options.zoom.max && layer.extent.intersect(tile.extent);
};

VectorToColor_Provider.prototype.getColorTexture = function getColorTexture(tile, layer) {
    if (!this.tileInsideLimit(tile, layer)) {
        return Promise.reject(`Tile '${tile}' is outside layer bbox ${layer.extent}`);
    }
    if (tile.material === null) {
        return Promise.resolve();
    }

    if (layer.type == 'color') {
        const coords = tile.extent.as(layer.projection);
        const result = { pitch: new THREE.Vector3(0, 0, 1) };
        result.texture = GeoJSON2Texture.getTextureFromGeoson(layer.geojson, tile.extent, 256, layer.style);
        result.texture.extent = tile.extent;
        result.texture.coords = coords;
        result.texture.coords.zoom = tile.level;
        return Promise.resolve(result);
    } else {
        return Promise.resolve();
    }
};

VectorToColor_Provider.prototype.executeCommand = function executeCommand(command) {
    const tile = command.requester;

    const layer = command.layer;
    const supportedFormats = {
        'vector/kml': this.getColorTexture.bind(this),
        'vector/gpx': this.getColorTexture.bind(this),
        'vector/geojson': this.getColorTexture.bind(this),
    };

    const func = supportedFormats[layer.format];

    if (func) {
        return func(tile, layer);
    } else {
        return Promise.reject(new Error(`Unsupported mimetype ${layer.format}`));
    }
};

export default VectorToColor_Provider;
