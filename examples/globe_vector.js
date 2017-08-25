/* global itowns, document, renderer */
// # Simple Globe viewer

// Define initial camera position
var positionOnGlobe = { longitude: 4, latitude: 45.9056, altitude: 2000000 };
var promises = [];

var urlKml = 'https://raw.githubusercontent.com/iTowns/iTowns2-sample-data/master/croquis.kml';
var urlGpx = 'https://raw.githubusercontent.com/iTowns/iTowns2-sample-data/master/ULTRA2009.gpx';
var urlGeojson = 'https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/departements/09-ariege/departement-09-ariege.geojson';

// `viewerDiv` will contain iTowns' rendering area (`<canvas>`)
var viewerDiv = document.getElementById('viewerDiv');

// Instanciate iTowns GlobeView*
var globeView = new itowns.GlobeView(viewerDiv, positionOnGlobe, { renderer: renderer });
function addLayerCb(layer) {
    return globeView.addLayer(layer);
}

// Add one imagery layer to the scene
// This layer is defined in a json file but it could be defined as a plain js
// object. See Layer* for more info.
promises.push(itowns.Fetcher.json('./layers/JSONLayers/Ortho.json').then(addLayerCb));
// Add two elevation layers.
// These will deform iTowns globe geometry to represent terrain elevation.
promises.push(itowns.Fetcher.json('./layers/JSONLayers/WORLD_DTM.json').then(addLayerCb));
promises.push(itowns.Fetcher.json('./layers/JSONLayers/IGN_MNT_HIGHRES.json').then(addLayerCb));

promises.push(itowns.Fetcher.xml(urlKml).then(function _(file) {
    var kmlLayer = {
        type: 'color',
        file: file,
        protocol: 'rasterizer',
        projection: 'EPSG:4326',
        id: 'Kml',
    };
    globeView.addLayer(kmlLayer);
}));

promises.push(itowns.Fetcher.xml(urlGpx).then(function _(file) {
    var gpxLayer = {
        type: 'color',
        file: file,
        protocol: 'rasterizer',
        projection: 'EPSG:4326',
        id: 'Gpx',
    };
    globeView.addLayer(gpxLayer);
}));

promises.push(itowns.Fetcher.json(urlGeojson).then(function _(file) {
    var geojsonLayer = {
        type: 'color',
        file: file,
        protocol: 'rasterizer',
        id: 'ariege',
        projection: 'EPSG:4326',
        crsFile: 'EPSG:4326',
        style: {
            fill: 'orange',
            fillOpacity: 0.5,
            stroke: 'white',
        },
    };
    globeView.addLayer(geojsonLayer);
}));

exports.view = globeView;
exports.initialPosition = positionOnGlobe;
