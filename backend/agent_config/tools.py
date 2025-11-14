"""Tools for the voice agent."""
from agents import function_tool
from datetime import datetime


@function_tool
def calculator_tool(expression: str) -> str:
    """Evaluate a mathematical expression.

    Use this tool to perform calculations like arithmetic operations,
    percentages, exponents, and other mathematical operations.

    Args:
        expression: Mathematical expression to evaluate (e.g., "123 * 456" or "2 ** 10")

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

    Use this tool when you need current date/time information for any
    time-relevant context or when the user asks about the current date or time.

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
