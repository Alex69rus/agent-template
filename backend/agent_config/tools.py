"""Tools for the finance agent."""
from agents import function_tool
from datetime import datetime


@function_tool
def calculator_tool(expression: str) -> str:
    """Evaluate a mathematical expression for financial calculations.

    Use this tool to perform calculations like compound interest, investment returns,
    percentages, and other financial math.

    Args:
        expression: Mathematical expression to evaluate (e.g., "100000 * 1.07 ** 30"
                   for compound interest calculation)

    Returns:
        Result of the calculation or error message.
    """
    try:
        # Safe evaluation - only allow basic math operations
        allowed_names = {
            "abs": abs,
            "round": round,
            "min": min,
            "max": max,
            "pow": pow,
        }
        result = eval(expression, {"__builtins__": {}}, allowed_names)
        return f"Result: {result:,.2f}" if isinstance(result, (int, float)) else str(result)
    except Exception as e:
        return f"Error evaluating expression '{expression}': {str(e)}"


@function_tool
def get_date_time_tool() -> str:
    """Get the current date and time.

    Use this tool when you need current date/time information for time-relevant
    financial context, such as discussing current market conditions, tax year,
    or time-sensitive investment strategies.

    Returns:
        Current date and time with detailed information in human-readable format.
    """
    now = datetime.now()
    return (
        f"Current date and time: {now.strftime('%B %d, %Y at %I:%M %p')}\n"
        f"Date: {now.strftime('%Y-%m-%d')}\n"
        f"Year: {now.year}\n"
        f"Day of week: {now.strftime('%A')}"
    )


# List of available tools for the agent
TOOLS = [calculator_tool, get_date_time_tool]
