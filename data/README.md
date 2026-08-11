# Data and exported-analysis files

Earth Engine CSV/GeoTIFF exports may be placed in `data/exports/` when running locally.
Large raster exports are excluded from Git by `.gitignore`.

## Expected Earth Engine CSV exports

- `LV_Core_Area_Summary.csv`
- `LV_Per_Observation_Flood_Area.csv`
- `LV_Frequency_Change_Area_Summary.csv`
- `LV_Terrain_Statistics.csv`
- `LV_Hydroclimate_Per_Observation.csv`
- `LV_CHIRPS_Monthly_2023.csv`
- `LV_WorldCover_Exposure.csv`
- `LV_GHSL_Built_Exposure.csv`
- `LV_MNDWI_Sensitivity.csv`
- `LV_S1_S2_600_Point_Comparison.csv`
- `LV_Sentinel1_Acquisition_Metadata.csv`
- `LV_Sentinel2_Acquisition_Metadata.csv`
- `LV_S1_Otsu_and_Threshold_Area_Diagnostics.csv`

## Archived diagnostic outputs

`data/archived/` contains the versioned numerical outputs used for the manuscript's diagnostic method benchmark and the 3x3 Sentinel-1 F1 threshold-sensitivity matrix. These are kept separate from the final 600-point Sentinel-1/Sentinel-2 inter-sensor agreement analysis.

GEE script `05_method_benchmark_and_threshold_sensitivity.js` independently regenerates the Otsu thresholds, mapped areas, and threshold-classification stack from the imagery. It does not silently create a new random comparison sample and present it as the archived diagnostic benchmark.
