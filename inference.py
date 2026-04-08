#!/usr/bin/env python3
"""
Bug Report Structuring Environment - Inference Script

This script runs the LLM agent against the Bug Report Structuring Environment.
It connects to the deployed environment (HF Space), uses an LLM to structure
messy bug reports, and logs results in the required OpenEnv format.

Required environment variables:
  API_BASE_URL  — Base URL for the LLM API (e.g., vLLM or HF Inference)
  MODEL_NAME    — Model identifier (e.g., meta-llama/Llama-3.1-8B-Instruct)
  HF_TOKEN      — Hugging Face authentication token

Log format (STDOUT):
  [START] task=<task> env=<env> model=<model>
  [STEP]  step=<n> action=<summary> reward=<0.00> done=<bool> error=<msg|null>
  [END]   success=<bool> steps=<n> score=<0.00> rewards=<r1,r2,...>
"""

import os
import sys
import json
import time
import requests
from openai import OpenAI
from pathlib import Path

# ─── Load Environment Variables from .env if it exists ───────────
env_file = Path(__file__).parent / ".env"
if env_file.exists():
    with open(env_file) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#"):
                key, _, value = line.partition("=")
                key = key.strip()
                value = value.strip()
                if key and value:
                    os.environ.setdefault(key, value)

# ─── Configuration ────────────────────────────────────────────────

API_BASE_URL = os.environ.get("API_BASE_URL", "")
MODEL_NAME = os.environ.get("MODEL_NAME", "")
HF_TOKEN = os.environ.get("HF_TOKEN", "")

# Environment URL (the deployed HF Space)
ENV_URL = os.environ.get(
    "ENV_URL",
    "https://rahul-13-bug-report-structuring-env.hf.space"
)

BENCHMARK_NAME = "bug_report_structuring"
TASKS = ["easy", "medium", "hard"]
MAX_RETRIES = 2

# ─── LLM Client Setup ────────────────────────────────────────────

client = OpenAI(
    base_url=API_BASE_URL,
    api_key=HF_TOKEN,
)


# ─── Prompt Templates ────────────────────────────────────────────

SYSTEM_PROMPT = """You are an expert bug report analyst. Your job is to take messy, unstructured bug reports and convert them into well-organized, structured formats.

You must output a valid JSON object with exactly these fields:
- "title": A clear, concise title summarizing the bug
- "steps_to_reproduce": Numbered step-by-step instructions to reproduce the bug
- "expected_behavior": What should happen (correct behavior)
- "actual_behavior": What actually happens (the bug symptoms)
- "severity": One of "low", "medium", "high", or "critical"
- "environment": OS, browser, version, platform details
- "additional_notes": Any other relevant details

Rules:
1. Extract ALL information from the original report - don't miss details
2. Use professional, clear language
3. Steps should be specific and actionable
4. Include version numbers, error messages, and technical details
5. Severity should reflect the actual impact described
6. Output ONLY the JSON object, no other text or markdown"""

REFINEMENT_PROMPT = """You previously structured a bug report but the grading feedback indicates room for improvement.

Original messy bug report:
{raw_report}

Your previous submission scored {score:.2f}/1.00.

Feedback:
{feedback}

Previous field scores:
{field_scores}

Please submit an improved version. Focus on the fields with low scores.
Output ONLY a valid JSON object with the same fields: title, steps_to_reproduce, expected_behavior, actual_behavior, severity, environment, additional_notes."""


# ─── Helper Functions ─────────────────────────────────────────────

def call_llm(messages: list) -> str:
    """Call the LLM and return the response text."""
    try:
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=messages,
            temperature=0.3,
            max_tokens=2048,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"  [LLM ERROR] {e}", file=sys.stderr)
        return ""


def parse_json_response(text: str) -> dict:
    """Parse JSON from LLM response, handling markdown code blocks."""
    # Strip markdown code blocks if present
    if "```json" in text:
        text = text.split("```json")[1].split("```")[0].strip()
    elif "```" in text:
        text = text.split("```")[1].split("```")[0].strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Try to find JSON object in the text
        start = text.find("{")
        end = text.rfind("}") + 1
        if start >= 0 and end > start:
            try:
                return json.loads(text[start:end])
            except json.JSONDecodeError:
                pass
    return {}


def env_reset(task_id: str) -> dict:
    """Call the environment's reset endpoint."""
    try:
        resp = requests.post(
            f"{ENV_URL}/reset",
            json={"task_id": task_id},
            timeout=30,
        )
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        print(f"  [ENV ERROR] Reset failed: {e}", file=sys.stderr)
        return {}


def env_step(action: dict) -> dict:
    """Call the environment's step endpoint."""
    try:
        resp = requests.post(
            f"{ENV_URL}/step",
            json={"action": action},
            timeout=30,
        )
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        print(f"  [ENV ERROR] Step failed: {e}", file=sys.stderr)
        return {}


def make_default_action() -> dict:
    """Return a minimal valid action as fallback."""
    return {
        "title": "Bug Report",
        "steps_to_reproduce": "1. See the bug report",
        "expected_behavior": "Application works correctly",
        "actual_behavior": "Application does not work as expected",
        "severity": "medium",
        "environment": "Not specified",
        "additional_notes": "",
    }


# ─── Main Inference Loop ─────────────────────────────────────────

def run_task(task_id: str) -> dict:
    """
    Run the agent on a single task.

    Returns dict with: success, steps, score, rewards
    """
    # ── START ──
    print(f"[START] task={task_id} env={BENCHMARK_NAME} model={MODEL_NAME}")

    rewards = []
    best_score = 0.0
    step_count = 0
    success = False

    # Reset environment
    obs = env_reset(task_id)
    if not obs:
        print(f"[STEP] step=1 action=reset_failed reward=0.00 done=true error=environment_reset_failed")
        print(f"[END] success=false steps=1 score=0.00 rewards=0.00")
        return {"success": False, "steps": 1, "score": 0.0, "rewards": [0.0]}

    raw_report = obs.get("raw_report", "")
    max_steps = obs.get("max_steps", 3)

    # ── First submission ──
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": f"Structure this bug report:\n\n{raw_report}"},
    ]

    llm_response = call_llm(messages)
    action = parse_json_response(llm_response)

    if not action or "title" not in action:
        action = make_default_action()

    # Ensure all fields exist
    for field in ["title", "steps_to_reproduce", "expected_behavior",
                  "actual_behavior", "severity", "environment", "additional_notes"]:
        if field not in action:
            action[field] = ""

    step_count = 1
    result = env_step(action)

    if result:
        score = result.get("score", 0.0)
        reward = result.get("reward", 0.0)
        done = result.get("done", False)
        error = "null"
    else:
        score = 0.0
        reward = 0.0
        done = True
        error = "step_request_failed"

    rewards.append(reward)
    best_score = max(best_score, score)
    action_summary = action.get("title", "structured_report")[:50].replace(" ", "_")

    print(
        f"[STEP] step={step_count} action={action_summary} "
        f"reward={reward:.2f} done={str(done).lower()} error={error}"
    )

    # ── Refinement steps ──
    while not done and step_count < max_steps:
        feedback = result.get("feedback", "")
        field_scores = result.get("field_scores", {})

        refinement_content = REFINEMENT_PROMPT.format(
            raw_report=raw_report,
            score=score,
            feedback=feedback,
            field_scores=json.dumps(field_scores, indent=2),
        )

        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": refinement_content},
        ]

        llm_response = call_llm(messages)
        action = parse_json_response(llm_response)

        if not action or "title" not in action:
            action = make_default_action()

        for field in ["title", "steps_to_reproduce", "expected_behavior",
                      "actual_behavior", "severity", "environment", "additional_notes"]:
            if field not in action:
                action[field] = ""

        step_count += 1
        result = env_step(action)

        if result:
            score = result.get("score", 0.0)
            reward = result.get("reward", 0.0)
            done = result.get("done", False)
            error = "null"
        else:
            score = 0.0
            reward = 0.0
            done = True
            error = "step_request_failed"

        rewards.append(reward)
        best_score = max(best_score, score)
        action_summary = action.get("title", "refined_report")[:50].replace(" ", "_")

        print(
            f"[STEP] step={step_count} action={action_summary} "
            f"reward={reward:.2f} done={str(done).lower()} error={error}"
        )

    # ── END ──
    success = best_score >= 0.6
    rewards_str = ",".join(f"{r:.2f}" for r in rewards)

    print(
        f"[END] success={str(success).lower()} steps={step_count} "
        f"score={best_score:.2f} rewards={rewards_str}"
    )

    return {
        "success": success,
        "steps": step_count,
        "score": best_score,
        "rewards": rewards,
    }


def main():
    """Run inference on all tasks."""
    # Validate environment variables
    missing = []
    if not API_BASE_URL:
        missing.append("API_BASE_URL")
    if not MODEL_NAME:
        missing.append("MODEL_NAME")
    if not HF_TOKEN:
        missing.append("HF_TOKEN")

    if missing:
        print(f"❌ Missing environment variables: {', '.join(missing)}", file=sys.stderr)
        print("Set them before running:", file=sys.stderr)
        print("  export API_BASE_URL=https://...", file=sys.stderr)
        print("  export MODEL_NAME=meta-llama/...", file=sys.stderr)
        print("  export HF_TOKEN=hf_...", file=sys.stderr)
        sys.exit(1)

    print(f"═══ Bug Report Structuring - Inference ═══", file=sys.stderr)
    print(f"  Model: {MODEL_NAME}", file=sys.stderr)
    print(f"  Env:   {ENV_URL}", file=sys.stderr)
    print(f"  Tasks: {TASKS}", file=sys.stderr)
    print(f"═══════════════════════════════════════════", file=sys.stderr)

    results = {}
    total_score = 0.0
    start_time = time.time()

    for task_id in TASKS:
        print(f"\n--- Task: {task_id} ---", file=sys.stderr)
        result = run_task(task_id)
        results[task_id] = result
        total_score += result["score"]
        print(f"  Score: {result['score']:.2f}", file=sys.stderr)

    elapsed = time.time() - start_time
    avg_score = total_score / len(TASKS)

    print(f"\n═══ Summary ═══", file=sys.stderr)
    print(f"  Average Score: {avg_score:.2f}", file=sys.stderr)
    print(f"  Time Elapsed:  {elapsed:.1f}s", file=sys.stderr)
    for task_id, result in results.items():
        status = "✅" if result["success"] else "❌"
        print(
            f"  {status} {task_id}: {result['score']:.2f} "
            f"({result['steps']} steps)",
            file=sys.stderr,
        )
    print(f"═══════════════", file=sys.stderr)


if __name__ == "__main__":
    main()
