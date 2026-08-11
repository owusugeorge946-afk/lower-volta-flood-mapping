// LOWER VOLTA — 05 OTSU DIAGNOSTICS + THRESHOLD-SENSITIVITY PRODUCTS
// -----------------------------------------------------------------------------
// Purpose:
// 1) Recompute flood-period Otsu VV/VH thresholds from the imagery.
// 2) Recompute temporary-water area for Otsu VV, Otsu VH, and the 3x3 fixed
//    VV/VH threshold grid using the same terrain and persistent-water masks.
// 3) Export the prediction stack and area table for transparent sensitivity
//    analysis.
//
// IMPORTANT:
// The manuscript's diagnostic F1 benchmark is an archived analysis output and
// is NOT silently regenerated from a new random sample here. The exact archived
// benchmark metrics are stored in data/archived/LV_Diagnostic_Benchmark_Metrics.csv
// and the manuscript F1 sensitivity matrix is stored in
// data/archived/LV_S1_Threshold_F1_Sensitivity.csv.
//
// The separate final 600-point Sentinel-1/Sentinel-2 inter-sensor assessment is
// reproduced by gee/03_hydroclimate_exposure_s2.js + colab/04_agreement_metrics.py.

var AOI_ASSET = 'projects/nana-469713/assets/lower_volta';
var aoi = ee.FeatureCollection(AOI_ASSET).geometry();
var FOLDER = 'Lower_Volta_Final_Exports';
var MAX_SLOPE = 8;
var BASE_VV = -17;
var BASE_VH = -23;

var dem = ee.Image('USGS/SRTMGL1_003').clip(aoi);
var slope = ee.Terrain.slope(dem);
var terrainMask = slope.lte(MAX_SLOPE);
var jrc = ee.Image('JRC/GSW1_4/GlobalSurfaceWater')
  .select('occurrence').clip(aoi);

function s1(start, end) {
  return ee.ImageCollection('COPERNICUS/S1_GRD')
    .filterBounds(aoi)
    .filterDate(start, end)
    .filter(ee.Filter.eq('instrumentMode', 'IW'))
    .filter(ee.Filter.eq('resolution_meters', 10))
    .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
    .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VH'))
    .select(['VV', 'VH'])
    .map(function(img) {
      return img.focal_median({radius: 30, units: 'meters'})
        .rename(['VV', 'VH'])
        .copyProperties(img, img.propertyNames());
    });
}

function fixedWater(img, vv, vh) {
  return img.select('VV').lt(vv)
    .and(img.select('VH').lt(vh))
    .and(terrainMask);
}

var preCol = s1('2023-08-01', '2023-09-15');
var floodCol = s1('2023-10-01', '2023-11-01');
var flood = floodCol.median().clip(aoi);

var preFrequency = preCol.map(function(img) {
  return fixedWater(img, BASE_VV, BASE_VH).unmask(0).toByte();
}).mean();

var persistentWater = preFrequency.gte(0.25)
  .or(jrc.gte(50));

var analysisMask = terrainMask.and(persistentWater.not())
  .and(flood.select('VV').mask())
  .and(flood.select('VH').mask());

// Robust Otsu implementation: candidate split positions stop at size - 1 so
// both histogram classes always contain at least one bin.
function otsu(histogram) {
  var hist = ee.Dictionary(histogram);
  var counts = ee.Array(hist.get('histogram'));
  var means = ee.Array(hist.get('bucketMeans'));
  var size = ee.Number(means.length().get([0]));
  var total = ee.Number(counts.reduce(ee.Reducer.sum(), [0]).get([0]));
  var sum = ee.Number(means.multiply(counts)
    .reduce(ee.Reducer.sum(), [0]).get([0]));
  var globalMean = sum.divide(total);

  var splitIndices = ee.List.sequence(1, size.subtract(1));
  var bss = splitIndices.map(function(i) {
    i = ee.Number(i);
    var aCounts = counts.slice(0, 0, i);
    var aCount = ee.Number(aCounts.reduce(ee.Reducer.sum(), [0]).get([0]));
    var aMeans = means.slice(0, 0, i);
    var aSum = ee.Number(aMeans.multiply(aCounts)
      .reduce(ee.Reducer.sum(), [0]).get([0]));
    var aMean = aSum.divide(aCount);

    var bCount = total.subtract(aCount);
    var bMean = sum.subtract(aSum).divide(bCount);

    return aCount.multiply(aMean.subtract(globalMean).pow(2))
      .add(bCount.multiply(bMean.subtract(globalMean).pow(2)));
  });

  var ranked = ee.FeatureCollection(splitIndices.map(function(i) {
    i = ee.Number(i);
    var score = ee.Number(ee.List(bss).get(i.subtract(1)));
    var threshold = ee.Number(means.get([i.subtract(1)]));
    return ee.Feature(null, {score: score, threshold: threshold});
  })).sort('score', false);

  return ee.Number(ranked.first().get('threshold'));
}

function getOtsu(band) {
  var h = flood.select(band)
    .updateMask(analysisMask)
    .reduceRegion({
      reducer: ee.Reducer.histogram({maxBuckets: 256, minBucketWidth: 0.05}),
      geometry: aoi,
      scale: 10,
      maxPixels: 1e13,
      tileScale: 8
    }).get(band);
  return otsu(h);
}

function areaKm2(mask) {
  return ee.Image.pixelArea().divide(1e6)
    .updateMask(mask)
    .reduceRegion({
      reducer: ee.Reducer.sum(),
      geometry: aoi,
      scale: 10,
      maxPixels: 1e13,
      tileScale: 4
    }).values().get(0);
}

var otsuVV = getOtsu('VV');
var otsuVH = getOtsu('VH');
print('Flood-period Otsu VV threshold (dB)', otsuVV);
print('Flood-period Otsu VH threshold (dB)', otsuVH);

function finalMask(mask) {
  return ee.Image(mask).and(analysisMask).selfMask();
}

var vvOtsu = finalMask(flood.select('VV').lt(otsuVV)).rename('otsu_vv');
var vhOtsu = finalMask(flood.select('VH').lt(otsuVH)).rename('otsu_vh');
var baseline = finalMask(fixedWater(flood, BASE_VV, BASE_VH)).rename('fixed_m17_m23');

var rows = ee.FeatureCollection([
  ee.Feature(null, {
    method: 'Otsu VV', vv_threshold_db: otsuVV, vh_threshold_db: null,
    temporary_water_km2: areaKm2(vvOtsu)
  }),
  ee.Feature(null, {
    method: 'Otsu VH', vv_threshold_db: null, vh_threshold_db: otsuVH,
    temporary_water_km2: areaKm2(vhOtsu)
  }),
  ee.Feature(null, {
    method: 'Fixed dual polarisation', vv_threshold_db: BASE_VV,
    vh_threshold_db: BASE_VH, temporary_water_km2: areaKm2(baseline)
  })
]);

var stack = ee.Image.cat([vvOtsu.unmask(0), vhOtsu.unmask(0), baseline.unmask(0)]).toByte();

var vvValues = [-18, -17, -16];
var vhValues = [-24, -23, -22];

vhValues.forEach(function(vh) {
  vvValues.forEach(function(vv) {
    var name = 'fixed_vv' + String(Math.abs(vv)) + '_vh' + String(Math.abs(vh));
    var mask = finalMask(fixedWater(flood, vv, vh)).rename(name);
    rows = rows.merge(ee.FeatureCollection([
      ee.Feature(null, {
        method: 'Fixed dual polarisation sensitivity',
        vv_threshold_db: vv,
        vh_threshold_db: vh,
        temporary_water_km2: areaKm2(mask)
      })
    ]));
    stack = stack.addBands(mask.unmask(0).toByte());
  });
});

print('Otsu and fixed-threshold area diagnostics', rows);

Export.table.toDrive({
  collection: rows,
  description: 'LV_S1_Otsu_and_Threshold_Area_Diagnostics',
  folder: FOLDER,
  fileNamePrefix: 'LV_S1_Otsu_and_Threshold_Area_Diagnostics',
  fileFormat: 'CSV'
});

Export.image.toDrive({
  image: stack.clip(aoi),
  description: 'LV_S1_Method_and_Threshold_Prediction_Stack',
  folder: FOLDER,
  fileNamePrefix: 'LV_S1_Method_and_Threshold_Prediction_Stack',
  region: aoi,
  scale: 10,
  maxPixels: 1e13
});
