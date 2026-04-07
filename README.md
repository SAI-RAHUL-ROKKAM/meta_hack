---
title: Bug Report Structuring Env
emoji: "\U0001F41B"
colorFrom: red
colorTo: yellow
sdk: docker
pinned: false
---

# Bug Report Structuring Environment

An **OpenEnv** environment that challenges LLM agents to convert messy, unstructured bug reports into well-organized, structured formats.

## Overview

Bug reports in the wild are often poorly written — missing steps, ambiguous descriptions, wrong severity labels, and scattered technical details. This environment tests an LLM agent's ability to:

1. **Extract** key information from noisy text
2. **Classify** severity accurately based on impact
3. **Structure** reproduction steps in a clear, actionable format
4. **Identify** environment details (OS, browser, versions)
5. **Handle** compound reports with multiple distinct issues

## Tasks

| Task | Difficulty | Max Steps | Description |
|------|-----------|-----------|-------------|
| `easy` | 🟢 Easy | 3 | Single clear bug, all info present but messy |
| `medium` | 🟡 Medium | 4 | Multiple symptoms, ambiguity, partial info |
| `hard` | 🔴 Hard | 5 | Multiple distinct bugs, technical details |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/reset` | Start a new episode with `{"task_id": "easy\|medium\|hard"}` |
| `POST` | `/step` | Submit structured report, get score + feedback |
| `GET` | `/state` | Get current episode metadata |
| `GET` | `/health` | Health check |
| `GET` | `/docs` | Interactive API documentation |

## Action Schema

The agent submits a structured bug report as JSON:

```json
{
  "title": "Clear, concise bug title",
  "steps_to_reproduce": "1. Step one\n2. Step two\n...",
  "expected_behavior": "What should happen",
  "actual_behavior": "What actually happens",
  "severity": "low|medium|high|critical",
  "environment": "OS, browser, version info",
  "additional_notes": "Any other relevant details"
}
```

## Scoring

Reports are graded on 7 dimensions (each 0.0–1.0):

| Dimension | Weight | What's Evaluated |
|-----------|--------|------------------|
| Title | 15% | Clarity and descriptiveness |
| Steps to Reproduce | 25% | Completeness and specificity |
| Expected Behavior | 15% | Accuracy of expected state |
| Actual Behavior | 15% | Accuracy of reported symptoms |
| Severity | 15% | Correct classification |
| Environment | 10% | Platform/version extraction |
| Format | 5% | Structural completeness |

**Partial credit** is awarded based on keyword coverage — you don't need a perfect match to earn points.

## Quick Start

### Run Locally

```bash
pip install -r requirements.txt
python app.py
# Server runs at http://localhost:7860
```

### Docker

```bash
docker build -t bug-report-env .
docker run -p 7860:7860 bug-report-env
```

### Run Inference

```bash
export API_BASE_URL="https://api-inference.huggingface.co/v1"
export MODEL_NAME="meta-llama/Llama-3.1-8B-Instruct"
export HF_TOKEN="hf_your_token_here"
export ENV_URL="https://your-space.hf.space"

python inference.py
```

## Project Structure

```
├── app.py              # FastAPI server with all endpoints
├── environment.py      # Core environment logic (reset/step/state)
├── models.py           # Pydantic request/response models
├── tasks.py            # Task definitions with ground truth
├── graders.py          # Deterministic grading logic
├── inference.py        # LLM agent inference script
├── openenv.yaml        # OpenEnv environment manifest
├── Dockerfile          # Container definition for HF Spaces
├── requirements.txt    # Python dependencies
└── README.md           # This file
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `API_BASE_URL` | LLM API base URL | For inference |
| `MODEL_NAME` | LLM model identifier | For inference |
| `HF_TOKEN` | Hugging Face token | For inference |
| `ENV_URL` | Deployed environment URL | For inference |
| `PORT` | Server port (default: 7860) | Optional |

## Deployment

This environment is designed for deployment on **Hugging Face Spaces** using Docker SDK:

1. Create a new Space on Hugging Face (Docker SDK)
2. Push the project files
3. The Space will build and serve automatically on port 7860

## Technical Details

- **No external dependencies**: The grading is fully deterministic using keyword matching — no LLM needed server-side
- **Concurrent sessions**: Supports multiple simultaneous agents
- **Reward shaping**: First step gets full score as reward; subsequent steps reward improvement only
- **Runtime**: Well under the 20-minute limit on 2 vCPU / 8GB RAM
