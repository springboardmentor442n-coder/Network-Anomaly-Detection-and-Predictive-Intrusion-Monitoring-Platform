from backend.app.core.config import settings
from backend.app.ml.training import train_models


if __name__ == "__main__":
    result = train_models(settings.data_root, settings.model_root)
    print(f"Trained on {result['sample_rows']:,} rows; macro F1={result['metrics']['f1_macro']:.4f}")
