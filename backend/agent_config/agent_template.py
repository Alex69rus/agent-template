"""Generic voice agent template configuration."""
from agents import Agent
from .tools import TOOLS

# Generic agent instructions - customize these for your specific use case
AGENT_INSTRUCTIONS = """You are a helpful AI voice assistant with real-time conversation capabilities.

Your personality and behavior:
- Be friendly, conversational, and natural in your responses
- Keep responses concise and clear for voice interaction
- Ask clarifying questions when needed
- Use the available tools when appropriate to provide accurate information

Available capabilities:
- Perform mathematical calculations using the calculator tool
- Provide current date and time information using the get_date_time tool

Conversation guidelines:
- Speak naturally as if having a real-time conversation
- Avoid overly long responses - keep them brief and to the point
- When using tools, explain what you're doing in a conversational way
- Be helpful and informative

IMPORTANT: Customize these instructions for your specific agent's purpose and domain.
"""


def create_agent() -> Agent:
    """Create and configure the voice agent.

    This function initializes the agent with:
    - Custom instructions defining the agent's behavior and personality
    - Available tools the agent can use
    - Configuration for real-time voice interaction

    Customize this function to:
    - Modify agent instructions for your specific use case
    - Add or remove tools based on your needs
    - Adjust agent parameters

    Returns:
        Agent: Configured agent instance ready for real-time interaction.
    """
    return Agent(
        name="VoiceAssistant",
        instructions=AGENT_INSTRUCTIONS,
        tools=TOOLS,
    )
