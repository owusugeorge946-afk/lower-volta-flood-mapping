# 03 — Hydro-climatic correlations
from pathlib import Path
import pandas as pd
from scipy.stats import pearsonr, spearmanr

ROOT = Path('/content/drive/MyDrive/Lower_Volta_Final_Exports') if Path('/content/drive').exists() else Path('data/exports')
OUT=Path('outputs'); OUT.mkdir(exist_ok=True)
p=ROOT/'LV_Hydroclimate_Per_Observation.csv'
if not p.exists():
    raise FileNotFoundError(f'Missing {p}; run GEE script 03 first.')
df=pd.read_csv(p)
rows=[]
for prefix,label in [('rain_','CHIRPS rainfall'),('runoff_','ERA5-Land runoff')]:
    for d in [1,3,7,14,30]:
        c=f'{prefix}{d}d_mm'
        if c not in df.columns: continue
        x=df[['temporary_flood_km2',c]].dropna()
        if len(x)<3: continue
        pr,pp=pearsonr(x['temporary_flood_km2'],x[c])
        sr,sp=spearmanr(x['temporary_flood_km2'],x[c])
        rows.append({'variable':label,'window_days':d,'n':len(x),
                     'pearson_r':pr,'pearson_p':pp,'spearman_rho':sr,'spearman_p':sp})
corr=pd.DataFrame(rows)
corr.to_csv(OUT/'Supplementary_Table_S3_hydroclimatic_correlations.csv',index=False)
print(corr.to_string(index=False))
