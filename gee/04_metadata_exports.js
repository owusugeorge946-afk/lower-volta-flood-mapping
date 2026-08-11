// LOWER VOLTA BASIN FLOOD MAPPING — 04 ACQUISITION METADATA EXPORTS
var aoi=ee.FeatureCollection('projects/nana-469713/assets/lower_volta').geometry();
var FOLDER='Lower_Volta_Final_Exports';
function s1raw(start,end,label){
 return ee.ImageCollection('COPERNICUS/S1_GRD').filterBounds(aoi).filterDate(start,end)
  .filter(ee.Filter.eq('instrumentMode','IW'))
  .filter(ee.Filter.eq('resolution_meters',10))
  .filter(ee.Filter.listContains('transmitterReceiverPolarisation','VV'))
  .filter(ee.Filter.listContains('transmitterReceiverPolarisation','VH'))
  .map(function(img){return img.set('analysis_window',label);});
}
var s1=s1raw('2023-01-01','2023-03-01','dry season')
 .merge(s1raw('2023-06-01','2023-08-01','wet season'))
 .merge(s1raw('2023-08-01','2023-09-15','pre-flood'))
 .merge(s1raw('2023-10-01','2023-11-01','flood period'));
var s1meta=ee.FeatureCollection(s1.map(function(img){
 return ee.Feature(null,{
  analysis_window:img.get('analysis_window'),
  acquisition_date:ee.Date(img.get('system:time_start')).format('YYYY-MM-dd HH:mm:ss'),
  image_id:img.id(),system_index:img.get('system:index'),platform_number:img.get('platform_number'),
  instrument_mode:img.get('instrumentMode'),orbit_pass:img.get('orbitProperties_pass'),
  relative_orbit_start:img.get('relativeOrbitNumber_start'),relative_orbit_stop:img.get('relativeOrbitNumber_stop'),
  resolution_meters:img.get('resolution_meters'),
  manuscript_hydro_date:ee.List(['2023-10-04','2023-10-11','2023-10-16','2023-10-23']).contains(ee.Date(img.get('system:time_start')).format('YYYY-MM-dd')),polarisations:img.get('transmitterReceiverPolarisation')
 });
}));
var s2=ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED').filterBounds(aoi)
 .filterDate('2023-10-15','2023-11-01').filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE',20));
var s2meta=ee.FeatureCollection(s2.map(function(img){
 return ee.Feature(null,{
  acquisition_date:ee.Date(img.get('system:time_start')).format('YYYY-MM-dd HH:mm:ss'),
  image_id:img.id(),system_index:img.get('system:index'),spacecraft_name:img.get('SPACECRAFT_NAME'),
  processing_baseline:img.get('PROCESSING_BASELINE'),cloudy_pixel_percentage:img.get('CLOUDY_PIXEL_PERCENTAGE'),
  mgrs_tile:img.get('MGRS_TILE'),product_id:img.get('PRODUCT_ID')
 });
}));
print('Sentinel-1 metadata',s1meta); print('Sentinel-2 metadata',s2meta);
Export.table.toDrive({collection:s1meta,description:'LV_Sentinel1_Acquisition_Metadata',folder:FOLDER,fileFormat:'CSV'});
Export.table.toDrive({collection:s2meta,description:'LV_Sentinel2_Acquisition_Metadata',folder:FOLDER,fileFormat:'CSV'});
