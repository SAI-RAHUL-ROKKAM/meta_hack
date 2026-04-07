"""
Bug Report Structuring Environment - Core Environment Logic

Implements the OpenEnv 3-method interface:
  - reset(task_id) → initial observation with messy bug report
  - step(action) → graded observation with score + feedback
  - state() → episode metadata

The environment challenges an LLM agent to convert messy, unstructured
bug reports into well-organized structured formats.
"""

import uuid
import random
from typing import Optional

from models import (
    BugReportAction,
    BugReportObservation,
    BugReportState,
)
from tasks import get_task, get_all_task_ids
from graders import grade_submission


class BugReportEnvironment:
    """
    OpenEnv-compatible environment for bug report structuring.

    Supports concurrent sessions via per-instance state.
    """

    SUPPORTS_CONCURRENT_SESSIONS = True

    def __init__(self):
        self._state = BugReportState()
        self._task = None
        self._done = False
        self._best_score = 0.0
        self._rewards = []
        self._raw_report = ""

    def reset(
        self,
        task_id: Optional[str] = None,
        seed: Optional[int] = None,
        episode_id: Optional[str] = None,
    ) -> BugReportObservation:
        """
        Initialize a new episode.

        Args:
            task_id: 'easy', 'medium', or 'hard'. Random if None.
            seed: Random seed for reproducibility.
            episode_id: Custom episode ID.

        Returns:
            Initial observation containing the messy bug report.
        """
        # Set seed for reproducibility
        if seed is not None:
            random.seed(seed)

        # Select task
        if task_id is None:
            task_id = random.choice(get_all_task_ids())

        self._task = get_task(task_id)
        self._done = False
        self._best_score = 0.0
        self._rewards = []
        self._raw_report = self._task["raw_report"]

        # Initialize state
        eid = episode_id or str(uuid.uuid4())
        self._state = BugReportState(
            episode_id=eid,
            step_count=0,
            task_id=task_id,
            max_steps=self._task["max_steps"],
            current_score=0.0,
            best_score=0.0,
            done=False,
            rewards=[],
        )

        return BugReportObservation(
            raw_report=self._raw_report,
            feedback=(
                f"New episode started. Task: {task_id} "
                f"(max {self._task['max_steps']} steps).\n"
                f"Read the messy bug report below and submit a structured version.\n\n"
                f"Required fields: title, steps_to_reproduce, expected_behavior, "
                f"actual_behavior, severity (low/medium/high/critical), environment"
            ),
            score=0.0,
            field_scores={},
            done=False,
            reward=0.0,
            step_count=0,
            task_id=task_id,
            max_steps=self._task["max_steps"],
        )

    def step(self, action: BugReportAction) -> BugReportObservation:
        """
        Process an agent's structured bug report submission.

        Args:
            action: BugReportAction with structured fields.

        Returns:
            Observation with score, feedback, and done status.
        """
        # Check if episode is active
        if self._task is None:
            return BugReportObservation(
                raw_report="",
                feedback="Error: No active episode. Call reset() first.",
                score=0.0,
                field_scores={},
                done=True,
                reward=0.0,
                step_count=0,
                task_id="",
                max_steps=0,
            )

        if self._done:
            return BugReportObservation(
                raw_report=self._raw_report,
                feedback=(
                    f"Episode already completed. Best score: {self._best_score:.2f}. "
                    f"Call reset() for a new episode."
                ),
                score=self._best_score,
                field_scores={},
                done=True,
                reward=0.0,
                step_count=self._state.step_count,
                task_id=self._state.task_id,
                max_steps=self._state.max_steps,
            )

        # Increment step
        self._state.step_count += 1

        # Grade the submission
        action_dict = action.model_dump()
        score, field_scores, feedback = grade_submission(action_dict, self._task)

        # Track best score and rewards
        self._best_score = max(self._best_score, score)

        # Reward = improvement over previous best (reward shaping)
        prev_best = self._state.best_score
        reward = max(0.0, score - prev_best)  # Only reward improvement
        if self._state.step_count == 1:
            reward = score  # First step gets full score as reward

        self._rewards.append(round(reward, 2))

        # Check if done
        at_max_steps = self._state.step_count >= self._state.max_steps
        high_score = score >= 0.95  # Near-perfect score ends early
        self._done = at_max_steps or high_score

        # Update state
        self._state.current_score = score
        self._state.best_score = self._best_score
        self._state.done = self._done
        self._state.rewards = self._rewards.copy()

        # Add done info to feedback
        if self._done:
            if high_score:
                feedback += f"\n\n🎉 Excellent! Score {score:.2f} achieved. Episode complete."
            else:
                feedback += (
                    f"\n\nMax steps reached. Best score: {self._best_score:.2f}. "
                    f"Episode complete."
                )

        return BugReportObservation(
            raw_report=self._raw_report,
            feedback=feedback,
            score=score,
            field_scores=field_scores,
            done=self._done,
            reward=round(reward, 2),
            step_count=self._state.step_count,
            task_id=self._state.task_id,
            max_steps=self._state.max_steps,
        )

    @property
    def state(self) -> BugReportState:
        """Return current episode state."""
        return self._state
