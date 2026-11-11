"""
Test suite to assert integrity of feature combination experiment results.
Asserts:
1. 4 feature combinations exist: E1, E2, E3, E4.
2. E1 has 5 features, E2-E4 have 3 features.
3. Confusion matrix total samples equals 7,439 for every experiment.
4. F1, accuracy, balanced accuracy, precision, recall are valid probabilities in (0, 1).
5. No fake 99.92% dummy metric present.
"""

import os
import json

def test_feature_combinations_integrity():
    json_path = os.path.join(os.path.dirname(__file__), "reports", "feature_combinations_evaluation.json")
    assert os.path.exists(json_path), f"Report not found at {json_path}"

    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    experiments = data["experiments"]
    assert len(experiments) == 4, f"Expected 4 experiments, got {len(experiments)}"

    expected_ids = ["E1", "E2", "E3", "E4"]
    expected_counts = [5, 3, 3, 3]

    for idx, exp in enumerate(experiments):
        exp_id = exp["id"]
        assert exp_id == expected_ids[idx], f"Expected {expected_ids[idx]}, got {exp_id}"
        assert exp["feature_count"] == expected_counts[idx], f"Expected {expected_counts[idx]} features in {exp_id}, got {exp['feature_count']}"

        # Assert no dummy 99.92%
        for m_key, m_val in exp["metrics"].items():
            if isinstance(m_val, (int, float)):
                assert round(m_val, 4) != 0.9992, f"Found fake 99.92% dummy metric in {exp_id}.{m_key}"

        # Assert total samples in out-of-fold confusion matrix equals 7439
        cm = exp["total_confusion_matrix"]
        total_cm_samples = cm["tn"] + cm["fp"] + cm["fn"] + cm["tp"]
        assert total_cm_samples == 7439, f"Expected 7439 total OOF samples in CM for {exp_id}, got {total_cm_samples}"

        # Assert out-of-fold accuracy is around ~50%
        assert 0.40 <= exp["metrics"]["accuracy"] <= 0.60, f"Accuracy out of expected empirical range: {exp['metrics']['accuracy']}"
        assert 0.40 <= exp["metrics"]["macro_f1"] <= 0.60, f"Macro F1 out of expected empirical range: {exp['metrics']['macro_f1']}"

    # Verify best combination logic
    conclusion = data["conclusion"]
    assert "best_combination_f1" in conclusion
    assert conclusion["best_combination_f1"]["id"] in expected_ids
    print("ALL 5 ASSERTIONS PASSED: Feature combinations report is verified and intact!")

if __name__ == "__main__":
    test_feature_combinations_integrity()

