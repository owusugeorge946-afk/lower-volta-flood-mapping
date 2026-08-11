// LOWER VOLTA BASIN FLOOD MAPPING — 01 PREPROCESSING AND FLOOD PRODUCTS
var AOI_ASSET='projects/nana-469713/assets/lower_volta';
var aoi=ee.FeatureCollection(AOI_ASSET).geometry();
var VV_THR=-17, VH_THR=-23, MAX_SLOPE=8, PRE_FREQ_THR=0.25, JRC_OCC_THR=50;
var FOLDER='Lower_Volta_Final_Exports';

var dem=ee.Image('USGS/SRTMGL1_003').clip(aoi);
var slope=ee.Terrain.slope(dem);
var terrainMask=slope.lte(MAX_SLOPE);
var gsw=ee.Image('JRC/GSW1_4/GlobalSurfaceWater').select('occurrence').clip(aoi);

function s1(start,end){
  return ee.ImageCollection('COPERNICUS/S1_GRD')
    .filterBounds(aoi).filterDate(start,end)
    .filter(ee.Filter.eq('instrumentMode','IW'))
    .filter(ee.Filter.eq('resolution_meters',10))
    .filter(ee.Filter.listContains('transmitterReceiverPolarisation','VV'))
    .filter(ee.Filter.listContains('transmitterReceiverPolarisation','VH'))
    .select(['VV','VH'])
    .map(function(img){
      return img.focal_median({radius:30,units:'meters'})
        .rename(['VV','VH']).copyProperties(img,img.propertyNames());
    });
}
function comp(start,end){return s1(start,end).median().clip(aoi);}
function binary(img){
  return img.select('VV').lt(VV_THR).and(img.select('VH').lt(VH_THR))
    .and(terrainMask).rename('water').unmask(0).toByte();
}
function areaKm2(mask,scale){
  return ee.Image.pixelArea().divide(1e6).updateMask(mask).reduceRegion({
    reducer:ee.Reducer.sum(),geometry:aoi,scale:scale||10,maxPixels:1e13,tileScale:4
  }).values().get(0);
}

var dry=comp('2023-01-01','2023-03-01');
var wet=comp('2023-06-01','2023-08-01');
var pre=comp('2023-08-01','2023-09-15');
var flood=comp('2023-10-01','2023-11-01');

var dryWater=binary(dry).selfMask().rename('dry_water');
var wetWater=binary(wet).selfMask().rename('wet_water');
var wetExpansion=wetWater.unmask(0).and(dryWater.unmask(0).not())
  .selfMask().rename('wet_season_expansion');

var preCol=s1('2023-08-01','2023-09-15');
var preFrequency=preCol.map(binary).mean().rename('pre_water_frequency');
var persistent=preFrequency.gte(PRE_FREQ_THR).or(gsw.gte(JRC_OCC_THR))
  .rename('persistent_water');

var floodWater=binary(flood).selfMask().rename('flood_period_water');
var temporary=floodWater.unmask(0).and(persistent.not())
  .selfMask().rename('temporary_flood');
var contrast=flood.select('VV').subtract(flood.select('VH')).rename('VV_VH_contrast');

var summary=ee.FeatureCollection([
  ee.Feature(null,{product:'Dry-season open water',area_km2:areaKm2(dryWater,10)}),
  ee.Feature(null,{product:'Wet-season open water',area_km2:areaKm2(wetWater,10)}),
  ee.Feature(null,{product:'Seasonal water expansion',area_km2:areaKm2(wetExpansion,10)}),
  ee.Feature(null,{product:'Event-composite temporary flood',area_km2:areaKm2(temporary,10)})
]);
print('Counts',s1('2023-01-01','2023-03-01').size(),s1('2023-06-01','2023-08-01').size(),
      preCol.size(),s1('2023-10-01','2023-11-01').size());
print('Core area summary',summary);

Map.centerObject(aoi,9);
Map.addLayer(temporary,{palette:['b30000']},'Event temporary flood',true);

Export.table.toDrive({collection:summary,description:'LV_Core_Area_Summary',folder:FOLDER,
 fileNamePrefix:'LV_Core_Area_Summary',fileFormat:'CSV'});

[
 ['LV_Dry_Water',dryWater],['LV_Wet_Water',wetWater],
 ['LV_Seasonal_Water_Expansion',wetExpansion],['LV_Pre_Water_Frequency',preFrequency],
 ['LV_Persistent_Water',persistent.selfMask()],['LV_Flood_Period_Water',floodWater],
 ['LV_Event_Temporary_Flood',temporary],['LV_Flood_VV',flood.select('VV')],
 ['LV_Flood_VH',flood.select('VH')],['LV_Flood_VV_VH_Contrast',contrast]
].forEach(function(x){
 Export.image.toDrive({image:ee.Image(x[1]).clip(aoi),description:x[0],folder:FOLDER,
 fileNamePrefix:x[0],region:aoi,scale:10,maxPixels:1e13});
});
