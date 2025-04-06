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

### Build and Publish Docker Image

```bash
docker build --platform linux/amd64 -t ghcr.io/agajdosi/feedem_synchronizator:latest .
docker push ghcr.io/agajdosi/feedem_synchronizator:latest
```

### Run Docker Container

```bash
docker run -d -p 8080:8080 ghcr.io/agajdosi/feedem_synchronizator:latest
```
