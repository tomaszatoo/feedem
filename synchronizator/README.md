# Synchronizator
Simple Tornado server with python-socketio for synchronizing data between a controller (the smartphone) and a subscriber (the screensaver).
Synchronizator is compatible with socket.io client for javascript/typescript.

## Local development

### Install Dependencies

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Run the Server

```bash
python main.py
```

## Production

TODO:
- 1. Add a Dockerfile
- 2. Automate docker image build and push to container registry
- 3. Deploy to Andreas' VPS

