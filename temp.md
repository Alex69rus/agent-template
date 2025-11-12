I implemented Voice AI Agent which is supposed to be realtime with call interface (FE websocket to BE).
Based on documentation:
https://openai.github.io/openai-agents-python/ref/realtime/agent/
https://openai.github.io/openai-agents-python/ref/realtime/runner/
https://openai.github.io/openai-agents-python/ref/realtime/session/
https://openai.github.io/openai-agents-python/ref/realtime/events/
https://openai.github.io/openai-agents-python/ref/realtime/config/

It works. FE connects to BE and I can ask agent and hear it's response. But interations don't work. I don't want to hear agent response till the very end. I want to interrupt it and being able to talk.