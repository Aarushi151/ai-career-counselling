"""
train_model.py
Trains a Decision Tree classifier on the Prakriti dataset and saves the model.
Run: python train_model.py
"""

import pandas as pd
import numpy as np
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import classification_report, accuracy_score
import pickle
import json

# ── Load ──────────────────────────────────────────────────────────────────────
df = pd.read_csv("Updated_Prakriti_With_Features.csv")
print("Dataset shape:", df.shape)
print("Dosha distribution:\n", df["Dosha"].value_counts())

# ── Features & Target ─────────────────────────────────────────────────────────
FEATURE_COLS = [c for c in df.columns if c != "Dosha"]
TARGET_COL = "Dosha"

# Encode all categorical columns
encoders = {}
df_enc = df.copy()
for col in df_enc.columns:
    le = LabelEncoder()
    df_enc[col] = le.fit_transform(df_enc[col].astype(str))
    encoders[col] = le

X = df_enc[FEATURE_COLS].values
y = df_enc[TARGET_COL].values

# ── Train / Test split ────────────────────────────────────────────────────────
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

# ── Random Forest (better accuracy than single DT) ────────────────────────────
clf = RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42)
clf.fit(X_train, y_train)

y_pred = clf.predict(X_test)
acc = accuracy_score(y_test, y_pred)
print(f"\nTest Accuracy: {acc:.4f}")
print(classification_report(y_test, y_pred,
      target_names=encoders[TARGET_COL].classes_))

cv_scores = cross_val_score(clf, X, y, cv=5)
print(f"5-Fold CV Accuracy: {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")

# ── Save artefacts ────────────────────────────────────────────────────────────
with open("model.pkl", "wb") as f:
    pickle.dump(clf, f)

with open("encoders.pkl", "wb") as f:
    pickle.dump(encoders, f)

# Save feature order and label classes for the frontend
meta = {
    "feature_cols": FEATURE_COLS,
    "dosha_classes": encoders[TARGET_COL].classes_.tolist(),
    "column_options": {
        col: encoders[col].classes_.tolist()
        for col in FEATURE_COLS
    }
}
with open("model_meta.json", "w") as f:
    json.dump(meta, f, indent=2)

print("\n✅ Saved: model.pkl, encoders.pkl, model_meta.json")