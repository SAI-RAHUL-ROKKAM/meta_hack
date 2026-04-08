"""
Bug Report Structuring Environment - Grading Logic

Deterministic grading of structured bug reports against ground truth.
Returns scores in [0.0, 1.0] with partial credit for each field.

Scoring dimensions:
  - title         (weight: 0.15) - keyword coverage in title
  - steps         (weight: 0.25) - completeness of reproduction steps
  - expected      (weight: 0.15) - expected behavior accuracy
  - actual        (weight: 0.15) - actual behavior accuracy
  - severity      (weight: 0.15) - severity classification correctness
  - environment   (weight: 0.10) - environment info extraction
  - format        (weight: 0.05) - structural completeness
"""

from typing import Dict, Tuple
from tasks import SEVERITY_ADJACENCY, SEVERITY_LEVELS

# Weights for each scoring dimension
FIELD_WEIGHTS = {
    "title": 0.15,
    "steps_to_reproduce": 0.25,
    "expected_behavior": 0.15,
    "actual_behavior": 0.15,
    "severity": 0.15,
    "environment": 0.10,
    "format": 0.05,
}


def _keyword_score(text: str, keywords: list) -> float:
    """
    Score text based on what fraction of keywords are found.
    Returns float in [0.0, 1.0].
    """
    if not text or not keywords:
        return 0.0

    text_lower = text.lower()
    matches = 0
    for kw in keywords:
        if isinstance(kw, str) and kw.lower() in text_lower:
            matches += 1

    return min(1.0, matches / max(len(keywords), 1))


def _severity_score(submitted: str, expected: str) -> float:
    """
    Score severity classification.
    Exact match = 1.0, adjacent = 0.5, wrong = 0.0.
    """
    submitted_clean = submitted.strip().lower()
    expected_clean = expected.strip().lower()

    if submitted_clean not in SEVERITY_LEVELS:
        return 0.0

    return SEVERITY_ADJACENCY.get(expected_clean, {}).get(submitted_clean, 0.0)


def _format_score(action: dict) -> float:
    """
    Score structural completeness of the submission.
    Checks that all required fields are non-empty.
    """
    required_fields = [
        "title", "steps_to_reproduce", "expected_behavior",
        "actual_behavior", "severity", "environment"
    ]
    present = 0
    for field in required_fields:
        value = action.get(field, "")
        if isinstance(value, str) and len(value.strip()) > 5:
            present += 1

    return present / len(required_fields)


def grade_submission(action: dict, task: dict) -> Tuple[float, Dict[str, float], str]:
    """
    Grade a structured bug report submission against the task's ground truth.

    Args:
        action: dict with keys: title, steps_to_reproduce, expected_behavior,
                actual_behavior, severity, environment, additional_notes
        task: task definition dict from tasks.py

    Returns:
        Tuple of (overall_score, field_scores_dict, feedback_text)
    """
    keywords = task["keywords"]
    ground_truth = task["ground_truth"]

    field_scores = {}
    feedback_parts = []

    # ── Title Score ────────────────────────────────────────────
    title = action.get("title", "")
    field_scores["title"] = _keyword_score(title, keywords["title"])
    if field_scores["title"] < 0.5:
        feedback_parts.append(
            f"Title needs improvement. Include key details: "
            f"the affected component and the nature of the problem."
        )
    elif field_scores["title"] < 1.0:
        feedback_parts.append("Title captures the main issue but could be more specific.")
    else:
        feedback_parts.append("Title is well-written and descriptive.")

    # ── Steps to Reproduce Score ──────────────────────────────
    steps = action.get("steps_to_reproduce", "")
    field_scores["steps_to_reproduce"] = _keyword_score(steps, keywords["steps_to_reproduce"])
    if field_scores["steps_to_reproduce"] < 0.4:
        feedback_parts.append(
            "Steps to reproduce are incomplete. Include specific actions, "
            "preconditions, and observable results at each step."
        )
    elif field_scores["steps_to_reproduce"] < 0.7:
        feedback_parts.append(
            "Steps cover the basics but are missing some important details "
            "from the original report."
        )
    else:
        feedback_parts.append("Steps to reproduce are thorough and well-structured.")

    # ── Expected Behavior Score ───────────────────────────────
    expected = action.get("expected_behavior", "")
    field_scores["expected_behavior"] = _keyword_score(expected, keywords["expected_behavior"])
    if field_scores["expected_behavior"] < 0.5:
        feedback_parts.append(
            "Expected behavior description is vague. Be specific about "
            "what the correct behavior should be."
        )
    else:
        feedback_parts.append("Expected behavior is clearly stated.")

    # ── Actual Behavior Score ─────────────────────────────────
    actual = action.get("actual_behavior", "")
    field_scores["actual_behavior"] = _keyword_score(actual, keywords["actual_behavior"])
    if field_scores["actual_behavior"] < 0.5:
        feedback_parts.append(
            "Actual behavior description is incomplete. Include the specific "
            "symptoms, error messages, and observable effects."
        )
    else:
        feedback_parts.append("Actual behavior is well-documented.")

    # ── Severity Score ────────────────────────────────────────
    severity = action.get("severity", "")
    field_scores["severity"] = _severity_score(severity, keywords["severity"])
    if field_scores["severity"] < 1.0:
        expected_sev = keywords["severity"]
        if field_scores["severity"] == 0.0:
            feedback_parts.append(
                f"Severity '{severity}' is incorrect. Consider the impact: "
                f"does it cause data loss, block users, or is it cosmetic?"
            )
        else:
            feedback_parts.append(
                f"Severity '{severity}' is close but not ideal. "
                f"Think about the real-world impact of this issue."
            )
    else:
        feedback_parts.append("Severity assessment is accurate.")

    # ── Environment Score ─────────────────────────────────────
    env = action.get("environment", "")
    field_scores["environment"] = _keyword_score(env, keywords["environment"])
    if field_scores["environment"] < 0.5:
        feedback_parts.append(
            "Environment details are incomplete. Include OS, browser/runtime, "
            "and version numbers mentioned in the report."
        )
    else:
        feedback_parts.append("Environment information is well-captured.")

    # ── Format Score ──────────────────────────────────────────
    field_scores["format"] = _format_score(action)
    if field_scores["format"] < 1.0:
        feedback_parts.append(
            "Some fields are missing or too short. "
            "Ensure all required fields have meaningful content."
        )

    # ── Compute Overall Score ─────────────────────────────────
    overall_score = sum(
        FIELD_WEIGHTS[field] * field_scores[field]
        for field in FIELD_WEIGHTS
    )
    overall_score = round(min(1.0, max(0.0, overall_score)), 4)

    # Round field scores for display
    field_scores = {k: round(v, 2) for k, v in field_scores.items()}

    # Build feedback
    feedback = f"Overall Score: {overall_score:.2f}/1.00\n\n"
    feedback += "Field-by-field feedback:\n"
    for part in feedback_parts:
        feedback += f"  • {part}\n"

    if overall_score >= 0.85:
        feedback += "\nExcellent work! The structured report captures the key information well."
    elif overall_score >= 0.6:
        feedback += "\nGood effort. Some fields need refinement - review the feedback above."
    else:
        feedback += "\nThe report needs significant improvement. Focus on extracting all details from the original text."

    return overall_score, field_scores, feedback
