"""
Bug Report Structuring Environment - Task Definitions

Defines 3 tasks (easy, medium, hard) with:
- Raw messy bug reports (input to the agent)
- Ground truth structured versions (for grading)
- Keyword lists per field (for deterministic scoring)
"""

SEVERITY_LEVELS = ["low", "medium", "high", "critical"]

SEVERITY_ADJACENCY = {
    "low": {"low": 1.0, "medium": 0.5, "high": 0.0, "critical": 0.0},
    "medium": {"low": 0.5, "medium": 1.0, "high": 0.5, "critical": 0.0},
    "high": {"low": 0.0, "medium": 0.5, "high": 1.0, "critical": 0.5},
    "critical": {"low": 0.0, "medium": 0.0, "high": 0.5, "critical": 1.0},
}

TASKS = {
    # ─────────────────────────────────────────────────────────────
    # EASY: Single clear bug, all info present but messy formatting
    # ─────────────────────────────────────────────────────────────
    "easy": {
        "task_id": "easy",
        "max_steps": 3,
        "raw_report": (
            "hey so the login button doesnt work. im on chrome on windows 10 "
            "(version 120.0.6099.130). when i click the login button after entering "
            "my username and password the whole page just freezes. cant click anything, "
            "nothing responds at all. i have to force close the tab and reopen the browser. "
            "i expected it to log me in and redirect to the dashboard like it used to. "
            "this has been happening since the last update on monday. my friend on firefox "
            "says its fine for him so it might be a chrome-only issue. this is pretty bad since "
            "nobody on chrome can login right now. my email is user@test.com if you need to "
            "test with my account."
        ),
        "ground_truth": {
            "title": "Login button causes page freeze on Chrome",
            "steps_to_reproduce": (
                "1. Open the login page in Chrome\n"
                "2. Enter username and password\n"
                "3. Click the login button\n"
                "4. Observe page becomes unresponsive"
            ),
            "expected_behavior": (
                "User should be logged in successfully and redirected to the dashboard"
            ),
            "actual_behavior": (
                "Page freezes completely after clicking login button, "
                "requiring force close of the browser tab"
            ),
            "severity": "high",
            "environment": "Windows 10, Chrome 120.0.6099.130",
        },
        "keywords": {
            "title": ["login", "button", "freeze", "chrome"],
            "steps_to_reproduce": [
                "login", "page", "click", "button", "username", "password",
                "enter", "freeze"
            ],
            "expected_behavior": [
                "log in", "redirect", "dashboard", "success"
            ],
            "actual_behavior": [
                "freeze", "unresponsive", "close", "not working", "stuck"
            ],
            "severity": "high",
            "environment": ["windows", "chrome", "120"],
        },
    },

    # ─────────────────────────────────────────────────────────────
    # MEDIUM: Multiple symptoms, some ambiguity, partial info
    # ─────────────────────────────────────────────────────────────
    "medium": {
        "task_id": "medium",
        "max_steps": 4,
        "raw_report": (
            "Search is acting weird. Sometimes when I search for products the results are "
            "from like 2 days ago?? Not showing the newest items we added yesterday. Also "
            "the price filter seems broken - I set max price to $50 but still get items "
            "showing $75, $100 etc in the results. Oh and one more thing the search "
            "suggestions dropdown sometimes shows raw HTML tags like <b>keyword</b> instead "
            "of just the keyword text.\n\n"
            "I'm on a MacBook Pro, using Safari 17.2. Not sure about the exact macOS version "
            "but it's the latest one I think (Sonoma maybe?). My colleague on Chrome doesn't "
            "see the stale results issue but does see the filter problem so that seems "
            "cross-browser.\n\n"
            "This is medium priority I guess? But the stale results thing could be really bad "
            "if customers see old prices that we've already updated. The HTML tags thing looks "
            "unprofessional too. We first noticed this after the search index migration last week."
        ),
        "ground_truth": {
            "title": "Search returns stale results, price filter ignores max value, and HTML tags visible in suggestions",
            "steps_to_reproduce": (
                "1. Search for any product in the search bar\n"
                "2. Observe results showing items from 2+ days ago instead of current data\n"
                "3. Set price filter maximum to $50\n"
                "4. Observe results still showing items priced above $50\n"
                "5. Type in search bar and observe suggestion dropdown\n"
                "6. Notice raw HTML tags (<b></b>) appearing in suggestions"
            ),
            "expected_behavior": (
                "Search should return current/up-to-date results, price filter should "
                "correctly exclude items above the set maximum, and search suggestions "
                "should display clean text without HTML markup"
            ),
            "actual_behavior": (
                "Three issues: (1) Search results are stale/outdated by ~2 days, "
                "(2) Price filter max value is ignored showing items above the limit, "
                "(3) Search suggestion dropdown shows raw HTML tags instead of formatted text"
            ),
            "severity": "medium",
            "environment": "macOS Sonoma, Safari 17.2, MacBook Pro",
        },
        "keywords": {
            "title": [
                "search", "stale", "filter", "price", "html", "result"
            ],
            "steps_to_reproduce": [
                "search", "product", "result", "filter", "price", "$50",
                "suggestion", "html", "tag", "dropdown"
            ],
            "expected_behavior": [
                "current", "up-to-date", "filter", "maximum",
                "clean", "text", "result"
            ],
            "actual_behavior": [
                "stale", "outdated", "old", "filter", "ignored", "html",
                "tag", "price", "above"
            ],
            "severity": "medium",
            "environment": ["mac", "safari", "17"],
        },
    },

    # ─────────────────────────────────────────────────────────────
    # HARD: Multiple distinct bugs, technical details, compound report
    # ─────────────────────────────────────────────────────────────
    "hard": {
        "task_id": "hard",
        "max_steps": 5,
        "raw_report": (
            "OK so there's multiple issues with the analytics dashboard that I need to report.\n\n"
            "1) The real-time chart stopped updating after we deployed v2.3.1 last Thursday "
            "(March 15th). It used to refresh every 5 seconds showing live user counts but now "
            "it's completely frozen showing data from March 15th 10:00 AM. I checked the browser "
            "DevTools and the WebSocket connection is throwing 1006 errors (abnormal closure). "
            "This affects all users not just me. Before v2.3.1 (on v2.3.0) it worked perfectly.\n\n"
            "2) Export to CSV is generating corrupted number formats. For example a value that "
            "should be 1,234.56 shows up as 1234.56000000001 in the exported file. This is "
            "clearly a floating point precision issue. It happens with all numeric columns but "
            "only in the CSV export - the on-screen values look fine. We use this for our "
            "quarterly finance report so accuracy is critical.\n\n"
            "3) CRITICAL BUG: When switching between the 'Daily' and 'Monthly' view tabs WHILE "
            "data is still loading (you can see the spinner), the entire application crashes to "
            "a white screen. Console shows: \"Uncaught TypeError: Cannot read properties of "
            "undefined (reading 'map')\" at DashboardView.jsx line 142. This is reproducible "
            "100%% of the time. If you wait for data to finish loading before switching tabs "
            "it works fine.\n\n"
            "Environment: React 18.2.0, Node.js 18.17.0, deployed on AWS ECS (Fargate), "
            "Chrome 122.0.6261.94 on Ubuntu 22.04. The dashboard is accessed at "
            "https://analytics.internal.company.com\n\n"
            "I'd rate this as critical overall since issue #3 causes complete app failure "
            "and issue #2 is blocking our finance team. Issue #1 is high priority since "
            "we need real-time monitoring for ops.\n\n"
            "Contact: devops-team@company.com, slack channel: #dashboard-issues"
        ),
        "ground_truth": {
            "title": (
                "Analytics Dashboard: Real-time chart frozen after v2.3.1, "
                "CSV export floating point corruption, crash on view tab switching during load"
            ),
            "steps_to_reproduce": (
                "Issue 1 - Chart Frozen:\n"
                "1. Open analytics dashboard\n"
                "2. Observe real-time chart is not updating (stuck at March 15th 10:00 AM data)\n"
                "3. Check DevTools Network tab - WebSocket shows 1006 errors\n\n"
                "Issue 2 - CSV Export Corruption:\n"
                "1. Navigate to any data view with numeric values\n"
                "2. Click Export to CSV\n"
                "3. Open CSV file and check numeric columns\n"
                "4. Observe floating point precision errors (e.g., 1234.56000000001)\n\n"
                "Issue 3 - Crash on Tab Switch:\n"
                "1. Open dashboard with Daily view\n"
                "2. While data is still loading (spinner visible), click Monthly tab\n"
                "3. Application crashes to white screen\n"
                "4. Console shows TypeError: Cannot read properties of undefined (reading 'map')"
            ),
            "expected_behavior": (
                "1. Real-time chart should refresh every 5 seconds with live data\n"
                "2. CSV export should preserve exact numeric formatting (e.g., 1,234.56)\n"
                "3. Switching between Daily/Monthly views should work smoothly even during loading"
            ),
            "actual_behavior": (
                "1. Chart is frozen since v2.3.1 deployment, WebSocket connection fails with 1006\n"
                "2. CSV numbers have floating point errors (1234.56000000001 instead of 1,234.56)\n"
                "3. App crashes with white screen and TypeError when switching tabs during data load"
            ),
            "severity": "critical",
            "environment": (
                "React 18.2.0, Node.js 18.17.0, AWS ECS (Fargate), "
                "Chrome 122.0.6261.94, Ubuntu 22.04"
            ),
        },
        "keywords": {
            "title": [
                "dashboard", "chart", "csv", "export", "crash",
                "frozen", "tab", "switch"
            ],
            "steps_to_reproduce": [
                "chart", "update", "websocket", "1006", "csv", "export",
                "numeric", "floating point", "precision", "daily", "monthly",
                "switch", "tab", "loading", "spinner", "white screen",
                "typeerror", "map", "v2.3.1"
            ],
            "expected_behavior": [
                "refresh", "5 seconds", "live", "data", "csv", "accurate",
                "numeric", "format", "switch", "smooth", "loading"
            ],
            "actual_behavior": [
                "frozen", "stuck", "1006", "websocket", "floating point",
                "precision", "1234.56000000001", "white screen", "crash",
                "typeerror", "undefined", "map"
            ],
            "severity": "critical",
            "environment": [
                "react", "18.2", "node", "18.17", "aws", "ecs", "fargate",
                "chrome", "122", "ubuntu", "22.04"
            ],
        },
    },
}


def get_task(task_id: str) -> dict:
    """Get a task definition by ID. Raises ValueError if invalid."""
    if task_id not in TASKS:
        raise ValueError(
            f"Invalid task_id '{task_id}'. Must be one of: {list(TASKS.keys())}"
        )
    return TASKS[task_id]


def get_all_task_ids() -> list:
    """Return all available task IDs."""
    return list(TASKS.keys())
