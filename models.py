"""
Bug Report Structuring Environment - Data Models

Defines typed request/response models for the OpenEnv API:
- BugReportAction: What the agent submits (structured bug report)
- BugReportObservation: What the environment returns (feedback + score)
- BugReportState: Episode metadata
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, List


# ─── Request Models ───────────────────────────────────────────────

class ResetRequest(BaseModel):
    """Request body for POST /reset"""
    task_id: Optional[str] = Field(
        default=None,
        description="Task difficulty: 'easy', 'medium', or 'hard'. Random if not specified."
    )
    seed: Optional[int] = Field(default=None, description="Random seed for reproducibility")
    episode_id: Optional[str] = Field(default=None, description="Custom episode ID")


class BugReportAction(BaseModel):
    """
    The structured bug report submitted by the agent.
    This is the action the agent takes at each step.
    """
    title: str = Field(
        ...,
        description="Clear, concise bug title"
    )
    steps_to_reproduce: str = Field(
        ...,
        description="Step-by-step reproduction instructions"
    )
    expected_behavior: str = Field(
        ...,
        description="What should happen"
    )
    actual_behavior: str = Field(
        ...,
        description="What actually happens"
    )
    severity: str = Field(
        ...,
        description="Severity level: 'low', 'medium', 'high', or 'critical'"
    )
    environment: str = Field(
        ...,
        description="OS, browser, version, platform info"
    )
    additional_notes: Optional[str] = Field(
        default="",
        description="Any additional relevant information"
    )


class StepRequest(BaseModel):
    """Request body for POST /step"""
    action: BugReportAction


# ─── Response Models ──────────────────────────────────────────────

class BugReportObservation(BaseModel):
    """
    What the environment returns after reset() or step().
    Contains the raw report, feedback, and scoring.
    """
    raw_report: str = Field(
        ...,
        description="The messy, unstructured bug report to process"
    )
    feedback: str = Field(
        default="",
        description="Grading feedback explaining the score"
    )
    score: float = Field(
        default=0.0,
        description="Overall score from 0.0 to 1.0"
    )
    field_scores: Dict[str, float] = Field(
        default_factory=dict,
        description="Per-field scores: title, steps, expected, actual, severity, environment"
    )
    done: bool = Field(
        default=False,
        description="Whether the episode is complete"
    )
    reward: float = Field(
        default=0.0,
        description="Reward signal for this step"
    )
    step_count: int = Field(
        default=0,
        description="Current step number"
    )
    task_id: str = Field(
        default="",
        description="Current task identifier"
    )
    max_steps: int = Field(
        default=5,
        description="Maximum steps allowed for this task"
    )


class BugReportState(BaseModel):
    """
    Episode state metadata returned by GET /state.
    """
    episode_id: str = Field(default="", description="Unique episode identifier")
    step_count: int = Field(default=0, description="Steps taken so far")
    task_id: str = Field(default="", description="Current task ID")
    max_steps: int = Field(default=5, description="Maximum steps for this task")
    current_score: float = Field(default=0.0, description="Best score achieved so far")
    best_score: float = Field(default=0.0, description="Best score across all steps")
    done: bool = Field(default=False, description="Whether episode is complete")
    rewards: List[float] = Field(default_factory=list, description="Rewards per step")
