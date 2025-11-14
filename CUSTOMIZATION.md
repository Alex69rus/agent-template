# Customization Guide

This guide walks you through creating your own specialized voice agent using this template.

## Table of Contents

1. [Agent Instructions](#1-agent-instructions)
2. [Adding Custom Tools](#2-adding-custom-tools)
3. [UI Customization](#3-ui-customization)
4. [Configuration](#4-configuration)
5. [Advanced Customization](#5-advanced-customization)

---

## 1. Agent Instructions

The agent's personality, behavior, and knowledge are defined in the instructions.

### Location
[backend/agent_config/agent_template.py](backend/agent_config/agent_template.py)

### Example: Customer Support Agent

```python
AGENT_INSTRUCTIONS = """You are a customer support specialist for TechCorp Inc.

Your responsibilities:
- Help customers with product issues and technical problems
- Provide clear, step-by-step troubleshooting guidance
- Escalate complex issues when necessary
- Maintain a friendly, patient, and professional tone

Product knowledge:
- TechCorp sells cloud storage solutions
- Main products: Basic (100GB), Pro (1TB), Enterprise (unlimited)
- Common issues: login problems, sync errors, billing questions

Conversation guidelines:
- Greet customers warmly
- Ask clarifying questions to understand the issue
- Use tools to lookup information when needed
- Keep responses concise for voice interaction
- Thank customers for contacting support

Available tools:
- order_lookup_tool: Look up order information by order ID
- account_status_tool: Check account status and subscription details
- create_ticket_tool: Create support ticket for complex issues
"""
```

### Tips for Writing Good Instructions

1. **Be Specific**: Define exact behaviors and constraints
2. **Set the Domain**: Clearly state what the agent specializes in
3. **Define Personality**: Specify tone, style, and approach
4. **List Capabilities**: Mention available tools and when to use them
5. **Add Guidelines**: Include do's and don'ts for conversations
6. **Keep It Focused**: Avoid overly long instructions (aim for 200-500 words)

---

## 2. Adding Custom Tools

Tools allow your agent to perform actions and access external data.

### Location
[backend/agent_config/tools.py](backend/agent_config/tools.py)

### Tool Structure

```python
from agents import function_tool

@function_tool
def your_tool_name(param1: str, param2: int) -> str:
    """Brief description of what the tool does.

    The AI uses this docstring to understand when and how to use the tool.
    Be clear and specific about the tool's purpose.

    Args:
        param1: Description of first parameter
        param2: Description of second parameter

    Returns:
        Description of what the tool returns
    """
    # Your implementation here
    result = f"Processing {param1} with {param2}"
    return result
```

### Example: Weather Tool

```python
@function_tool
def get_weather_tool(city: str) -> str:
    """Get current weather information for a city.

    Use this tool when the user asks about weather conditions,
    temperature, or forecast for a specific location.

    Args:
        city: Name of the city (e.g., "San Francisco", "New York")

    Returns:
        Current weather conditions and temperature
    """
    # In production, call a real weather API
    # For demo purposes:
    return f"Weather in {city}: Sunny, 72°F"
```

### Example: Database Lookup Tool

```python
@function_tool
def lookup_order_tool(order_id: str) -> str:
    """Look up order details by order ID.

    Use this when the user asks about order status, tracking,
    or order details.

    Args:
        order_id: The order ID (e.g., "ORD-12345")

    Returns:
        Order status, items, and tracking information
    """
    # In production, query your database
    # Example implementation:
    try:
        # Simulate database lookup
        orders = {
            "ORD-12345": "Status: Shipped, Tracking: TRK789, Items: 2x Widget",
            "ORD-67890": "Status: Processing, Expected ship: Tomorrow"
        }

        if order_id in orders:
            return orders[order_id]
        else:
            return f"Order {order_id} not found"

    except Exception as e:
        return f"Error looking up order: {str(e)}"
```

### Registering Tools

After creating your tools, add them to the TOOLS list:

```python
# At the bottom of tools.py
TOOLS = [
    calculator_tool,
    get_date_time_tool,
    get_weather_tool,        # Your new tool
    lookup_order_tool,       # Your new tool
]
```

### Tool Best Practices

1. **Clear Docstrings**: The AI reads these to understand when to use the tool
2. **Type Hints**: Always use type hints for parameters and return values
3. **Error Handling**: Wrap implementation in try/except blocks
4. **Simple Returns**: Return strings that are easy to speak
5. **Fast Execution**: Keep tool execution under 2 seconds for best UX
6. **Validation**: Validate inputs before processing

---

## 3. UI Customization

### Basic Branding

#### Change Title and Header

Edit [frontend/src/App.jsx](frontend/src/App.jsx):

```jsx
<header className="app-header">
  <h1>🎯 Your Agent Name</h1>
  <p>Your tagline or description here</p>
</header>
```

#### Update Info Panel

Edit [frontend/src/components/VoiceAgent.jsx](frontend/src/components/VoiceAgent.jsx):

```jsx
<div className="info-panel">
  <h3>ℹ️ About this Agent</h3>
  <p>This AI-powered agent can:</p>
  <ul>
    <li>🔍 Search your product catalog</li>
    <li>📦 Track orders and shipments</li>
    <li>💡 Provide technical support</li>
  </ul>
  <p className="disclaimer">
    <strong>Note:</strong> Your custom disclaimer here
  </p>
</div>
```

### Styling

#### Colors and Theme

Edit [frontend/src/App.css](frontend/src/App.css) or [frontend/src/components/VoiceAgent.css](frontend/src/components/VoiceAgent.css):

```css
/* Change primary colors */
:root {
  --primary-color: #your-color;
  --secondary-color: #your-color;
  --accent-color: #your-color;
}

/* Customize header */
.app-header {
  background: linear-gradient(135deg, #your-color1, #your-color2);
}
```

#### Button Styles

```css
.btn-connect {
  background-color: #your-brand-color;
}

.btn-connect:hover {
  background-color: #your-brand-color-dark;
}
```

### Advanced UI Customization

#### Add Custom Components

Create new components in [frontend/src/components/](frontend/src/components/):

```jsx
// frontend/src/components/CustomPanel.jsx
import React from 'react'
import './CustomPanel.css'

const CustomPanel = ({ data }) => {
  return (
    <div className="custom-panel">
      <h3>Custom Information</h3>
      {/* Your custom UI */}
    </div>
  )
}

export default CustomPanel
```

Then import and use in VoiceAgent.jsx:

```jsx
import CustomPanel from './CustomPanel'

// In the component
<CustomPanel data={yourData} />
```

---

## 4. Configuration

### Backend Configuration

Edit [backend/.env](backend/.env):

```env
# Required
OPENAI_API_KEY=sk-your-api-key

# Optional customization
MODEL=gpt-realtime-mini        # AI model
VOICE=alloy                     # Voice: alloy, echo, fable, onyx, nova, shimmer
HOST=0.0.0.0                    # Server host
PORT=8000                       # Server port
FRONTEND_URL=http://localhost:5173  # CORS configuration
```

### Frontend Configuration

Create [frontend/.env](frontend/.env):

```env
# WebSocket URL (if different from default)
VITE_WS_URL=ws://localhost:8000/ws

# Or for production
# VITE_WS_URL=wss://your-domain.com/ws
```

### Voice Options

Available voices with personality traits:

- **alloy**: Neutral, balanced
- **echo**: Deeper, more authoritative
- **fable**: British accent, expressive
- **onyx**: Deep, smooth, professional
- **nova**: Energetic, youthful
- **shimmer**: Warm, friendly

Test different voices to find the best fit for your agent's personality.

---

## 5. Advanced Customization

### Adding External API Integrations

Example: Integrating with a REST API in your tools:

```python
import requests
from agents import function_tool

@function_tool
def search_knowledge_base(query: str) -> str:
    """Search the company knowledge base for information.

    Args:
        query: Search query

    Returns:
        Relevant information from knowledge base
    """
    try:
        response = requests.post(
            "https://api.yourcompany.com/search",
            json={"query": query},
            headers={"Authorization": f"Bearer {YOUR_API_KEY}"},
            timeout=5
        )

        if response.status_code == 200:
            data = response.json()
            return data.get("answer", "No results found")
        else:
            return "Unable to search knowledge base at this time"

    except Exception as e:
        return f"Search error: {str(e)}"
```

### Database Integration

Example: Using SQLAlchemy for database queries:

```python
from sqlalchemy import create_engine, text
from agents import function_tool

# In your config or at module level
engine = create_engine('postgresql://user:pass@localhost/dbname')

@function_tool
def get_user_info(user_id: str) -> str:
    """Retrieve user information from database.

    Args:
        user_id: User ID to lookup

    Returns:
        User information
    """
    try:
        with engine.connect() as conn:
            result = conn.execute(
                text("SELECT name, email, status FROM users WHERE id = :id"),
                {"id": user_id}
            )
            row = result.fetchone()

            if row:
                return f"User: {row.name}, Email: {row.email}, Status: {row.status}"
            else:
                return f"User {user_id} not found"

    except Exception as e:
        return f"Database error: {str(e)}"
```

### Authentication & Authorization

For production, add authentication in [backend/api/websocket.py](backend/api/websocket.py):

```python
from fastapi import WebSocket, WebSocketDisconnect, Depends, HTTPException
from your_auth_module import verify_token

async def get_current_user(token: str):
    """Verify authentication token"""
    user = await verify_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid authentication")
    return user

async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(...),  # Require token as query param
):
    # Verify authentication
    try:
        user = await get_current_user(token)
    except HTTPException:
        await websocket.close(code=4001, reason="Unauthorized")
        return

    await websocket.accept()
    # ... rest of your code
```

### Session State Management

If you need to maintain state across the conversation:

```python
# In websocket.py
session_state = {}

async def websocket_endpoint(websocket: WebSocket):
    session_id = str(uuid.uuid4())
    session_state[session_id] = {
        "user_id": None,
        "context": {},
        "history": []
    }

    try:
        # ... your code
        # Access state: session_state[session_id]
    finally:
        # Cleanup
        if session_id in session_state:
            del session_state[session_id]
```

### Custom Logging

Add structured logging in [backend/main.py](backend/main.py):

```python
import logging
import json
from datetime import datetime

class JSONFormatter(logging.Formatter):
    def format(self, record):
        log_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "message": record.getMessage(),
            "module": record.module,
        }
        return json.dumps(log_data)

# Configure logging
handler = logging.StreamHandler()
handler.setFormatter(JSONFormatter())
logging.root.addHandler(handler)
logging.root.setLevel(logging.INFO)
```

---

## Testing Your Customization

### 1. Test Agent Instructions

1. Start the agent
2. Have conversations that test different instruction aspects
3. Verify tone, knowledge boundaries, and behavior match your instructions

### 2. Test Tools

1. Create test cases that should trigger each tool
2. Verify tools are called correctly
3. Check error handling for invalid inputs
4. Ensure responses are voice-friendly

### 3. Test UI

1. Check responsive design on different screen sizes
2. Verify branding and colors are correct
3. Test all interactive elements
4. Check accessibility (keyboard navigation, screen readers)

---

## Common Customization Patterns

### Medical/Healthcare Agent
- HIPAA compliance considerations
- Symptom assessment tools
- Appointment scheduling tools
- Medication information lookup
- Emergency detection and escalation

### E-commerce Agent
- Product search and recommendations
- Order tracking and management
- Return/refund processing
- Inventory checking
- Shopping cart management

### Educational Tutor
- Subject matter expertise
- Quiz and assessment tools
- Progress tracking
- Resource recommendations
- Adaptive difficulty

### Technical Support
- System diagnostics tools
- Ticket creation and tracking
- Knowledge base search
- Escalation workflows
- Remote assistance coordination

---

## Next Steps

1. **Define Your Use Case**: Write down exactly what your agent should do
2. **Customize Instructions**: Update agent_template.py with your domain
3. **Add Tools**: Implement tools your agent needs
4. **Update UI**: Brand and customize the interface
5. **Test Thoroughly**: Create test scenarios and verify behavior
6. **Deploy**: See production considerations in README.md

Need help? Check [docs/vision.md](docs/vision.md) for architecture details or [README.md](README.md) for general guidance.
