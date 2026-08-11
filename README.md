# Lower Volta Basin Flood Mapping (2023)

Reproducibility code for **Cloud-Independent Flood Mapping and Surface Water Dynamics Using Sentinel-1 SAR in the Lower Volta Basin, Ghana**.

## Repository structure
- `gee/`: Google Earth Engine JavaScript workflows.
- `colab/`: Google Colab/Python post-processing, statistics, tables, and figures.
- `data/`: expected Earth Engine exports.
- `outputs/`: generated tables and figures.

## Final manuscript configuration
- Study area: `projects/nana-469713/assets/lower_volta`
- Dry season: 2023-01-01 to 2023-02-28
- Wet season: 2023-06-01 to 2023-07-31
- Pre-flood: 2023-08-01 to 2023-09-14
- Flood period: 2023-10-01 to 2023-10-31
- Sentinel-1 water rule: VV < -17 dB AND VH < -23 dB
- Terrain mask: slope <= 8 degrees
- Persistent/pre-existing water: pre-flood water frequency >=25% OR JRC GSW occurrence >=50%
- Recurrent inundation: >25% of valid flood observations; with nine observations, >=3 detections
- Backscatter-change classes: strong <=-2 dB; moderate (-2,-1] dB; stable (-1,1) dB; increase >=1 dB
- Sentinel-2 comparison: 2023-10-15 to 2023-10-31; scene cloud <20%; MNDWI >0.20
- Sentinel-2 sensitivity: 0.10, 0.20, 0.30
- Sentinel-1 sensitivity: VV {-18,-17,-16} dB x VH {-24,-23,-22} dB

## Run order
1. Run `gee/01_preprocessing_and_flood_products.js`.
2. Run `gee/02_frequency_backscatter_terrain.js`.
3. Run `gee/03_hydroclimate_exposure_s2.js`.
4. Run `gee/04_metadata_exports.js`.
5. Start Earth Engine export tasks and place/download the CSV outputs into `data/exports/` or Google Drive.
6. Run `colab/Lower_Volta_Final_Analysis.ipynb`.

## Frozen manuscript checks
Study area 8,938.927 km²; event temporary flood 5.868 km²; cumulative flood 7.386 km²; recurrent 4.487 km²; sporadic 2.899 km²; surface-change zone 2,032.146 km². Final inter-sensor counts: TP=278, TN=297, FP=3, FN=22.

Earth Engine catalogues can change as new scenes are added. Archive the acquisition metadata from `gee/04_metadata_exports.js` with the repository.
