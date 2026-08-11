// LOWER VOLTA BASIN FLOOD MAPPING — 03 HYDROCLIMATE, EXPOSURE, SENTINEL-2
// Corrected reproducibility version: total ERA5-Land runoff, four-date hydro subset,
// explicit GHSL 2020 image, 10 m S1 filtering, and valid-S2-only agreement sampling.
var aoi=ee.FeatureCollection('projects/nana-469713/assets/lower_volta').geometry();
var FOLDER='Lower_Volta_Final_Exports',VV_THR=-17,VH_THR=-23,MAX_SLOPE=8;
var dem=ee.Image('USGS/SRTMGL1_003').clip(aoi), slope=ee.Terrain.slope(dem);
var terrainMask=slope.lte(MAX_SLOPE);
var jrc=ee.Image('JRC/GSW1_4/GlobalSurfaceWater').select('occurrence').clip(aoi);

function s1(start,end){
 return ee.ImageCollection('COPERNICUS/S1_GRD').filterBounds(aoi).filterDate(start,end)
  .filter(ee.Filter.eq('instrumentMode','IW')).filter(ee.Filter.eq('resolution_meters',10))
  .filter(ee.Filter.listContains('transmitterReceiverPolarisation','VV'))
  .filter(ee.Filter.listContains('transmitterReceiverPolarisation','VH'))
  .select(['VV','VH']).map(function(img){
   return img.focal_median({radius:30,units:'meters'}).rename(['VV','VH'])
    .copyProperties(img,img.propertyNames());
  });
}
function water(img){return img.select('VV').lt(VV_THR).and(img.select('VH').lt(VH_THR))
 .and(terrainMask).unmask(0).toByte();}
var preCol=s1('2023-08-01','2023-09-15');
var persistent=preCol.map(water).mean().gte(0.25).or(jrc.gte(50));
var floodCol=s1('2023-10-01','2023-11-01');
var temp=floodCol.map(function(img){return water(img).and(persistent.not()).rename('temporary_flood')
 .copyProperties(img,['system:time_start','system:index']);});
var count=temp.sum();
var valid=floodCol.map(function(img){return img.select('VV').mask().and(img.select('VH').mask()).unmask(0).toByte();}).sum();
var cumulative=count.gte(1).selfMask();
var recurrent=count.divide(valid).gt(0.25).and(count.gte(1)).selfMask();
var dVV=floodCol.median().select('VV').subtract(preCol.median().select('VV'));
var change=dVV.lte(-1).selfMask();

// Hydro-climatic analysis is intentionally frozen to the four dates used in the manuscript.
var HYDRO_DATES=ee.List(['2023-10-04','2023-10-11','2023-10-16','2023-10-23']);
var hydroTemp=temp.filter(ee.Filter.inList('system:index', floodCol.filter(ee.Filter.inList(
 'system:time_start', HYDRO_DATES.map(function(d){return ee.Date(d).millis();}))).aggregate_array('system:index')));
// Date matching above can be brittle when acquisition times are not midnight; use calendar-day tagging instead.
var tagged=temp.map(function(img){return img.set('analysis_date',ee.Date(img.get('system:time_start')).format('YYYY-MM-dd'));});
hydroTemp=tagged.filter(ee.Filter.inList('analysis_date',HYDRO_DATES));
print('Hydro-climatic four-date subset (must equal 4):',hydroTemp.size());

var chirps=ee.ImageCollection('UCSB-CHG/CHIRPS/DAILY').filterBounds(aoi);
var era5=ee.ImageCollection('ECMWF/ERA5_LAND/DAILY_AGGR').filterBounds(aoi).select('runoff_sum');
function meanBasin(img,scale){return img.reduceRegion({reducer:ee.Reducer.mean(),geometry:aoi,scale:scale,maxPixels:1e13,tileScale:4}).values().get(0);}
function rainBefore(date,k){var d=ee.Date(date);return chirps.filterDate(d.advance(-k,'day'),d).sum();}
function runoffBefore(date,k){var d=ee.Date(date);return era5.filterDate(d.advance(-k,'day'),d).sum().multiply(1000);}
var windows=ee.List([1,3,7,14,30]);
var hydro=ee.FeatureCollection(hydroTemp.map(function(img){
 var date=ee.Date(img.get('system:time_start'));
 var area=ee.Image.pixelArea().divide(1e6).updateMask(img).reduceRegion({reducer:ee.Reducer.sum(),geometry:aoi,scale:10,maxPixels:1e13,tileScale:4}).values().get(0);
 var base=ee.Dictionary({date:date.format('YYYY-MM-dd'),system_index:img.get('system:index'),temporary_flood_km2:area});
 var props=ee.Dictionary(windows.iterate(function(k,acc){k=ee.Number(k);acc=ee.Dictionary(acc);
  return acc.set(ee.String('rain_').cat(k.format()).cat('d_mm'),meanBasin(rainBefore(date,k),5566))
   .set(ee.String('runoff_').cat(k.format()).cat('d_mm'),meanBasin(runoffBefore(date,k),11132));},base));
 return ee.Feature(null,props);
}));

var monthly=ee.FeatureCollection(ee.List.sequence(1,12).map(function(m){m=ee.Number(m);var st=ee.Date.fromYMD(2023,m,1),en=st.advance(1,'month');
 return ee.Feature(null,{year:2023,month:m,rainfall_mm:meanBasin(chirps.filterDate(st,en).sum(),5566)});}));
var floodRain=chirps.filterDate('2023-10-01','2023-11-01').sum().rename('flood_period_rainfall_mm').clip(aoi);

var wc=ee.ImageCollection('ESA/WorldCover/v200').first().select('Map').clip(aoi);
var names=ee.Dictionary({'10':'Tree cover','20':'Shrubland','30':'Grassland','40':'Cropland','50':'Built-up','60':'Bare / sparse vegetation','70':'Snow and ice','80':'Permanent water','90':'Herbaceous wetland','95':'Mangroves','100':'Moss and lichen'});
function wcTable(mask,zone){var r=ee.Image.pixelArea().divide(1e6).addBands(wc).updateMask(mask).reduceRegion({reducer:ee.Reducer.sum().group({groupField:1,groupName:'class'}),geometry:aoi,scale:10,maxPixels:1e13,tileScale:4});
 return ee.FeatureCollection(ee.List(r.get('groups')).map(function(g){g=ee.Dictionary(g);var c=ee.Number(g.get('class')).format();return ee.Feature(null,{zone:zone,class_code:g.get('class'),class_name:names.get(c),area_km2:g.get('sum')});}));}
var wcExposure=wcTable(cumulative,'Cumulative temporary flood').merge(wcTable(recurrent,'Recurrent temporary flood')).merge(wcTable(change,'Backscatter-change zone'));

var ghsl=ee.Image('JRC/GHSL/P2023A/GHS_BUILT_S/2020').select('built_surface').clip(aoi);
function ghslArea(mask,zone){var v=ghsl.divide(1e6).updateMask(mask).reduceRegion({reducer:ee.Reducer.sum(),geometry:aoi,scale:100,maxPixels:1e13,tileScale:4}).get('built_surface');return ee.Feature(null,{zone:zone,built_surface_km2:v});}
var ghslExposure=ee.FeatureCollection([ghslArea(ee.Image.constant(1).clip(aoi),'Study area'),ghslArea(cumulative,'Cumulative temporary flood'),ghslArea(recurrent,'Recurrent temporary flood'),ghslArea(change,'Backscatter-change zone')]);

function maskS2(img){var scl=img.select('SCL');var clear=scl.neq(3).and(scl.neq(8)).and(scl.neq(9)).and(scl.neq(10)).and(scl.neq(11));return img.updateMask(clear).select(['B3','B11']).multiply(0.0001).copyProperties(img,img.propertyNames());}
var s2col=ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED').filterBounds(aoi).filterDate('2023-10-15','2023-11-01').filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE',20)).map(maskS2);
var s2=s2col.median().clip(aoi),mndwi=s2.normalizedDifference(['B3','B11']).rename('MNDWI');
function s2temp(t){return mndwi.gt(t).and(persistent.not()).and(terrainMask).selfMask();}
function a(mask){return ee.Image.pixelArea().divide(1e6).updateMask(mask).reduceRegion({reducer:ee.Reducer.sum(),geometry:aoi,scale:10,maxPixels:1e13,tileScale:4}).values().get(0);}
var s201=s2temp(0.10),s202=s2temp(0.20),s203=s2temp(0.30);
var mndwiSensitivity=ee.FeatureCollection([ee.Feature(null,{threshold:0.10,temporary_water_km2:a(s201)}),ee.Feature(null,{threshold:0.20,temporary_water_km2:a(s202)}),ee.Feature(null,{threshold:0.30,temporary_water_km2:a(s203)})]);

// Preserve the optical validity mask. Cloud/no-data pixels are excluded, never converted to non-flood.
var validS2=mndwi.mask().and(terrainMask).and(persistent.not());
var s2class=mndwi.gt(0.20).rename('s2_class').toByte().updateMask(validS2);
var s1event=water(floodCol.median()).and(persistent.not()).rename('s1_class').toByte().updateMask(validS2);
var points=s2class.addBands(s1event).stratifiedSample({numPoints:300,classBand:'s2_class',region:aoi,scale:10,classValues:[0,1],classPoints:[300,300],geometries:true,seed:2023,tileScale:4});

print('Hydroclimate',hydro);print('WorldCover exposure',wcExposure);print('GHSL exposure',ghslExposure);print('MNDWI sensitivity',mndwiSensitivity);print('S2 comparison scenes',s2col.size());print('Valid comparison points',points.size());
[['LV_Hydroclimate_Per_Observation',hydro],['LV_CHIRPS_Monthly_2023',monthly],['LV_WorldCover_Exposure',wcExposure],['LV_GHSL_Built_Exposure',ghslExposure],['LV_MNDWI_Sensitivity',mndwiSensitivity],['LV_S1_S2_600_Point_Comparison',points]].forEach(function(x){Export.table.toDrive({collection:x[1],description:x[0],folder:FOLDER,fileNamePrefix:x[0],fileFormat:'CSV'});});
[['LV_CHIRPS_Flood_Period_Rainfall',floodRain,5566],['LV_WorldCover',wc,10],['LV_GHSL_Built_Surface_2020',ghsl,100],['LV_Sentinel2_MNDWI',mndwi,10],['LV_Sentinel2_Temporary_Water_020',s202,10]].forEach(function(x){Export.image.toDrive({image:ee.Image(x[1]).clip(aoi),description:x[0],folder:FOLDER,fileNamePrefix:x[0],region:aoi,scale:x[2],maxPixels:1e13});});
