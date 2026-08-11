# 01 — Environment and configuration
from pathlib import Path
import numpy as np
import pandas as pd

try:
    from google.colab import drive
    drive.mount('/content/drive')
    ROOT = Path('/content/drive/MyDrive/Lower_Volta_Final_Exports')
except Exception:
    ROOT = Path('data/exports')

OUT = Path('outputs')
OUT.mkdir(parents=True, exist_ok=True)

EXPECTED = {
    'study_area_km2': 8938.927,
    'event_temporary_km2': 5.868,
    'cumulative_km2': 7.386,
    'recurrent_km2': 4.487,
    'sporadic_km2': 2.899,
    'surface_change_km2': 2032.146,
    'TP': 278, 'TN': 297, 'FP': 3, 'FN': 22
}
print('Input:', ROOT)
print('Output:', OUT)
