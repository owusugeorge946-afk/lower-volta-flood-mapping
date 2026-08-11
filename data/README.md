# Exported data required for full reproduction

Place Earth Engine CSV exports here when running locally. At minimum, preserve:
- `LV_Sentinel1_Acquisition_Metadata.csv` — exact S1 IDs used by each analysis window.
- `LV_Sentinel2_Acquisition_Metadata.csv` — exact optical comparison scenes.
- `LV_Hydroclimate_Per_Observation.csv` — must contain the four manuscript dates only.
- `LV_S1_S2_600_Point_Comparison.csv` — actual valid-optical 600-point sample used for agreement metrics.
- `LV_S1_Method_Benchmark_and_Sensitivity_REPRODUCED.csv` — recomputed Otsu and 3×3 threshold results.
- `LV_S2_Balanced_Reference_Sample_600.csv` — frozen benchmark reference points.

Do not commit fabricated or manually reconstructed CSVs as if they were Earth Engine exports.
