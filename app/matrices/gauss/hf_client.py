# app/matrices/gauss/hf_client.py
from __future__ import annotations
from typing import Dict, Any
import json, os, urllib.request, urllib.error

def load_hf_config(base_dir: str) -> Dict[str, str]:
    token = os.environ.get("HF_API_TOKEN", "")
    model = os.environ.get("HF_MODEL_NAME", "")

    candidates = []
    if base_dir:
      candidates.append(os.path.join(base_dir, "hf_config.json"))
    try:
      here_root = str(Path(__file__).resolve().parents[3])
      candidates.append(os.path.join(here_root, "hf_config.json"))
    except Exception:
      pass
    # Also check current working directory
    candidates.append(os.path.join(os.getcwd(), "hf_config.json"))

    for cfg_path in candidates:
        if os.path.exists(cfg_path):
            try:
                with open(cfg_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    token = data.get("api_token", token)
                    model = data.get("model_name", model)
                    break
            except Exception:
                continue
    return {"api_token": token, "model_name": model or "microsoft/Phi-3.5-mini-instruct"}

def hf_generate(prompt: str, api_token: str, model: str,
                endpoint_base: str = "https://api-inference.huggingface.co/models",
                max_new_tokens: int = 120, temperature: float = 0.2, timeout: int = 40,
                fallback_models=None) -> Dict[str, Any]:
    if fallback_models is None:
        fallback_models = [
            "HuggingFaceH4/zephyr-7b-beta",
            "bigscience/bloomz-560m"
        ]
    def _call(model_name: str):
        url = f"{endpoint_base.rstrip('/')}/{model_name}"
        headers = {"Content-Type":"application/json","Authorization": f"Bearer {api_token}"}
        payload = {"inputs": prompt, "parameters": {"max_new_tokens": max_new_tokens, "temperature": temperature, "return_full_text": False}}
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(url, data=data, headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8")
            try:
                parsed = json.loads(raw)
            except Exception:
                parsed = {"raw": raw}
            text = ""
            if isinstance(parsed, list) and parsed and isinstance(parsed[0], dict):
                text = parsed[0].get("generated_text", "") or parsed[0].get("generated_texts", "")
            elif isinstance(parsed, dict):
                text = parsed.get("generated_text", "") or parsed.get("text", "") or ""
            return {"ok": True, "text": (text or "").strip(), "raw": parsed, "error": None, "model": model_name}
    try:
        return _call(model)
    except urllib.error.HTTPError as e:
        try: err = e.read().decode("utf-8")
        except Exception: err = str(e)
        if e.code in (404, 403, 503):
            for fb in fallback_models:
                try:
                    return _call(fb)
                except Exception:
                    continue
        return {"ok": False, "text": "", "raw": err, "error": f"HTTPError {e.code}: {err}", "model": model}
    except urllib.error.URLError as e:
        return {"ok": False, "text": "", "raw": "", "error": f"URLError: {e}", "model": model}
    except Exception as e:
        return {"ok": False, "text": "", "raw": "", "error": str(e), "model": model}
    headers = {"Content-Type":"application/json","Authorization": f"Bearer {api_token}"}
    payload = {"inputs": prompt, "parameters": {"max_new_tokens": max_new_tokens, "temperature": temperature, "return_full_text": False}}
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8")
            try:
                parsed = json.loads(raw)
            except Exception:
                parsed = {"raw": raw}
            text = ""
            if isinstance(parsed, list) and parsed and isinstance(parsed[0], dict):
                text = parsed[0].get("generated_text", "") or parsed[0].get("generated_texts", "")
            elif isinstance(parsed, dict):
                text = parsed.get("generated_text", "") or parsed.get("text", "") or ""
            return {"ok": True, "text": (text or "").strip(), "raw": parsed, "error": None}
    except urllib.error.HTTPError as e:
        try: err = e.read().decode("utf-8")
        except Exception: err = str(e)
        return {"ok": False, "text": "", "raw": err, "error": f"HTTPError {e.code}: {err}"}
    except urllib.error.URLError as e:
        return {"ok": False, "text": "", "raw": "", "error": f"URLError: {e}"}
    except Exception as e:
        return {"ok": False, "text": "", "raw": "", "error": str(e)}
