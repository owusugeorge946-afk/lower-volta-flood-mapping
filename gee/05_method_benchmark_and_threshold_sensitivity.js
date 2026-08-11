// LOWER VOLTA — REPRODUCIBLE METHOD BENCHMARK + 3x3 S1 THRESHOLD SENSITIVITY
// Run AFTER gee/03_hydroclimate_exposure_s2.js logic has been checked.
// This script derives Otsu thresholds from flood-period VV/VH histograms and evaluates
// Otsu-VV, Otsu-VH, and all fixed dual-polarisation thresholds against the same
// valid Sentinel-2 MNDWI > 0.20 reference sample.
var aoi=ee.FeatureCollection('projects/nana-469713/assets/lower_volta').geometry();
var FOLDER='Lower_Volta_Final_Exports',MAX_SLOPE=8;
var slope=ee.Terrain.slope(ee.Image('USGS/SRTMGL1_003')).clip(aoi),terrain=slope.lte(MAX_SLOPE);
var jrc=ee.Image('JRC/GSW1_4/GlobalSurfaceWater').select('occurrence').clip(aoi);
function s1(start,end){return ee.ImageCollection('COPERNICUS/S1_GRD').filterBounds(aoi).filterDate(start,end)
 .filter(ee.Filter.eq('instrumentMode','IW')).filter(ee.Filter.eq('resolution_meters',10))
 .filter(ee.Filter.listContains('transmitterReceiverPolarisation','VV')).filter(ee.Filter.listContains('transmitterReceiverPolarisation','VH'))
 .select(['VV','VH']).map(function(img){return img.focal_median({radius:30,units:'meters'}).rename(['VV','VH']).copyProperties(img,img.propertyNames());});}
function fixedWater(img,vv,vh){return img.select('VV').lt(vv).and(img.select('VH').lt(vh)).and(terrain);}
var preCol=s1('2023-08-01','2023-09-15'),floodCol=s1('2023-10-01','2023-11-01'),flood=floodCol.median().clip(aoi);
var persistent=preCol.map(function(i){return fixedWater(i,-17,-23).unmask(0).toByte();}).mean().gte(0.25).or(jrc.gte(50));
function maskS2(img){var s=img.select('SCL');var clear=s.neq(3).and(s.neq(8)).and(s.neq(9)).and(s.neq(10)).and(s.neq(11));return img.updateMask(clear).select(['B3','B11']).multiply(0.0001);}
var s2=ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED').filterBounds(aoi).filterDate('2023-10-15','2023-11-01').filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE',20)).map(maskS2).median().clip(aoi);
var mndwi=s2.normalizedDifference(['B3','B11']);var valid=mndwi.mask().and(terrain).and(persistent.not());
var ref=mndwi.gt(0.20).rename('reference').toByte().updateMask(valid);

function otsu(hist){hist=ee.Dictionary(hist);var counts=ee.Array(hist.get('histogram')),means=ee.Array(hist.get('bucketMeans'));var size=means.length().get([0]);var total=counts.reduce(ee.Reducer.sum(),[0]).get([0]);var sum=means.multiply(counts).reduce(ee.Reducer.sum(),[0]).get([0]);var mean=sum.divide(total);var indices=ee.List.sequence(1,size);var bss=indices.map(function(i){i=ee.Number(i);var aCounts=counts.slice(0,0,i);var aCount=aCounts.reduce(ee.Reducer.sum(),[0]).get([0]);var aMeans=means.slice(0,0,i);var aMean=aMeans.multiply(aCounts).reduce(ee.Reducer.sum(),[0]).get([0]).divide(aCount);var bCount=total.subtract(aCount);var bMean=sum.subtract(aCount.multiply(aMean)).divide(bCount);return aCount.multiply(aMean.subtract(mean).pow(2)).add(bCount.multiply(bMean.subtract(mean).pow(2)));});return means.sort(bss).get([-1]);}
function getOtsu(band){var h=flood.select(band).updateMask(valid).reduceRegion({reducer:ee.Reducer.histogram({maxBuckets:256,minBucketWidth:0.05}),geometry:aoi,scale:10,maxPixels:1e13,tileScale:8}).get(band);return ee.Number(otsu(h));}
var otsuVV=getOtsu('VV'),otsuVH=getOtsu('VH');print('Derived Otsu VV',otsuVV,'Derived Otsu VH',otsuVH);

// Freeze one balanced reference sample and evaluate every method on exactly these locations.
var sample=ref.stratifiedSample({numPoints:300,classBand:'reference',region:aoi,scale:10,classValues:[0,1],classPoints:[300,300],seed:2023,geometries:true,tileScale:4});
function areaKm2(mask){return ee.Image.pixelArea().divide(1e6).updateMask(mask).reduceRegion({reducer:ee.Reducer.sum(),geometry:aoi,scale:10,maxPixels:1e13,tileScale:4}).values().get(0);}
function evaluate(name,mask,vv,vh){mask=mask.and(persistent.not()).rename('prediction').toByte().updateMask(valid);var pts=mask.sampleRegions({collection:sample,properties:['reference'],scale:10,geometries:false,tileScale:4});
 var cm=pts.errorMatrix('reference','prediction',[0,1]);var arr=ee.Array(cm.array());var tn=arr.get([0,0]),fp=arr.get([0,1]),fn=arr.get([1,0]),tp=arr.get([1,1]);var precision=ee.Number(tp).divide(ee.Number(tp).add(fp));var recall=ee.Number(tp).divide(ee.Number(tp).add(fn));var f1=precision.multiply(recall).multiply(2).divide(precision.add(recall));
 return ee.Feature(null,{method:name,vv_threshold_db:vv,vh_threshold_db:vh,temporary_water_km2:areaKm2(mask),TP:tp,TN:tn,FP:fp,FN:fn,overall_accuracy:cm.accuracy(),kappa:cm.kappa(),precision:precision,recall:recall,f1:f1,f1_pct:f1.multiply(100)});}
var results=ee.FeatureCollection([evaluate('Otsu VV',flood.select('VV').lt(otsuVV).and(terrain),otsuVV,null),evaluate('Otsu VH',flood.select('VH').lt(otsuVH).and(terrain),null,otsuVH)]);
[-24,-23,-22].forEach(function(vh){[-18,-17,-16].forEach(function(vv){results=results.merge(ee.FeatureCollection([evaluate('Fixed dual polarisation',fixedWater(flood,vv,vh),vv,vh)]));});});
print('Benchmark and sensitivity results',results);
Export.table.toDrive({collection:results,description:'LV_S1_Method_Benchmark_and_Sensitivity_REPRODUCED',folder:FOLDER,fileNamePrefix:'LV_S1_Method_Benchmark_and_Sensitivity_REPRODUCED',fileFormat:'CSV'});
Export.table.toDrive({collection:sample,description:'LV_S2_Balanced_Reference_Sample_600',folder:FOLDER,fileNamePrefix:'LV_S2_Balanced_Reference_Sample_600',fileFormat:'CSV'});
