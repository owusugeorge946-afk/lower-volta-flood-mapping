// LOWER VOLTA BASIN FLOOD MAPPING — 02 FREQUENCY, BACKSCATTER CHANGE, TERRAIN
var aoi=ee.FeatureCollection('projects/nana-469713/assets/lower_volta').geometry();
var VV_THR=-17,VH_THR=-23,MAX_SLOPE=8,FOLDER='Lower_Volta_Final_Exports';
var dem=ee.Image('USGS/SRTMGL1_003').clip(aoi);
var slope=ee.Terrain.slope(dem), terrainMask=slope.lte(MAX_SLOPE);
var gsw=ee.Image('JRC/GSW1_4/GlobalSurfaceWater').select('occurrence').clip(aoi);

function s1(start,end){
 return ee.ImageCollection('COPERNICUS/S1_GRD').filterBounds(aoi).filterDate(start,end)
  .filter(ee.Filter.eq('instrumentMode','IW'))
  .filter(ee.Filter.eq('resolution_meters',10))
  .filter(ee.Filter.listContains('transmitterReceiverPolarisation','VV'))
  .filter(ee.Filter.listContains('transmitterReceiverPolarisation','VH'))
  .select(['VV','VH']).map(function(img){
   return img.focal_median({radius:30,units:'meters'}).rename(['VV','VH'])
    .copyProperties(img,img.propertyNames());
  });
}
function water(img){return img.select('VV').lt(VV_THR).and(img.select('VH').lt(VH_THR))
 .and(terrainMask).unmask(0).toByte();}
function area(mask){return ee.Image.pixelArea().divide(1e6).updateMask(mask).reduceRegion({
 reducer:ee.Reducer.sum(),geometry:aoi,scale:10,maxPixels:1e13,tileScale:4}).values().get(0);}

var preCol=s1('2023-08-01','2023-09-15');
var persistent=preCol.map(water).mean().gte(0.25).or(gsw.gte(50));
var floodCol=s1('2023-10-01','2023-11-01');
var temp=floodCol.map(function(img){
 return water(img).and(persistent.not()).rename('temporary_flood')
  .copyProperties(img,['system:time_start','system:index']);
});
var count=temp.sum().rename('flood_count');
var valid=floodCol.map(function(img){
 return img.select('VV').mask().and(img.select('VH').mask()).unmask(0).toByte();
}).sum().rename('valid_count');
var freq=count.divide(valid).multiply(100).rename('flood_frequency_pct').updateMask(valid.gt(0));
var cumulative=count.gte(1).selfMask().rename('cumulative_flood');
var recurrent=count.divide(valid).gt(0.25).and(count.gte(1)).selfMask().rename('recurrent_flood');
var sporadic=cumulative.unmask(0).and(recurrent.unmask(0).not()).selfMask().rename('sporadic_flood');

var perObs=ee.FeatureCollection(temp.map(function(img){
 return ee.Feature(null,{date:ee.Date(img.get('system:time_start')).format('YYYY-MM-dd'),
 system_index:img.get('system:index'),temporary_flood_km2:area(img)});
}));

var pre=preCol.median(), flood=floodCol.median();
var dVV=flood.select('VV').subtract(pre.select('VV')).rename('dVV');
var dVH=flood.select('VH').subtract(pre.select('VH')).rename('dVH');
var vvClass=ee.Image(0).where(dVV.lte(-2),1)
 .where(dVV.gt(-2).and(dVV.lte(-1)),2)
 .where(dVV.gt(-1).and(dVV.lt(1)),3)
 .where(dVV.gte(1),4).rename('VV_change_class').updateMask(dVV.mask());
var change=vvClass.eq(1).or(vvClass.eq(2)).selfMask().rename('surface_change');

var areas=ee.FeatureCollection([
 ee.Feature(null,{product:'Cumulative temporary flood',area_km2:area(cumulative)}),
 ee.Feature(null,{product:'Recurrent temporary flood',area_km2:area(recurrent)}),
 ee.Feature(null,{product:'Sporadic temporary flood',area_km2:area(sporadic)}),
 ee.Feature(null,{product:'Flood-affected surface-change zone',area_km2:area(change)})
]);

function terrainStats(name,mask){
 var red=ee.Reducer.min().combine(ee.Reducer.max(),'_',true)
  .combine(ee.Reducer.mean(),'_',true).combine(ee.Reducer.median(),'_',true);
 var e=dem.updateMask(mask).reduceRegion({reducer:red,geometry:aoi,scale:30,maxPixels:1e13,tileScale:4});
 var s=slope.updateMask(mask).reduceRegion({reducer:red,geometry:aoi,scale:30,maxPixels:1e13,tileScale:4});
 return ee.Feature(null,{zone:name,elev_min:e.get('elevation_min'),elev_max:e.get('elevation_max'),
 elev_mean:e.get('elevation_mean'),elev_median:e.get('elevation_median'),
 slope_min:s.get('slope_min'),slope_max:s.get('slope_max'),slope_mean:s.get('slope_mean'),
 slope_median:s.get('slope_median')});
}
var terrain=ee.FeatureCollection([
 terrainStats('Study area',ee.Image.constant(1).clip(aoi)),
 terrainStats('Cumulative flood',cumulative),
 terrainStats('Recurrent flood',recurrent),
 terrainStats('Surface-change zone',change)
]);
print('Per-observation flood area',perObs); print('Area summary',areas); print('Terrain',terrain);

Export.table.toDrive({collection:perObs,description:'LV_Per_Observation_Flood_Area',folder:FOLDER,fileFormat:'CSV'});
Export.table.toDrive({collection:areas,description:'LV_Frequency_Change_Area_Summary',folder:FOLDER,fileFormat:'CSV'});
Export.table.toDrive({collection:terrain,description:'LV_Terrain_Statistics',folder:FOLDER,fileFormat:'CSV'});

[
 ['LV_Flood_Count',count,10],['LV_Flood_Frequency_Percent',freq,10],['LV_Cumulative_Flood',cumulative,10],
 ['LV_Recurrent_Flood',recurrent,10],['LV_Sporadic_Flood',sporadic,10],['LV_dVV',dVV,10],['LV_dVH',dVH,10],
 ['LV_VV_Change_Classes',vvClass,10],['LV_Revised_Backscatter_Change',change,10],
 ['LV_Elevation',dem,30],['LV_Slope',slope,30]
].forEach(function(x){Export.image.toDrive({image:ee.Image(x[1]).clip(aoi),description:x[0],folder:FOLDER,
 fileNamePrefix:x[0],region:aoi,scale:x[2],maxPixels:1e13});});
