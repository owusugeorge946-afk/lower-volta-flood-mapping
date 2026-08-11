# 04 — Sentinel-1 / Sentinel-2 inter-sensor agreement
from pathlib import Path
import pandas as pd
from sklearn.metrics import confusion_matrix

ROOT = Path('/content/drive/MyDrive/Lower_Volta_Final_Exports') if Path('/content/drive').exists() else Path('data/exports')
OUT=Path('outputs'); OUT.mkdir(exist_ok=True)
p=ROOT/'LV_S1_S2_600_Point_Comparison.csv'
if not p.exists():
    raise FileNotFoundError(f'Missing {p}. Run corrected GEE script 03 and export the actual 600-point comparison CSV. Archived manuscript counts are intentionally NOT substituted.')
d=pd.read_csv(p)
required={'s2_class','s1_class'}
if not required.issubset(d.columns): raise ValueError(f'{p} must contain {sorted(required)}')
d=d.dropna(subset=['s2_class','s1_class'])
if len(d)!=600: raise ValueError(f'Expected 600 valid comparison samples; found {len(d)}.')
tn,fp,fn,tp=confusion_matrix(d['s2_class'].astype(int),d['s1_class'].astype(int),labels=[0,1]).ravel()
n=tp+tn+fp+fn; oa=(tp+tn)/n; precision=tp/(tp+fp); recall=tp/(tp+fn); specificity=tn/(tn+fp)
f1=2*precision*recall/(precision+recall); omission=fn/(tp+fn); commission=fp/(tp+fp)
nonf_prod=tn/(tn+fp); nonf_user=tn/(tn+fn); nonf_omission=fp/(tn+fp); nonf_commission=fn/(tn+fn)
pe=((tp+fn)/n)*((tp+fp)/n)+((tn+fp)/n)*((tn+fn)/n); kappa=(oa-pe)/(1-pe)
metrics=pd.DataFrame({'metric':['TP','TN','FP','FN','Total samples','Overall agreement (%)','Flood precision (%)','Flood recall (%)','Flood specificity (%)','Flood F1-score (%)','Flood omission error (%)','Flood commission error (%)','Non-flood producer agreement (%)','Non-flood user agreement (%)','Non-flood omission error (%)','Non-flood commission error (%)','Cohen kappa'],'value':[tp,tn,fp,fn,n,oa*100,precision*100,recall*100,specificity*100,f1*100,omission*100,commission*100,nonf_prod*100,nonf_user*100,nonf_omission*100,nonf_commission*100,kappa]})
metrics.to_csv(OUT/'Table5_inter_sensor_metrics.csv',index=False); print(metrics.to_string(index=False))
