# Local Dataset Instructions

The WTMC2021 improved/regenerated CICIDS2017 flow-based dataset is intentionally not stored in GitHub because the raw CSV files are large.

## Dataset source

Download or obtain the dataset from the WTMC2021 project. Keep the original WTMC2021 labels unchanged during analysis and preparation.

## Local placement

Place the raw CSV files locally in:

```text
Network-Anomaly-Detection-and-Predictive-Intrusion-Monitoring-Platform/CICIDS2017_improved/
```

The current notebook is configured to discover CSV files in that directory. You can change `DATA_PATH` in the configuration cell if your local copy is stored elsewhere. The notebook does not download, commit, or upload the raw dataset.

## Generated output

The notebook writes the cleaned dataset to `data/processed/WTMC2021_CICIDS2017_cleaned.csv` when the save cell is run. This output is also intended to remain local unless a later project decision specifies otherwise.
