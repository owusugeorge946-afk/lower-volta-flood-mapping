# 05 — Consolidate tables from Earth Engine exports
from pathlib import Path
import pandas as pd

ROOT = Path('/content/drive/MyDrive/Lower_Volta_Final_Exports') if Path('/content/drive').exists() else Path('data/exports')
OUT=Path('outputs'); OUT.mkdir(exist_ok=True)

def load(name):
    p=ROOT/name
    if not p.exists():
        print('Missing:',p); return None
    return pd.read_csv(p)

core=load('LV_Core_Area_Summary.csv')
terrain=load('LV_Terrain_Statistics.csv')
wc=load('LV_WorldCover_Exposure.csv')
ghsl=load('LV_GHSL_Built_Exposure.csv')
mndwi=load('LV_MNDWI_Sensitivity.csv')
monthly=load('LV_CHIRPS_Monthly_2023.csv')

if core is not None: core.to_csv(OUT/'Table2_core_surface_water_results.csv',index=False)
if terrain is not None: terrain.to_csv(OUT/'Supplementary_Table_S4_terrain_statistics.csv',index=False)
if wc is not None:
    c=wc[wc['zone'].eq('Cumulative temporary flood')].copy()
    c['share_pct']=c['area_km2']/c['area_km2'].sum()*100
    c.sort_values('area_km2',ascending=False).to_csv(OUT/'Supplementary_Table_S5_WorldCover.csv',index=False)
if ghsl is not None:
    ghsl.to_csv(OUT/'GHSL_built_exposure_summary.csv',index=False)
if mndwi is not None: mndwi.to_csv(OUT/'Supplementary_Table_S6_MNDWI_sensitivity.csv',index=False)
if monthly is not None: monthly.sort_values('month').to_csv(OUT/'CHIRPS_monthly_2023.csv',index=False)

pd.DataFrame({
 'quantity':['Study area','Event temporary flood','Cumulative temporary flood','Recurrent temporary flood','Sporadic component','Surface-change zone'],
 'expected_km2':[8938.927,5.868,7.386,4.487,2.899,2032.146]
}).to_csv(OUT/'manuscript_expected_values.csv',index=False)
print('Final tables saved.')
