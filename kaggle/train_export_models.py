"""Run this script in a Kaggle Notebook to train and export NetShield-AI models.
It searches /kaggle/input recursively for standard UNSW-NB15 train/test CSV or parquet files.
"""
from pathlib import Path
import json, zipfile, warnings
import numpy as np
import pandas as pd
import joblib
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler, LabelEncoder
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestClassifier, ExtraTreesClassifier
from sklearn.metrics import accuracy_score, precision_recall_fscore_support
from sklearn.base import clone

INPUT = Path('/kaggle/input')
OUTPUT = Path('/kaggle/working/netshield_artifacts')
OUTPUT.mkdir(parents=True, exist_ok=True)

files = [p for p in INPUT.rglob('*') if p.is_file() and p.suffix.lower() in ('.csv', '.parquet')]
def choose(which):
    words = ('training-set', 'train') if which == 'train' else ('testing-set', 'test')
    candidates = [p for p in files if any(w in p.stem.lower() for w in words)]
    # Prefer conventional UNSW-NB15 split names, then parquet/CSV train-test filenames.
    candidates.sort(key=lambda p: (0 if 'unsw_nb15' in p.name.lower() else 1, 0 if p.suffix.lower()=='.parquet' else 1, len(str(p))))
    return candidates[0] if candidates else None
train_path, test_path = choose('train'), choose('test')
if not train_path or not test_path:
    raise SystemExit('Could not locate separate train and test CSV/parquet files under /kaggle/input. Attach a dataset with filenames containing train and test.')
def read(p):
    return pd.read_parquet(p) if p.suffix.lower()=='.parquet' else pd.read_csv(p, low_memory=False)
train, test = read(train_path), read(test_path)
print('Train:', train_path, train.shape, '| Test:', test_path, test.shape)
TARGET = next((c for c in ['attack_cat','Attack Type','Label','label','target'] if c in train.columns and c in test.columns), None)
if TARGET is None:
    raise SystemExit('Target column not found. Need attack_cat, Attack Type, Label, label, or target in both train and test.')
for df in (train, test):
    df[TARGET] = df[TARGET].fillna('Normal').astype(str).str.strip().replace({'':'Normal','nan':'Normal','None':'Normal'})
    if 'id' in df.columns: df.drop(columns=['id'], inplace=True)
targets = {'attack_cat','Attack Type','Label','label','target','Binary_Target','binary_target','id'}
features = [c for c in train.columns if c not in targets]
missing = set(features) - set(test.columns)
if missing: raise SystemExit('Test split is missing columns: '+str(sorted(missing)))
X_train, X_test = train[features].copy(), test[features].copy()
for c in features:
    if X_train[c].dtype == 'object':
        a, b = pd.to_numeric(X_train[c], errors='coerce'), pd.to_numeric(X_test[c], errors='coerce')
        if a.notna().mean() > .95: X_train[c], X_test[c] = a, b
numeric = [c for c in features if pd.api.types.is_numeric_dtype(X_train[c])]
categorical = [c for c in features if c not in numeric]
pre = ColumnTransformer([
 ('num', Pipeline([('imputer',SimpleImputer(strategy='median')),('scale',StandardScaler())]), numeric),
 ('cat', Pipeline([('imputer',SimpleImputer(strategy='most_frequent')),('onehot',OneHotEncoder(handle_unknown='ignore'))]), categorical)
], remainder='drop')
encoder = LabelEncoder(); y_train = encoder.fit_transform(train[TARGET])
try: y_test = encoder.transform(test[TARGET])
except ValueError: raise SystemExit('Test set has target classes not present in training set. Check the split.')
models = {
 'random_forest': RandomForestClassifier(n_estimators=250, random_state=42, n_jobs=-1, class_weight='balanced_subsample'),
 'extra_trees': ExtraTreesClassifier(n_estimators=250, random_state=42, n_jobs=-1, class_weight='balanced'),
}
try:
    from xgboost import XGBClassifier
    objective = 'binary:logistic' if len(encoder.classes_) == 2 else 'multi:softprob'
    params = dict(n_estimators=300, max_depth=8, learning_rate=.05, subsample=.8, colsample_bytree=.8, objective=objective, random_state=42, n_jobs=-1, tree_method='hist')
    params['eval_metric'] = 'logloss' if len(encoder.classes_) == 2 else 'mlogloss'
    if len(encoder.classes_) > 2: params['num_class'] = len(encoder.classes_)
    models['xgboost'] = XGBClassifier(**params)
except ImportError: warnings.warn('XGBoost missing; XGBoost artifact will not be exported.')
metrics = {}
for name, estimator in models.items():
    pipe = Pipeline([('preprocess', clone(pre)), ('model', estimator)])
    pipe.fit(X_train, y_train)
    pred = pipe.predict(X_test)
    precision, recall, f1, _ = precision_recall_fscore_support(y_test, pred, average='weighted', zero_division=0)
    acc = accuracy_score(y_test, pred)
    artifact = OUTPUT / f'{name}.joblib'; joblib.dump(pipe, artifact)
    metrics[name] = {'accuracy': round(float(acc),4), 'weighted_precision': round(float(precision),4), 'weighted_recall': round(float(recall),4), 'weighted_f1': round(float(f1),4), 'artifact': artifact.name}
    print(f'{name}: accuracy={acc:.4f}, weighted_f1={f1:.4f}; saved {artifact}')
(OUTPUT/'feature_columns.json').write_text(json.dumps(features, indent=2), encoding='utf-8')
(OUTPUT/'label_classes.json').write_text(json.dumps(encoder.classes_.tolist(), indent=2), encoding='utf-8')
(OUTPUT/'target_column.json').write_text(json.dumps({'name': TARGET, 'binary_numeric_labels': TARGET.lower() == 'label' and set(map(str, encoder.classes_)).issubset({'0','1'})}, indent=2), encoding='utf-8')
(OUTPUT/'metrics.json').write_text(json.dumps(metrics, indent=2), encoding='utf-8')
zip_path = Path('/kaggle/working/netshield_model_artifacts.zip')
with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as z:
    for p in OUTPUT.iterdir():
        if p.is_file(): z.write(p, arcname=p.name)
print('\nDONE. Download this file from the Kaggle Output panel:', zip_path)
print('Exported:', sorted(p.name for p in OUTPUT.iterdir() if p.is_file()))
