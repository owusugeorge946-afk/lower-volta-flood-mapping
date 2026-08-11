# 02 — Diagnostic method benchmark and threshold sensitivity figure
#
# The manuscript's F1 benchmark and 3x3 F1 matrix are archived outputs from the
# diagnostic comparison analysis. They are intentionally read from versioned
# repository CSV files instead of being silently recreated from a new random
# sample. GEE script 05 independently recomputes Otsu thresholds, mapped areas,
# and the threshold prediction stack from the satellite imagery.

from pathlib import Path
import pandas as pd
import matplotlib.pyplot as plt

OUT = Path('outputs')
OUT.mkdir(exist_ok=True)

# Resolve repository root whether the script is run from repo root or colab/.
HERE = Path.cwd()
if (HERE / 'data' / 'archived').exists():
    REPO = HERE
elif (HERE.parent / 'data' / 'archived').exists():
    REPO = HERE.parent
else:
    raise FileNotFoundError('Could not locate data/archived in the repository.')

benchmark_path = REPO / 'data' / 'archived' / 'LV_Diagnostic_Benchmark_Metrics.csv'
sensitivity_path = REPO / 'data' / 'archived' / 'LV_S1_Threshold_F1_Sensitivity.csv'

benchmark = pd.read_csv(benchmark_path)
sensitivity = pd.read_csv(sensitivity_path)

benchmark.to_csv(OUT / 'Table3_method_benchmark_archived.csv', index=False)
sensitivity.to_csv(OUT / 'Supplementary_threshold_sensitivity_archived.csv', index=False)

# Figure 5a
fig, ax = plt.subplots(figsize=(6, 5))
bars = ax.bar(benchmark['method'], benchmark['f1_pct'])
ax.set_ylabel('F1-score (%)')
ax.set_ylim(50, 100)
ax.set_title('(a)', loc='left', fontweight='bold')
ax.tick_params(axis='x', rotation=20)
ax.grid(axis='y', alpha=0.25)
for bar, value in zip(bars, benchmark['f1_pct']):
    ax.text(bar.get_x() + bar.get_width()/2, value + 1, f'{value:.1f}',
            ha='center', fontweight='bold')
fig.tight_layout()
fig.savefig(OUT / 'Figure5a_method_benchmark.png', dpi=600, bbox_inches='tight')
plt.close(fig)

# Figure 5b
matrix = sensitivity.set_index('vh_threshold_db')[['vv_-18', 'vv_-17', 'vv_-16']]
fig, ax = plt.subplots(figsize=(6, 5))
im = ax.imshow(matrix.values, vmin=60, vmax=80, aspect='auto')
ax.set_xticks(range(3), ['-18', '-17', '-16'])
ax.set_yticks(range(3), [str(int(x)) for x in matrix.index])
ax.set_xlabel('VV threshold (dB)')
ax.set_ylabel('VH threshold (dB)')
ax.set_title('(b)', loc='left', fontweight='bold')
for i in range(matrix.shape[0]):
    for j in range(matrix.shape[1]):
        ax.text(j, i, f'{matrix.iloc[i, j]:.1f}', ha='center', va='center',
                fontweight='bold')
cb = fig.colorbar(im, ax=ax)
cb.set_label('F1-score (%)')
fig.tight_layout()
fig.savefig(OUT / 'Figure5b_threshold_sensitivity.png', dpi=600, bbox_inches='tight')
plt.close(fig)

print('Archived diagnostic method benchmark:')
print(benchmark.to_string(index=False))
print('\nArchived F1 sensitivity matrix:')
print(matrix)
