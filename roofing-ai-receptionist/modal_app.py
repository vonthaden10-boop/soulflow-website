"""
Roofing AI Receptionist — Modal Webhook Backend
================================================
Receives Retell AI call webhooks, categorizes calls into 6 types,
logs to Google Sheets, and sends premium HTML email notifications.

Call Categories:
  1. New Customer
  2. Existing Customer Inquiry
  3. Employee / Subcontractor Inquiry
  4. Insurance Inquiry
  5. Specific Name Request
  6. General Questions / Other
"""

import json
import os
import re
import smtplib
from datetime import datetime, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from zoneinfo import ZoneInfo

import modal
import gspread
from google.oauth2.service_account import Credentials

# ── Modal app ──────────────────────────────────────────────────────────────────
app = modal.App("roofing-ai-receptionist")

image = (
    modal.Image.debian_slim()
    .pip_install(
        "gspread",
        "google-auth",
        "google-api-python-client",
        "anthropic",
        "fastapi[standard]",
    )
)

# ── Call categorization ────────────────────────────────────────────────────────

CALL_CATEGORIES = {
    1: "New Customer",
    2: "Existing Customer Inquiry",
    3: "Employee / Subcontractor Inquiry",
    4: "Insurance Inquiry",
    5: "Specific Name Request",
    6: "General Questions / Other",
}

CATEGORY_KEYWORDS = {
    1: ["new customer", "first time", "get a quote", "free estimate", "interested in", "looking for roofing", "need a roof"],
    2: ["my roof", "my job", "my project", "following up", "status update", "when will", "already scheduled", "existing"],
    3: ["apply", "hiring", "job opening", "subcontract", "work for you", "crew", "employee", "work with your company"],
    4: ["insurance", "claim", "adjuster", "storm damage", "hail", "wind damage", "deductible", "insurance company"],
    5: ["can i speak to", "is [a-z]+ available", "speak with", "talk to", "get me", "connect me with"],
    6: [],
}

BADGE_STYLES = {
    "New Customer":                     ("#16a34a", "NEW CUSTOMER"),
    "Existing Customer Inquiry":        ("#1d4ed8", "EXISTING CUSTOMER"),
    "Employee / Subcontractor Inquiry": ("#7c3aed", "EMPLOYEE / SUB"),
    "Insurance Inquiry":                ("#d97706", "INSURANCE"),
    "Specific Name Request":            ("#ea580c", "NAME REQUEST"),
    "General Questions / Other":        ("#475569", "GENERAL INQUIRY"),
}


def categorize_call(transcript: str, summary: str) -> int:
    text = (transcript + " " + summary).lower()
    for category_num, keywords in CATEGORY_KEYWORDS.items():
        if category_num == 6:
            continue
        for keyword in keywords:
            if re.search(keyword, text):
                return category_num
    return 6


def format_phone(raw: str) -> str:
    digits = re.sub(r"\D", "", raw)
    if digits.startswith("1") and len(digits) == 11:
        digits = digits[1:]
    if len(digits) == 10:
        return f"({digits[:3]})-{digits[3:6]}-{digits[6:]}"
    return raw


def format_timestamp_est(ts_ms: int) -> str:
    """Convert a Unix millisecond timestamp to 'March 28, 2026 at 5:51 PM EDT'."""
    dt = datetime.fromtimestamp(ts_ms / 1000, tz=timezone.utc).astimezone(
        ZoneInfo("America/New_York")
    )
    tz_label = "EDT" if dt.dst() else "EST"
    hour = dt.hour % 12 or 12
    ampm = "AM" if dt.hour < 12 else "PM"
    return f"{dt.strftime('%B')} {dt.day}, {dt.year} at {hour}:{dt.strftime('%M')} {ampm} {tz_label}"


# ── Google helpers ─────────────────────────────────────────────────────────────

SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]


def get_google_creds():
    creds_json = os.environ["GOOGLE_CREDENTIALS_JSON"]
    creds_dict = json.loads(creds_json)
    return Credentials.from_service_account_info(creds_dict, scopes=SCOPES)


def log_to_sheets(creds, call_data: dict):
    gc = gspread.authorize(creds)
    sheet = gc.open_by_key(os.environ["GOOGLE_SHEET_ID"]).sheet1
    sheet.append_row([
        call_data["timestamp"],
        call_data["call_id"],
        call_data["caller_name"],
        call_data["phone_number"],
        call_data["call_type"],
        call_data["duration_sec"],
        call_data["property_address"],
        call_data["reason_for_call"],
        call_data["summary"],
        call_data["recording_url"],
    ], value_input_option="USER_ENTERED")
    print(f"✅ Logged call {call_data['call_id']} to Google Sheets")


# ── Email ──────────────────────────────────────────────────────────────────────

def _build_html_email(call_data: dict) -> str:
    duration_min = int(call_data["duration_sec"]) // 60
    duration_sec = int(call_data["duration_sec"]) % 60
    duration_str = f"{duration_min}m {duration_sec}s"

    badge_color, badge_label = BADGE_STYLES.get(
        call_data["call_type"], ("#475569", call_data["call_type"].upper())
    )

    recording_btn = (
        f'<a href="{call_data["recording_url"]}" '
        f'style="display:inline-block;background:{badge_color};color:#ffffff;'
        f'font-size:14px;font-weight:700;letter-spacing:0.3px;padding:14px 32px;'
        f'border-radius:8px;text-decoration:none;">&#127897;&#65039; Listen to Recording</a>'
        if call_data["recording_url"]
        else '<p style="margin:0;font-size:13px;color:#94a3b8;font-style:italic;">Recording not available</p>'
    )

    address_row = (
        f'<tr>'
        f'<td colspan="2" style="padding-bottom:20px;">'
        f'<p style="margin:0 0 5px 0;font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;">Property Address</p>'
        f'<p style="margin:0;font-size:16px;font-weight:600;color:#0f172a;">{call_data["property_address"]}</p>'
        f'</td></tr>'
        if call_data["property_address"] not in ("", "Unknown")
        else ""
    )

    reason_row = (
        f'<tr>'
        f'<td colspan="2" style="padding-bottom:0;">'
        f'<p style="margin:0 0 5px 0;font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;">Reason for Call</p>'
        f'<p style="margin:0;font-size:16px;font-weight:600;color:#0f172a;">{call_data["reason_for_call"]}</p>'
        f'</td></tr>'
        if call_data["reason_for_call"]
        else ""
    )

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>New Call Alert</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

  <!-- TOP ACCENT BAR -->
  <tr><td style="background:{badge_color};height:5px;font-size:0;line-height:0;">&nbsp;</td></tr>

  <!-- HEADER -->
  <tr><td style="background:#ffffff;padding:32px 40px 24px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td valign="middle">
          <p style="margin:0 0 2px 0;font-size:12px;font-weight:700;letter-spacing:2.5px;color:#94a3b8;text-transform:uppercase;">Roofing AI Receptionist</p>
          <h1 style="margin:0;font-size:24px;font-weight:800;color:#0f172a;letter-spacing:-0.5px;line-height:1.2;">New Call Alert</h1>
        </td>
        <td align="right" valign="middle">
          <span style="display:inline-block;background:{badge_color}18;color:{badge_color};font-size:10px;font-weight:800;letter-spacing:1.5px;padding:6px 14px;border-radius:100px;text-transform:uppercase;border:1.5px solid {badge_color}40;">{badge_label}</span>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- THIN RULE -->
  <tr><td style="background:#ffffff;padding:0 40px;">
    <div style="height:1px;background:#f1f5f9;"></div>
  </td></tr>

  <!-- CALLER DETAILS CARD -->
  <tr><td style="background:#ffffff;padding:24px 40px 28px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td width="50%" style="padding-bottom:20px;padding-right:16px;">
          <p style="margin:0 0 5px 0;font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;">Caller</p>
          <p style="margin:0;font-size:18px;font-weight:700;color:#0f172a;line-height:1.3;">{call_data["caller_name"]}</p>
        </td>
        <td width="50%" style="padding-bottom:20px;">
          <p style="margin:0 0 5px 0;font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;">Phone</p>
          <p style="margin:0;font-size:18px;font-weight:700;color:#0f172a;line-height:1.3;">{call_data["phone_number"]}</p>
        </td>
      </tr>
      <tr>
        <td width="50%" style="padding-bottom:20px;padding-right:16px;">
          <p style="margin:0 0 5px 0;font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;">Duration</p>
          <p style="margin:0;font-size:18px;font-weight:700;color:#0f172a;line-height:1.3;">{duration_str}</p>
        </td>
        <td width="50%" style="padding-bottom:20px;">
          <p style="margin:0 0 5px 0;font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;">Time</p>
          <p style="margin:0;font-size:15px;font-weight:600;color:#0f172a;line-height:1.3;">{call_data["timestamp"]}</p>
        </td>
      </tr>
      {address_row}
      {reason_row}
    </table>
  </td></tr>

  <!-- AI SUMMARY -->
  <tr><td style="background:#f8fafc;padding:28px 40px;">
    <p style="margin:0 0 10px 0;font-size:11px;font-weight:700;letter-spacing:2px;color:#94a3b8;text-transform:uppercase;">AI Summary</p>
    <div style="background:#ffffff;border-left:4px solid {badge_color};border-radius:0 10px 10px 0;padding:18px 22px;box-shadow:0 1px 4px rgba(0,0,0,0.05);">
      <p style="margin:0;font-size:15px;line-height:1.75;color:#334155;font-weight:500;">{call_data["summary"]}</p>
    </div>
  </td></tr>

  <!-- RECORDING BUTTON -->
  <tr><td style="background:#f8fafc;padding:4px 40px 32px;" align="center">
    {recording_btn}
  </td></tr>

  <!-- FOOTER -->
  <tr><td style="background:#0f172a;padding:22px 40px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td valign="middle">
          <p style="margin:0;font-size:12px;color:#64748b;">Powered by <span style="color:#94a3b8;font-weight:600;">Retell AI</span> + <span style="color:#94a3b8;font-weight:600;">Modal</span> + <span style="color:#94a3b8;font-weight:600;">Claude</span></p>
        </td>
        <td align="right" valign="middle">
          <p style="margin:0;font-size:11px;color:#334155;font-family:monospace;">{call_data["call_id"][:24]}&hellip;</p>
        </td>
      </tr>
    </table>
  </td></tr>

</table>
</td></tr>
</table>

</body>
</html>"""


def send_email_notification(call_data: dict):
    gmail_address = os.environ["GMAIL_ADDRESS"]
    app_password  = os.environ["GMAIL_APP_PASSWORD"]
    owner_email   = os.environ["OWNER_EMAIL"]

    duration_min = int(call_data["duration_sec"]) // 60
    duration_sec = int(call_data["duration_sec"]) % 60

    subject = f"📞 {call_data['call_type']} — {call_data['caller_name']} ({duration_min}m {duration_sec}s)"

    plain = (
        f"New Call: {call_data['call_type']}\n"
        f"Caller: {call_data['caller_name']} | {call_data['phone_number']}\n"
        f"Address: {call_data['property_address']}\n"
        f"Duration: {duration_min}m {duration_sec}s | {call_data['timestamp']}\n\n"
        f"Summary:\n{call_data['summary']}\n\n"
        f"Recording: {call_data['recording_url']}"
    )

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = gmail_address
    msg["To"]      = owner_email
    msg.attach(MIMEText(plain, "plain"))
    msg.attach(MIMEText(_build_html_email(call_data), "html"))

    with smtplib.SMTP("smtp.gmail.com", 587) as smtp:
        smtp.ehlo()
        smtp.starttls()
        smtp.login(gmail_address, app_password)
        smtp.sendmail(gmail_address, owner_email, msg.as_string())

    print(f"✅ Email sent to {owner_email}")


# ── Dedup store ────────────────────────────────────────────────────────────────
# Prevents duplicate emails when Retell fires the webhook more than once per call.
processed_calls = modal.Dict.from_name("roofing-processed-calls", create_if_missing=True)

# ── Webhook endpoint ───────────────────────────────────────────────────────────

@app.function(
    image=image,
    secrets=[modal.Secret.from_name("roofing-ai-secrets")],
)
@modal.fastapi_endpoint(method="POST")
def retell_webhook(body: dict):
    # ── Structured diagnostic logging ─────────────────────────────────────────
    event = body.get("event", "")
    call  = body.get("call", body)

    print(f"\n{'='*60}")
    print(f"📥 EVENT: {event or '(none — flat payload)'}")
    print(f"{'='*60}")

    # Top-level keys (excluding 'call' blob)
    top_level = {k: v for k, v in body.items() if k != "call"}
    if top_level:
        print("── TOP-LEVEL FIELDS ──────────────────────────────────────")
        for k, v in top_level.items():
            print(f"  {k}: {v}")

    # All call-level scalar fields (skip large lists like transcript_object)
    print("── CALL FIELDS ───────────────────────────────────────────")
    for k, v in call.items():
        if k in ("transcript_object", "transcript_with_tool_calls"):
            print(f"  {k}: [omitted — {len(v)} items]")
        elif isinstance(v, (dict, list)) and k != "call_analysis":
            print(f"  {k}: {json.dumps(v)[:120]}{'...' if len(json.dumps(v)) > 120 else ''}")
        elif k != "call_analysis":
            print(f"  {k}: {v}")

    # Full call_analysis object
    analysis_raw = call.get("call_analysis") or {}
    print("── CALL_ANALYSIS (full) ──────────────────────────────────")
    print(json.dumps(analysis_raw, indent=2))
    print(f"{'='*60}\n")

    # Only process completed calls
    call_status = call.get("call_status")
    if event not in ("call_analyzed",) and call_status not in ("ended", "error"):
        return {"status": "ignored", "reason": f"event={event}, call_status={call_status}"}

    # ── Dedup check ────────────────────────────────────────────────────────────
    call_id_raw = call.get("call_id", "unknown")
    if processed_calls.get(call_id_raw):
        print(f"⚠️  Duplicate webhook for {call_id_raw} — skipping")
        return {"status": "duplicate", "call_id": call_id_raw}
    processed_calls.put(call_id_raw, True)

    # ── Extract fields ─────────────────────────────────────────────────────────
    # Re-use analysis_raw already validated and printed above — never re-fetch.
    call_id       = call_id_raw
    raw_phone     = call.get("from_number", "")
    transcript    = call.get("transcript", "")
    recording_url = call.get("recording_url", "")

    # analysis_raw was set in the logging block above
    summary          = (analysis_raw.get("call_summary") or "").strip() or "No summary available."
    caller_name      = (analysis_raw.get("customer_name") or "Unknown Caller").strip()
    property_address = (analysis_raw.get("property_address") or "").strip()
    reason_for_call  = (analysis_raw.get("reason_for_call") or "").strip()
    analysis_phone   = (analysis_raw.get("phone_number") or "").strip()

    print(
        f"🔍 Extracted — caller_name={repr(caller_name)} | "
        f"property_address={repr(property_address)} | "
        f"phone={repr(analysis_phone or raw_phone)} | "
        f"summary={repr(summary[:60])}"
    )

    # Phone: prefer call_analysis.phone_number over from_number
    if analysis_phone:
        phone_number = format_phone(analysis_phone)
    elif raw_phone:
        phone_number = format_phone(raw_phone)
    else:
        phone_number = "Unknown"

    # Duration
    duration_ms = call.get("duration_ms")
    start_ts    = call.get("start_timestamp", 0)
    end_ts      = call.get("end_timestamp", 0)
    if duration_ms is not None:
        duration = int(duration_ms / 1000)
    elif start_ts and end_ts:
        duration = int((end_ts - start_ts) / 1000)
    else:
        duration = 0

    # Timestamp formatted in Eastern time
    ts_ms     = start_ts or int(datetime.now(timezone.utc).timestamp() * 1000)
    timestamp = format_timestamp_est(ts_ms)

    # ── Categorize ─────────────────────────────────────────────────────────────
    category_num = categorize_call(transcript, summary + " " + reason_for_call)
    call_type    = CALL_CATEGORIES[category_num]

    call_data = {
        "call_id":          call_id,
        "timestamp":        timestamp,
        "caller_name":      caller_name,
        "phone_number":     phone_number,
        "call_type":        call_type,
        "duration_sec":     duration,
        "property_address": property_address,
        "reason_for_call":  reason_for_call,
        "summary":          summary,
        "recording_url":    recording_url,
    }

    print(f"📋 Categorized as: {call_type}")

    # ── Log + notify ───────────────────────────────────────────────────────────
    creds = get_google_creds()
    log_to_sheets(creds, call_data)
    send_email_notification(call_data)

    return {"status": "ok", "call_id": call_id, "call_type": call_type}
