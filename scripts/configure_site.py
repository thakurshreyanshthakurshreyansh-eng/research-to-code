#!/usr/bin/env python3
"""Inject public Supabase client settings into the Render build workspace only."""
import json
import os
import re
from pathlib import Path
from urllib.parse import urlparse

root = Path(__file__).resolve().parent.parent
index_path = root / "index.html"
url = os.environ.get("SUPABASE_URL", "").strip()
key = os.environ.get("SUPABASE_ANON_KEY", "").strip()
api_base = os.environ.get("API_BASE", "").strip()
razorpay_key_id = os.environ.get("RAZORPAY_KEY_ID", "").strip()

if not url or not key:
    raise SystemExit("Build blocked: set SUPABASE_URL and SUPABASE_ANON_KEY in the hosting environment.")
parsed = urlparse(url)
if parsed.scheme != "https" or not parsed.hostname or not parsed.hostname.endswith(".supabase.co") or parsed.path not in ("", "/") or parsed.query or parsed.fragment:
    raise SystemExit("Build blocked: SUPABASE_URL must be a Supabase HTTPS project URL.")
if key.startswith("sb_secret_") or "service_role" in key.lower():
    raise SystemExit("Build blocked: never use a Supabase secret/service_role key in the browser.")
if not (key.startswith("sb_publishable_") or key.startswith("eyJ")):
    raise SystemExit("Build blocked: expected a Supabase publishable key (or legacy anon JWT).")

if api_base:
    api = urlparse(api_base)
    if api.scheme != "https" or not api.hostname or not (api.hostname.endswith(".workers.dev") or api.hostname == "research-to-code-api.onrender.com") or api.path not in ("", "/") or api.query or api.fragment:
        raise SystemExit("Build blocked: API_BASE must be the configured Render API or a Cloudflare Workers HTTPS origin with no path/query.")
if razorpay_key_id and not razorpay_key_id.startswith("rzp_test_"):
    raise SystemExit("Build blocked: only a Razorpay TEST key ID is accepted by this build.")

source = index_path.read_text(encoding="utf-8")
pattern = r'var CFG=\{SUPABASE_URL:"",SUPABASE_ANON_KEY:"",API_BASE:"",RAZORPAY_KEY_ID:"",PAYMENTS_ENABLED:false,AI_ENABLED:false\};'
replacement = (
    "var CFG={SUPABASE_URL:" + json.dumps(url) +
    ",SUPABASE_ANON_KEY:" + json.dumps(key) +
    ",API_BASE:" + json.dumps(api_base) +
    ",RAZORPAY_KEY_ID:" + json.dumps(razorpay_key_id) +
    ',PAYMENTS_ENABLED:false,AI_ENABLED:false};'
)
source, cfg_count = re.subn(pattern, lambda _: replacement, source, count=1)
source, demo_count = re.subn(r'var DEMO_PREVIEW_BUILD=true;', 'var DEMO_PREVIEW_BUILD=false;', source, count=1)
if cfg_count != 1 or demo_count != 1:
    raise SystemExit("Build blocked: expected safe preview configuration markers were not found; no deploy config written.")
index_path.write_text(source, encoding="utf-8")
print("Configured public Supabase/optional Worker client settings. AI and payments remain disabled.")
