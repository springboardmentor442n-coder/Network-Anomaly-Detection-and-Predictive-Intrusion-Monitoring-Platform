"""Train three UNSW-NB15 multiclass pipelines from local CSV files.
Expected inputs: backend/data/UNSW_NB15_training-set.csv and
backend/data/UNSW_NB15_testing-set.csv. The target can be attack_cat, Attack Type,
Label, label, or target, and must exist in both files. Keep test set separate.
"""
from pathlib import Path
import json
import warnings
import joblib
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestClassifier, ExtraTreesClassifier
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, classification_report
from sklearn.preprocessing import LabelEncoder
from sklearn.base import clone

ROOT=Path(__file__).resolve().parent
DATA=ROOT/'data'; ART=ROOT/'artifacts'; ART.mkdir(exist_ok=True)
TRAIN=DATA/'UNSW_NB15_training-set.csv'; TEST=DATA/'UNSW_NB15_testing-set.csv'
if not TRAIN.exists() or not TEST.exists():
    raise SystemExit('Missing CSVs. Put UNSW_NB15_training-set.csv and UNSW_NB15_testing-set.csv in backend/data/.')
train=pd.read_csv(TRAIN, low_memory=False); test=pd.read_csv(TEST, low_memory=False)
TARGET = next((name for name in ['attack_cat', 'Attack Type', 'Label', 'label', 'target'] if name in train.columns and name in test.columns), None)
if TARGET is None:
    raise SystemExit('Could not find a shared target column. Expected attack_cat, Attack Type, Label, label, or target in BOTH CSVs.')
for df in (train,test):
    df[TARGET]=df[TARGET].fillna('Normal').astype(str).str.strip().replace({'':'Normal','nan':'Normal','None':'Normal'})
    if 'id' in df.columns: df.drop(columns=['id'], inplace=True)
target_names = {'attack_cat', 'Attack Type', 'Label', 'label', 'target', 'Binary_Target', 'binary_target', 'id'}
features=[c for c in train.columns if c not in target_names]
missing=set(features)-set(test.columns)
if missing: raise SystemExit(f'Test CSV is missing feature columns: {sorted(missing)}')
X_train=train[features].copy(); X_test=test[features].copy(); y_train=train[TARGET]; y_test=test[TARGET]
# Convert numeric-looking columns consistently; true categoricals are one-hot encoded.
for c in features:
    if X_train[c].dtype == 'object':
        a=pd.to_numeric(X_train[c], errors='coerce'); b=pd.to_numeric(X_test[c], errors='coerce')
        if a.notna().mean() > 0.95:
            X_train[c]=a; X_test[c]=b
numeric=[c for c in features if pd.api.types.is_numeric_dtype(X_train[c])]
categorical=[c for c in features if c not in numeric]
preprocess=ColumnTransformer([
 ('num',Pipeline([('imputer',SimpleImputer(strategy='median')),('scale',StandardScaler())]),numeric),
 ('cat',Pipeline([('imputer',SimpleImputer(strategy='most_frequent')),('onehot',OneHotEncoder(handle_unknown='ignore'))]),categorical)
], remainder='drop')
models={'random_forest':RandomForestClassifier(n_estimators=250,random_state=42,n_jobs=-1,class_weight='balanced_subsample'), 'extra_trees':ExtraTreesClassifier(n_estimators=250,random_state=42,n_jobs=-1,class_weight='balanced')}
try:
    from xgboost import XGBClassifier
    models['xgboost']=XGBClassifier(n_estimators=300,max_depth=8,learning_rate=.05,subsample=.8,colsample_bytree=.8,objective='multi:softprob',eval_metric='mlogloss',random_state=42,n_jobs=-1,tree_method='hist')
except ImportError:
    warnings.warn('xgboost is not installed; skipping XGBoost. Install it with pip install xgboost.')
# XGBoost requires integer class labels; all estimators use a consistent label encoder.
encoder=LabelEncoder(); ytr=encoder.fit_transform(y_train); yte=encoder.transform(y_test) if set(y_test).issubset(set(encoder.classes_)) else None
if yte is None: raise SystemExit('Test CSV contains attack_cat labels not present in training CSV.')
metrics={}
for name,estimator in models.items():
    pipe=Pipeline([('preprocess',clone(preprocess)),('model',estimator)])
    pipe.fit(X_train, ytr)
    pred=pipe.predict(X_test)
    acc=float(accuracy_score(yte,pred)); p,r,f,_=precision_recall_fscore_support(yte,pred,average='weighted',zero_division=0)
    out=ART/f'{name}.joblib'; joblib.dump(pipe,out)
    metrics[name]={'accuracy':round(acc,4),'weighted_precision':round(float(p),4),'weighted_recall':round(float(r),4),'weighted_f1':round(float(f),4),'artifact':out.name}
    print(f'{name}: accuracy={acc:.4f}, weighted_f1={f:.4f}; saved {out}')
(ART/'feature_columns.json').write_text(json.dumps(features,indent=2),encoding='utf-8')
(ART/'label_classes.json').write_text(json.dumps(encoder.classes_.tolist(),indent=2),encoding='utf-8')
(ART/'target_column.json').write_text(json.dumps({'name': TARGET, 'binary_numeric_labels': TARGET.lower() == 'label' and set(map(str, encoder.classes_)).issubset({'0','1'})}, indent=2),encoding='utf-8')
(ART/'metrics.json').write_text(json.dumps(metrics,indent=2),encoding='utf-8')
print('\nSaved artifacts and metrics in',ART)
print('Important: the frontend does not automatically upload or stream a dataset. Use POST /api/predict or extend a CSV replay endpoint after confirming the CSV schema.')
