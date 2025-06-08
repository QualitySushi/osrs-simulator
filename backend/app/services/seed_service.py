import base64
import json
from typing import Dict, Any

from ..models import DpsParameters


def decode_seed(seed: str) -> DpsParameters:
    """Decode a base64 encoded seed string into DpsParameters."""
    try:
        payload = base64.b64decode(seed).decode("utf-8")
        data = json.loads(payload)
        return DpsParameters(**data)
    except Exception as e:
        raise ValueError(f"Invalid seed format: {e}")


def encode_seed(params: DpsParameters) -> str:
    """Encode DpsParameters into a base64 seed string."""
    payload = params.model_dump()
    json_str = json.dumps(payload)
    return base64.b64encode(json_str.encode("utf-8")).decode("utf-8")
