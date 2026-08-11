# 02 — Plot the genuinely reproduced GEE method benchmark and threshold sensitivity
from pathlib import Path
import pandas as pd
import matplotlib.pyplot as plt
ROOT=Path('/content/drive/MyDrive/Lower_Volta_Final_Exports') if Path('/content/drive').exists() else Path('data/exports')
OUT=Path('outputs');OUT.mkdir(exist_ok=True)
p=ROOT/'LV_S1_Method_Benchmark_and_Sensitivity_REPRODUCED.csv'
if not p.exists(): raise FileNotFoundError(f'Missing {p}; run gee/05_method_benchmark_and_threshold_sensitivity.js first.')
d=pd.read_csv(p)
required={'method','vv_threshold_db','vh_threshold_db','temporary_water_km2','f1_pct'}
if not required.issubset(d.columns): raise ValueError(f'Benchmark CSV lacks columns: {sorted(required-set(d.columns))}')
otsu=d[d['method'].isin(['Otsu VV','Otsu VH'])].copy()
base=d[(d['method']=='Fixed dual polarisation') & (d['vv_threshold_db']==-17) & (d['vh_threshold_db']==-23)].copy()
benchmark=pd.concat([otsu,base],ignore_index=True);benchmark.to_csv(OUT/'Table3_method_benchmark_REPRODUCED.csv',index=False)
fixed=d[d['method']=='Fixed dual polarisation'].copy();matrix=fixed.pivot(index='vh_threshold_db',columns='vv_threshold_db',values='f1_pct').sort_index().sort_index(axis=1);matrix.to_csv(OUT/'Supplementary_threshold_sensitivity_REPRODUCED.csv')
fig,ax=plt.subplots(figsize=(6,5));bars=ax.bar(benchmark['method'],benchmark['f1_pct']);ax.set_ylabel('F1-score (%)');ax.set_ylim(0,100);ax.tick_params(axis='x',rotation=20);ax.grid(axis='y',alpha=.25)
for b,v in zip(bars,benchmark['f1_pct']): ax.text(b.get_x()+b.get_width()/2,v+1,f'{v:.1f}',ha='center')
fig.tight_layout();fig.savefig(OUT/'Figure5a_method_benchmark_REPRODUCED.png',dpi=600,bbox_inches='tight');plt.close(fig)
fig,ax=plt.subplots(figsize=(6,5));im=ax.imshow(matrix.values,aspect='auto');ax.set_xticks(range(len(matrix.columns)),[int(x) for x in matrix.columns]);ax.set_yticks(range(len(matrix.index)),[int(x) for x in matrix.index]);ax.set_xlabel('VV threshold (dB)');ax.set_ylabel('VH threshold (dB)')
for i in range(matrix.shape[0]):
 for j in range(matrix.shape[1]): ax.text(j,i,f'{matrix.iloc[i,j]:.1f}',ha='center',va='center')
fig.colorbar(im,ax=ax,label='F1-score (%)');fig.tight_layout();fig.savefig(OUT/'Figure5b_threshold_sensitivity_REPRODUCED.png',dpi=600,bbox_inches='tight');plt.close(fig)
print(benchmark[['method','vv_threshold_db','vh_threshold_db','temporary_water_km2','f1_pct']].to_string(index=False));print(matrix)
