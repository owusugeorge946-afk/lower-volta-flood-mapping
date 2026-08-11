# Lower Volta Basin Flood Mapping (2023) — corrected reproducibility package

Reproducibility code for **Cloud-Independent Flood Mapping and Surface Water Dynamics Using Sentinel-1 SAR in the Lower Volta Basin, Ghana**.

## Reproducibility corrections incorporated
- Sentinel-1 is explicitly restricted to `resolution_meters = 10`, in addition to IW and VV/VH filtering.
- ERA5-Land hydro-climatic analysis uses **total runoff** (`runoff_sum`), converted from metres to millimetres.
- Hydro-climatic correlations are frozen to the four manuscript dates: **4, 11, 16 and 23 October 2023**.
- GHSL 2020 uses the explicit image `JRC/GHSL/P2023A/GHS_BUILT_S/2020`.
- Sentinel-2 cloud/no-data pixels retain their mask and are excluded from inter-sensor sampling; they are not converted to non-flood.
- Agreement statistics require the actual exported 600-point CSV. No archived confusion counts are substituted.
- Method benchmarking and the 3×3 VV/VH sensitivity grid are recomputed in Earth Engine by `gee/05_method_benchmark_and_threshold_sensitivity.js`; the Python script only tabulates/plots the exported results.
- Acquisition metadata exports include exact Sentinel-1 image IDs and a `manuscript_hydro_date` flag so the nine flood-period scenes and four hydro-climatic observations can be archived.

## Frozen principal configuration
- Study area: `projects/nana-469713/assets/lower_volta`
- Dry season: 2023-01-01 to 2023-02-28
- Wet season: 2023-06-01 to 2023-07-31
- Pre-flood: 2023-08-01 to 2023-09-14
- Flood period: 2023-10-01 to 2023-10-31
- Sentinel-1: GRD, IW, VV+VH, 10 m
- Principal water rule: VV < -17 dB AND VH < -23 dB
- Terrain mask: slope <= 8 degrees
- Persistent/pre-existing water: pre-flood water frequency >=25% OR JRC GSW occurrence >=50%
- Recurrent inundation: >25% of valid flood observations
- Sentinel-2 comparison: 2023-10-15 to 2023-10-31; scene cloud <20%; MNDWI >0.20
- Sentinel-2 sensitivity: 0.10, 0.20, 0.30
- Sentinel-1 sensitivity: VV {-18,-17,-16} dB × VH {-24,-23,-22} dB

## Run order
1. `gee/01_preprocessing_and_flood_products.js`
2. `gee/02_frequency_backscatter_terrain.js`
3. `gee/03_hydroclimate_exposure_s2.js`
4. `gee/04_metadata_exports.js`
5. `gee/05_method_benchmark_and_threshold_sensitivity.js`
6. Start all Earth Engine exports and place CSV files in `data/exports/` (or use the matching Google Drive folder in Colab).
7. Run the Python/Colab analysis scripts. `02_threshold_benchmark.py` and `04_agreement_metrics.py` deliberately stop if their underlying exported CSVs are absent.

## Important verification step
Earth Engine catalogues and sampling masks can change the reproduced numerical outputs. Before manuscript submission, compare the newly exported benchmark, sensitivity, hydro-climatic, and 600-point agreement tables against the frozen manuscript results. Do **not** overwrite a discrepancy with hard-coded manuscript values; investigate it and archive the exact acquisition metadata and exported comparison sample.

## Diagnostic benchmark provenance

The manuscript contains two distinct comparison analyses and they must not be conflated:

1. **Final 600-point inter-sensor agreement** — reproduced from the actual exported `LV_S1_S2_600_Point_Comparison.csv` using `colab/04_agreement_metrics.py`. The script fails if the 600-point file is absent; it does not substitute manuscript values.
2. **Diagnostic Otsu / fixed-threshold benchmark** — the versioned manuscript benchmark metrics and the 3x3 F1 sensitivity matrix are stored under `data/archived/`. GEE script 05 regenerates Otsu thresholds, mapped areas, and the threshold prediction stack from imagery, but it does not create a new random sample and mislabel it as the archived diagnostic benchmark.

This separation preserves the distinction made in the manuscript between the diagnostic method-comparison results and the final Sentinel-1/Sentinel-2 inter-sensor agreement statistics.

## Public code and data availability

Repository: `https://github.com/owusugeorge946-afk/lower-volta-flood-mapping`

Large processed rasters and the study-area boundary may remain outside GitHub because of file-size and Earth Engine asset constraints; the code, configuration, metadata-export workflow, and archived diagnostic numerical outputs are included here.
