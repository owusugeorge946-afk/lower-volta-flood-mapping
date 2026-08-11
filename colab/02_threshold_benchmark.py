# 02 — Sentinel-1 method benchmark and threshold sensitivity
from pathlib import Path
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

OUT = Path('outputs'); OUT.mkdir(exist_ok=True)

benchmark = pd.DataFrame({
    'method':['Otsu VV','Otsu VH','Fixed dual polarisation'],
    'threshold':['-15.559 dB','-23.572 dB','VV < -17 dB; VH < -23 dB'],
    'temporary_water_km2':[7.676,7.129,5.868],
    'diagnostic_f1_pct':[75.7,74.3,70.7]
})
benchmark.to_csv(OUT/'Table3_method_benchmark.csv',index=False)

vv=[-18,-17,-16]; vh=[-24,-23,-22]
f1=np.array([[63.5,69.4,72.8],[64.1,70.7,74.3],[64.1,71.0,74.9]])
pd.DataFrame(f1,index=vh,columns=vv).to_csv(OUT/'Supplementary_Table_S2_threshold_sensitivity.csv')

fig,ax=plt.subplots(figsize=(6,5))
bars=ax.bar(benchmark['method'],benchmark['diagnostic_f1_pct'])
ax.set_ylabel('F1-score (%)'); ax.set_ylim(50,100); ax.set_title('(a)',loc='left',fontweight='bold')
ax.tick_params(axis='x',rotation=20); ax.grid(axis='y',alpha=.25)
for b,v in zip(bars,benchmark['diagnostic_f1_pct']):
    ax.text(b.get_x()+b.get_width()/2,v+1,f'{v:.1f}',ha='center',fontweight='bold')
fig.tight_layout(); fig.savefig(OUT/'Figure5a_method_benchmark.png',dpi=600,bbox_inches='tight'); plt.close(fig)

fig,ax=plt.subplots(figsize=(6,5))
im=ax.imshow(f1,vmin=60,vmax=80,aspect='auto')
ax.set_xticks(range(3),vv); ax.set_yticks(range(3),vh)
ax.set_xlabel('VV threshold (dB)'); ax.set_ylabel('VH threshold (dB)')
ax.set_title('(b)',loc='left',fontweight='bold')
for i in range(3):
    for j in range(3):
        ax.text(j,i,f'{f1[i,j]:.1f}',ha='center',va='center',fontweight='bold')
cb=fig.colorbar(im,ax=ax); cb.set_label('F1-score (%)')
fig.tight_layout(); fig.savefig(OUT/'Figure5b_threshold_sensitivity.png',dpi=600,bbox_inches='tight'); plt.close(fig)

print(benchmark)
