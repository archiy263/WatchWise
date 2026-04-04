"""
ABEAARS - Single-Command Launcher
Starts both the FastAPI backend (port 8000) and the frontend server (port 8081) concurrently.
Usage: python start.py (from the project root directory)
"""

import subprocess, sys, os, time, webbrowser, signal, threading

# ---- Always use the same Python that launched this script ----
PYTHON = sys.executable
ROOT   = os.path.dirname(os.path.abspath(__file__))

# ---- Check if models are trained ----
models_dir = os.path.join(ROOT, "backend", "models", "tfidf_matrix.pkl")
if not os.path.exists(models_dir):
    print("=" * 60)
    print("ABEAARS First-Time Setup")
    print("=" * 60)
    print("[1/2] Installing dependencies...")
    subprocess.run([PYTHON, "-m", "pip", "install", "-r", os.path.join(ROOT, "requirements.txt")], check=True)
    print("\n[2/2] Training ML models and building dataset...")
    subprocess.run([PYTHON, "train_models.py"], cwd=os.path.join(ROOT, "ml"), check=True)
    print("\n[OK] Setup complete!\n")

print("=" * 60)
print("  ABEAARS - Pro Entertainment Analytics")
print("=" * 60)
print("  Starting backend  -> http://127.0.0.1:8000")
print("  Starting frontend -> http://127.0.0.1:8081")
print("  Press Ctrl+C to stop both servers")
print("=" * 60)

# Launch backend
backend_proc = subprocess.Popen(
    [PYTHON, "-m", "uvicorn", "backend.main:app", "--reload", "--port", "8000"],
    cwd=ROOT
)

# Launch frontend
frontend_proc = subprocess.Popen(
    [PYTHON, "-m", "http.server", "8081", "-d", "frontend"],
    cwd=ROOT
)

# Open browser after short delay
def open_browser():
    time.sleep(2)
    webbrowser.open("http://127.0.0.1:8081")

threading.Thread(target=open_browser, daemon=True).start()

# Graceful shutdown on Ctrl+C
def shutdown(sig, frame):
    print("\n\nShutting down ABEAARS...")
    backend_proc.terminate()
    frontend_proc.terminate()
    sys.exit(0)

signal.signal(signal.SIGINT, shutdown)

# Keep alive
try:
    backend_proc.wait()
except KeyboardInterrupt:
    shutdown(None, None)
