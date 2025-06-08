import os
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND_PATH = os.path.join(BASE_DIR, 'backend')
if BACKEND_PATH not in sys.path:
    sys.path.append(BACKEND_PATH)
