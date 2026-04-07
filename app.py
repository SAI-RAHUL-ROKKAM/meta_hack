"""
Bug Report Structuring Environment - FastAPI Server

Exposes the environment via HTTP endpoints:
  POST /reset  → start new episode
  POST /step   → submit structured bug report
  GET  /state  → get episode metadata
  GET  /health → health check
  GET  /        → landing page
"""

import os
import uuid
from contextlib import asynccontextmanager
from typing import Dict

from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse

from models import (
    ResetRequest,
    StepRequest,
    BugReportAction,
    BugReportObservation,
    BugReportState,
)
from environment import BugReportEnvironment
from tasks import get_all_task_ids


# ─── Session Management ──────────────────────────────────────────
# Each session gets its own environment instance
_sessions: Dict[str, BugReportEnvironment] = {}
_default_session_id = "default"


def get_or_create_env(session_id: str = None) -> BugReportEnvironment:
    """Get or create an environment for a session."""
    sid = session_id or _default_session_id
    if sid not in _sessions:
        _sessions[sid] = BugReportEnvironment()
    return _sessions[sid]


# ─── FastAPI App ──────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    print("🚀 Bug Report Structuring Environment starting up...")
    print(f"📋 Available tasks: {get_all_task_ids()}")
    yield
    print("👋 Shutting down...")
    _sessions.clear()


app = FastAPI(
    title="Bug Report Structuring Environment",
    description=(
        "An OpenEnv environment that challenges LLM agents to convert "
        "messy, unstructured bug reports into well-organized structured formats. "
        "Supports 3 difficulty levels: easy, medium, hard."
    ),
    version="1.0.0",
    lifespan=lifespan,
)


# ─── Endpoints ────────────────────────────────────────────────────

@app.get("/", response_class=HTMLResponse)
async def landing_page():
    """Landing page with environment info."""
    return """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Bug Report Structuring Environment</title>
        <style>
            body {
                font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
                max-width: 800px; margin: 50px auto; padding: 20px;
                background: #0f0f23; color: #e0e0e0;
            }
            h1 { color: #00d4aa; font-size: 2em; }
            h2 { color: #ffd700; margin-top: 30px; }
            .endpoint { background: #1a1a3e; padding: 15px; border-radius: 8px;
                       margin: 10px 0; border-left: 4px solid #00d4aa; }
            code { background: #2a2a4e; padding: 2px 8px; border-radius: 4px;
                  color: #00d4aa; font-size: 0.95em; }
            .badge { display: inline-block; padding: 3px 10px; border-radius: 4px;
                    font-size: 0.8em; font-weight: 600; margin-right: 8px; }
            .get { background: #1e4620; color: #4ade80; }
            .post { background: #1e3a5f; color: #60a5fa; }
            a { color: #00d4aa; }
            .task { background: #1a1a3e; padding: 10px 15px; border-radius: 6px;
                   margin: 5px 0; }
            .easy { border-left: 4px solid #4ade80; }
            .medium { border-left: 4px solid #fbbf24; }
            .hard { border-left: 4px solid #ef4444; }
        </style>
    </head>
    <body>
        <h1>🐛 Bug Report Structuring Environment</h1>
        <p>An OpenEnv environment that challenges LLM agents to convert messy,
        unstructured bug reports into well-organized structured formats.</p>

        <h2>📋 Tasks</h2>
        <div class="task easy"><strong>Easy</strong> — Single clear bug, all info present but unstructured</div>
        <div class="task medium"><strong>Medium</strong> — Multiple symptoms, some ambiguity, partial info</div>
        <div class="task hard"><strong>Hard</strong> — Multiple distinct bugs, technical details, compound report</div>

        <h2>🔌 API Endpoints</h2>
        <div class="endpoint">
            <span class="badge post">POST</span> <code>/reset</code>
            <p>Start a new episode. Body: <code>{"task_id": "easy|medium|hard"}</code></p>
        </div>
        <div class="endpoint">
            <span class="badge post">POST</span> <code>/step</code>
            <p>Submit a structured bug report. Returns score and feedback.</p>
        </div>
        <div class="endpoint">
            <span class="badge get">GET</span> <code>/state</code>
            <p>Get current episode metadata.</p>
        </div>
        <div class="endpoint">
            <span class="badge get">GET</span> <code>/health</code>
            <p>Health check endpoint.</p>
        </div>

        <h2>📖 Docs</h2>
        <p>Interactive API docs: <a href="/docs">/docs</a></p>

        <h2>📊 Scoring</h2>
        <p>Reports are graded on 7 dimensions (0.0–1.0 each):</p>
        <ul>
            <li><strong>Title</strong> (15%) — Clear, descriptive title</li>
            <li><strong>Steps to Reproduce</strong> (25%) — Complete reproduction steps</li>
            <li><strong>Expected Behavior</strong> (15%) — What should happen</li>
            <li><strong>Actual Behavior</strong> (15%) — What actually happens</li>
            <li><strong>Severity</strong> (15%) — Correct classification</li>
            <li><strong>Environment</strong> (10%) — Platform/version info</li>
            <li><strong>Format</strong> (5%) — Structural completeness</li>
        </ul>
    </body>
    </html>
    """


@app.get("/health")
async def health_check():
    """Health check — returns 200 OK if the service is running."""
    return {
        "status": "healthy",
        "environment": "bug_report_structuring",
        "version": "1.0.0",
        "tasks": get_all_task_ids(),
    }


@app.post("/reset", response_model=BugReportObservation)
async def reset_endpoint(request: ResetRequest = None):
    """
    Start a new episode.

    Resets the environment with the specified task (or random).
    Returns the messy bug report as the initial observation.
    """
    if request is None:
        request = ResetRequest()

    try:
        env = get_or_create_env(request.episode_id)
        observation = env.reset(
            task_id=request.task_id,
            seed=request.seed,
            episode_id=request.episode_id,
        )
        return observation
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Reset failed: {str(e)}")


@app.post("/step", response_model=BugReportObservation)
async def step_endpoint(request: StepRequest):
    """
    Submit a structured bug report and receive grading.

    The agent sends a structured version of the messy bug report.
    The environment returns a score (0.0-1.0) with detailed feedback.
    """
    try:
        env = get_or_create_env()
        observation = env.step(request.action)
        return observation
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Step failed: {str(e)}")


@app.get("/state", response_model=BugReportState)
async def state_endpoint():
    """
    Get current episode state metadata.

    Returns episode_id, step_count, task_id, scores, and done status.
    """
    try:
        env = get_or_create_env()
        return env.state
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"State retrieval failed: {str(e)}")


# ─── Run directly ─────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 7860))
    uvicorn.run(app, host="0.0.0.0", port=port)
