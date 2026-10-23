# ================================================================
# All Shipment Tracking Dashboard - Production Ready v3.0
# ================================================================

import streamlit as st
import duckdb
import os
import pandas as pd
from pathlib import Path
import database
import datetime
import logging
import plotly.express as px
import plotly.graph_objects as go
from io import BytesIO

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

# ── Column display name mapping ──────────────────────────────
COLUMN_DISPLAY_NAMES = {
    "invoice_no":          "Invoice No.",
    "po_number":           "PO Number",
    "vendor_name":         "Vendor",
    "location":            "Location",
    "dispatched_date":     "Dispatched Date",
    "appointment_date":    "Appointment Date",
    "po_expiry_date":      "PO Expiry Date",
    "invoice_quantity":    "Invoice Qty",
    "grn_quantity":        "GRN Qty",
    "dn_quantity":         "DN Qty",
    "no_of_box":           "No. of Boxes",
    "invoice_amount":      "Invoice Amount (₹)",
    "grn_amount":          "GRN Amount (₹)",
    "dn_amount":           "DN Amount (₹)",
    "po_type":             "PO Type",
    "tracking_id":         "Tracking ID",
    "transport_mode":      "Transport Mode",
    "appointment_count":   "Appt. Count",
    "appointment_history": "Appt. History",
    "delivery_status":     "Delivery Status",
    "invoice_status":      "Invoice Status",
    "dn_status":           "DN Status",
    "dn_resolution":       "DN Resolution",
    "dn_closure_date":     "DN Closure Date",
    "delivery_remark":     "Delivery Remark",
    "invoice_remark":      "Invoice Remark",
    "general_remark":      "General Remark",
    "assigned_person":     "Assigned To",
    "grn_no":              "GRN No.",
    "shipment_track_id":   "Shipment Track ID",
}

# ── Canonical column order for all tables & templates ────────
COLUMN_ORDER = [
    "invoice_no", "po_number", "vendor_name", "location",
    "dispatched_date", "appointment_date", "po_expiry_date",
    "invoice_quantity", "grn_quantity", "dn_quantity", "no_of_box",
    "invoice_amount", "grn_amount", "dn_amount",
    "po_type", "tracking_id", "transport_mode",
    "appointment_count", "appointment_history",
    "delivery_status", "invoice_status",
    "dn_status", "dn_resolution", "dn_closure_date",
    "delivery_remark", "invoice_remark", "general_remark",
    "assigned_person", "grn_no",
]

def reorder_df(df: pd.DataFrame) -> pd.DataFrame:
    """Reorder DataFrame columns to canonical order, keeping extras at end."""
    ordered = [c for c in COLUMN_ORDER if c in df.columns]
    extras  = [c for c in df.columns if c not in COLUMN_ORDER]
    return df[ordered + extras]

def rename_cols(df: pd.DataFrame, add_sr_no: bool = True) -> pd.DataFrame:
    """Return df with columns renamed to display names, with optional Sr. No. column."""
    out = df.rename(columns={k: v for k, v in COLUMN_DISPLAY_NAMES.items() if k in df.columns})
    if add_sr_no and len(out):
        out.insert(0, "Sr. No.", range(1, len(out) + 1))
    return out

def df_download_button(df: pd.DataFrame, filename: str, label: str = "⬇️ Download CSV", key: str = None):
    """Render a download button for any DataFrame as CSV."""
    csv = df.to_csv(index=False).encode("utf-8")
    st.download_button(label=label, data=csv, file_name=filename, mime="text/csv",
                       key=key or f"dl_{filename}", type="secondary")

def make_chart_plotly(fig, title=""):
    """Standard wrapper to render a plotly chart with consistent styling."""
    fig.update_layout(
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        font=dict(family="Inter, sans-serif", size=13),
        margin=dict(l=20, r=20, t=40, b=20),
        title=dict(text=title, font=dict(size=15, color="#1e293b"), x=0.01),
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1),
    )
    st.plotly_chart(fig, width='stretch')


# ── PAGE CONFIG ──────────────────────────────────────────────
st.set_page_config(
    page_title="DesiDiya Tracking",
    page_icon="🚚",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ── THEME & CUSTOM CSS ───────────────────────────────────────
THEME_CSS = """
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

/* ── Global Reset ── */
html, body, [class*="css"] { font-family: 'Inter', sans-serif !important; }
/* Hide Streamlit chrome elements cleanly */
#MainMenu                    { display: none !important; }
footer                       { display: none !important; }
[data-testid="stToolbar"]    { display: none !important; }
[data-testid="stDecoration"] { display: none !important; }
[data-testid="stStatusWidget"]{ display: none !important; }

/* Shrink the header bar to zero so it doesn't take space */
[data-testid="stHeader"] {
    height: 0px !important;
    min-height: 0px !important;
    padding: 0 !important;
    overflow: visible !important;
}

/* Native Streamlit collapse/expand button — keep fully visible */
[data-testid="collapsedControl"] {
    visibility: visible !important;
    display: flex !important;
    opacity: 1 !important;
    pointer-events: auto !important;
    z-index: 999999 !important;
    position: fixed !important;
    top: 48% !important;
    left: 0 !important;
}
[data-testid="collapsedControl"] button {
    visibility: visible !important;
    display: flex !important;
    opacity: 1 !important;
    background: linear-gradient(160deg, #302b63, #0f0c29) !important;
    border-radius: 0 14px 14px 0 !important;
    padding: 16px 10px !important;
    border: none !important;
    box-shadow: 4px 0 18px rgba(0,0,0,0.4) !important;
    cursor: pointer !important;
    transition: all 0.2s !important;
}
[data-testid="collapsedControl"] button:hover {
    background: linear-gradient(160deg, #4f46e5, #302b63) !important;
    box-shadow: 6px 0 22px rgba(99,102,241,0.5) !important;
    padding-right: 14px !important;
}
[data-testid="collapsedControl"] svg {
    fill: #ffffff !important;
    color: #ffffff !important;
    stroke: #ffffff !important;
    width: 22px !important;
    height: 22px !important;
}

/* ── App background ── */
.stApp { background: #f0f2f8; }

/* ── Sidebar ── */
[data-testid="stSidebar"] {
    background: linear-gradient(160deg, #0f0c29 0%, #302b63 50%, #24243e 100%) !important;
    border-right: 1px solid rgba(255,255,255,0.06);
}

/* Sidebar text elements */
[data-testid="stSidebar"] p,
[data-testid="stSidebar"] span,
[data-testid="stSidebar"] div,
[data-testid="stSidebar"] small,
[data-testid="stSidebar"] label { color: #cbd5e1 !important; }

[data-testid="stSidebar"] h1,
[data-testid="stSidebar"] h2,
[data-testid="stSidebar"] h3 { color: #ffffff !important; }

/* Sidebar radio options - make them fully visible */
[data-testid="stSidebar"] [data-testid="stRadio"] { width: 100%; }
[data-testid="stSidebar"] [data-testid="stRadio"] > div { gap: 4px; }
[data-testid="stSidebar"] [data-testid="stRadio"] label {
    display: flex !important;
    align-items: center !important;
    width: 100% !important;
    padding: 10px 14px !important;
    border-radius: 10px !important;
    font-size: 14px !important;
    font-weight: 500 !important;
    color: #e2e8f0 !important;
    cursor: pointer !important;
    transition: background 0.18s !important;
    margin: 2px 0 !important;
}
[data-testid="stSidebar"] [data-testid="stRadio"] label:hover {
    background: rgba(255,255,255,0.10) !important;
    color: #ffffff !important;
}
[data-testid="stSidebar"] [data-testid="stRadio"] label[data-baseweb] {
    background: rgba(99,102,241,0.25) !important;
    color: #ffffff !important;
    border-left: 3px solid #818cf8 !important;
}
/* Radio circle color */
[data-testid="stSidebar"] [data-testid="stRadio"] input[type="radio"] + div {
    border-color: #818cf8 !important;
}
[data-testid="stSidebar"] [data-testid="stRadio"] input[type="radio"]:checked + div {
    background: #818cf8 !important;
    border-color: #818cf8 !important;
}

/* ── Metric / KPI Cards ── */
[data-testid="metric-container"] {
    background: #ffffff;
    border: none;
    border-radius: 16px;
    padding: 22px 20px 18px;
    box-shadow: 0 2px 20px rgba(0,0,0,0.07);
    border-left: 5px solid #6366f1;
    transition: transform 0.18s, box-shadow 0.18s;
}
[data-testid="metric-container"]:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 32px rgba(99,102,241,0.18);
}
[data-testid="metric-container"] label { font-size: 12px !important; font-weight: 600 !important; color: #64748b !important; text-transform: uppercase; letter-spacing: 0.7px; }
[data-testid="metric-container"] [data-testid="stMetricValue"] { font-size: 28px !important; font-weight: 700 !important; color: #1e293b !important; }

/* ── Buttons ── */
.stButton > button {
    border-radius: 10px;
    font-weight: 600;
    font-size: 14px;
    transition: all 0.2s;
    border: none;
    letter-spacing: 0.3px;
}
.stButton > button[kind="primary"] {
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    color: #fff;
    box-shadow: 0 4px 14px rgba(99,102,241,0.4);
}
.stButton > button[kind="primary"]:hover {
    box-shadow: 0 6px 20px rgba(99,102,241,0.55);
    transform: translateY(-1px);
}
.stButton > button[kind="secondary"] {
    background: #fff;
    color: #374151;
    border: 1.5px solid #e2e8f0;
}
.stButton > button[kind="secondary"]:hover {
    background: #f8fafc;
    transform: translateY(-1px);
}

/* ── Inputs ── */
.stTextInput input,
.stNumberInput input,
.stTextArea textarea,
.stSelectbox select {
    border-radius: 10px !important;
    border: 1.5px solid #e2e8f0 !important;
    font-size: 14px !important;
    transition: border-color 0.2s, box-shadow 0.2s;
}
.stTextInput input:focus,
.stNumberInput input:focus,
.stTextArea textarea:focus {
    border-color: #6366f1 !important;
    box-shadow: 0 0 0 3px rgba(99,102,241,0.12) !important;
}

/* ── Tabs ── */
.stTabs [data-baseweb="tab-list"] {
    gap: 6px;
    background: #e8eaf6;
    border-radius: 14px;
    padding: 5px;
}
.stTabs [data-baseweb="tab"] {
    border-radius: 10px;
    font-weight: 600;
    font-size: 14px;
    color: #64748b;
    padding: 8px 18px;
    transition: all 0.18s;
}
.stTabs [aria-selected="true"] {
    background: #ffffff !important;
    color: #6366f1 !important;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

/* ── Expanders ── */
[data-testid="stExpander"] {
    border: 1.5px solid #e2e8f0;
    border-radius: 14px;
    overflow: hidden;
    background: #ffffff;
    box-shadow: 0 1px 6px rgba(0,0,0,0.04);
}
[data-testid="stExpander"] summary {
    font-weight: 600;
    color: #334155;
    padding: 14px 18px;
}

/* ── DataFrames ── */
[data-testid="stDataFrame"] { border-radius: 14px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.07); }

/* ── Alerts / Notifications ── */
.stAlert { border-radius: 12px; }

/* ── Dividers ── */
hr { border: none; border-top: 2px solid #f1f5f9; margin: 20px 0; }

/* ── Page header banner ── */
.page-banner {
    background: linear-gradient(135deg, #0f0c29 0%, #302b63 60%, #24243e 100%);
    color: white;
    padding: 28px 32px;
    border-radius: 18px;
    margin-bottom: 28px;
    box-shadow: 0 8px 32px rgba(15,12,41,0.28);
}
.page-banner h1 { margin:0; font-size:26px; font-weight:800; color:#fff; }
.page-banner p  { margin:6px 0 0; font-size:13px; opacity:0.75; color:#fff; }

/* ── Section card ── */
.section-card {
    background: #ffffff;
    border-radius: 16px;
    padding: 24px;
    box-shadow: 0 2px 14px rgba(0,0,0,0.06);
    margin-bottom: 20px;
}

/* ── Status badge helper classes ── */
.badge { display:inline-block; padding:3px 11px; border-radius:20px; font-size:12px; font-weight:700; }
.badge-delivered { background:#d1fae5; color:#065f46; }
.badge-transit   { background:#dbeafe; color:#1e40af; }
.badge-pending   { background:#fef9c3; color:#854d0e; }
.badge-rto       { background:#fee2e2; color:#991b1b; }
.badge-delayed   { background:#ffedd5; color:#9a3412; }

/* ── Sidebar logo block ── */
.sidebar-brand {
    text-align:center;
    padding:18px 12px 20px;
    border-bottom:1px solid rgba(255,255,255,0.08);
    margin-bottom:16px;
}
.sidebar-brand .logo-icon { font-size:38px; display:block; margin-bottom:6px; }
.sidebar-brand .brand-name { font-size:16px; font-weight:800; color:#fff !important; }
.sidebar-brand .brand-sub  { font-size:11px; opacity:0.55; color:#fff !important; }

/* ── Form container ── */
[data-testid="stForm"] {
    background:#fff;
    border-radius:16px;
    padding:24px;
    box-shadow:0 2px 14px rgba(0,0,0,0.05);
    border:1.5px solid #f1f5f9;
}

/* ── Download buttons ── */
.stDownloadButton > button {
    border-radius:10px;
    font-weight:600;
    border:1.5px solid #e2e8f0;
    background:#fff;
    color:#374151;
    transition:all 0.18s;
}
.stDownloadButton > button:hover {
    background:#f8fafc;
    border-color:#6366f1;
    color:#6366f1;
}

/* ── Progress bar ── */
[data-testid="stProgressBar"] > div > div { background:#6366f1; border-radius:6px; }

/* ── Info/Warning/Error styling ── */
.stInfo    { border-left:4px solid #3b82f6 !important; border-radius:10px; }
.stWarning { border-left:4px solid #f59e0b !important; border-radius:10px; }
.stError   { border-left:4px solid #ef4444 !important; border-radius:10px; }
.stSuccess { border-left:4px solid #10b981 !important; border-radius:10px; }


/* ── Hide native Streamlit << collapse button — we use our own ✕ ── */
[data-testid="stSidebarCollapseButton"] {
    display: none !important;
}




/* Extra safety — hide native collapse button no matter what */
button[data-testid="stSidebarCollapseButton"],
[data-testid="stSidebarCollapseButton"] button { display: none !important; }

</style>
"""

st.markdown(THEME_CSS, unsafe_allow_html=True)

# ── FLOATING SIDEBAR TOGGLE (JS) ────────────────────────────
st.markdown("""
<div id="sidebar-open-btn" title="Open Navigation" onclick="toggleSidebar()" style="
    display: none;
    position: fixed;
    top: 50%;
    left: 0;
    transform: translateY(-50%);
    z-index: 999999;
    background: linear-gradient(160deg, #302b63, #0f0c29);
    color: white;
    border: none;
    border-radius: 0 14px 14px 0;
    padding: 18px 10px;
    cursor: pointer;
    box-shadow: 4px 0 18px rgba(0,0,0,0.4);
    font-size: 20px;
    font-weight: bold;
    letter-spacing: 1px;
    transition: all 0.2s ease;
    align-items: center;
    justify-content: center;
    writing-mode: initial;
">&#x276F;&#x276F;</div>

<script>
(function() {
    function getSidebar() {
        return window.parent.document.querySelector('[data-testid="stSidebar"]');
    }

    function isSidebarCollapsed() {
        var sb = getSidebar();
        if (!sb) return false;
        var w = sb.getBoundingClientRect().width;
        return w < 50;
    }

    function updateBtn() {
        var btn = document.getElementById('sidebar-open-btn');
        if (!btn) return;
        btn.style.display = isSidebarCollapsed() ? 'flex' : 'none';
    }

    window.toggleSidebar = function() {
        var doc = window.parent.document;
        // Try multiple known selectors across Streamlit versions
        var selectors = [
            'button[data-testid="collapsedControl"]',
            '[data-testid="collapsedControl"]',
            '[data-testid="stSidebarCollapseButton"] button',
            'section[data-testid="stSidebar"] button'
        ];
        for (var i = 0; i < selectors.length; i++) {
            var el = doc.querySelector(selectors[i]);
            if (el) { el.click(); break; }
        }
        setTimeout(updateBtn, 400);
    };

    // Poll sidebar state every 300ms
    setInterval(updateBtn, 300);
    setTimeout(updateBtn, 500);
})();
</script>
""", unsafe_allow_html=True)


# ── DATA LAKE SETUP ──────────────────────────────────────────
DATA_LAKE = Path("data_lake")
_SUBFOLDERS = ["invoices", "pos", "pods", "grns", "dns", "cns"]
for _sf in _SUBFOLDERS:
    (DATA_LAKE / _sf).mkdir(parents=True, exist_ok=True)

FOLDER_MAP = {
    "Invoice": "invoices", "PO": "pos", "POD": "pods",
    "GRN": "grns", "DN": "dns", "CN": "cns",
}
COLUMN_MAP = {
    "Invoice": "invoice_file_path", "PO": "po_file_path",
    "POD": "pod_file_path",         "GRN": "grn_file_path",
    "DN": "dn_file_path",           "CN": "cn_file_path",
}
FILE_COLUMN_DISPLAY = {
    "po_file_path":      "Purchase Order",
    "invoice_file_path": "Invoice",
    "pod_file_path":     "Proof of Delivery",
    "grn_file_path":     "Goods Received Note",
    "dn_file_path":      "Delivery Note",
    "cn_file_path":      "Credit Note",
}

# ── DATABASE INIT ────────────────────────────────────────────
@st.cache_resource
def init_db():
    database.create_invoice_tracking_table()
    return database.connect_to_duckdb()

conn = init_db()

# ── Schema Migration — add new columns if not exist ──────────
# Rename tracking_id → po_type if old column exists
try:
    conn.execute("ALTER TABLE invoice_tracking RENAME COLUMN tracking_id TO po_type")
    conn.commit()
    logger.info("Renamed tracking_id → po_type")
except Exception:
    pass  # Already renamed or doesn't exist

for _new_col, _col_type in [("po_number", "VARCHAR"), ("po_type", "VARCHAR"), ("tracking_id", "VARCHAR"), ("no_of_box", "INTEGER"), ("location", "VARCHAR"), ("shipment_track_id", "VARCHAR")]:
    try:
        conn.execute(f"ALTER TABLE invoice_tracking ADD COLUMN {_new_col} {_col_type}")
        conn.commit()
        logger.info("Added column: %s", _new_col)
    except Exception:
        pass  # Column already exists — safe to ignore

# ── CACHED DATA HELPERS ──────────────────────────────────────
@st.cache_data(ttl=30, show_spinner=False)
def fetch_all_records() -> pd.DataFrame:
    """Return full invoice_tracking table as DataFrame (cached 30 s)."""
    try:
        cursor = conn.execute("SELECT * FROM invoice_tracking ORDER BY invoice_no")
        rows   = cursor.fetchall()
        cols   = [d[0] for d in cursor.description]
        if not rows:
            return pd.DataFrame(columns=cols)
        df = pd.DataFrame(rows, columns=cols)
        for c in ["dispatched_date", "appointment_date", "po_expiry_date"]:
            if c in df.columns:
                df[c]         = pd.to_datetime(df[c], errors="coerce")
                df[f"{c}_dt"] = df[c].dt.normalize()
        # Apply canonical column order
        ordered = [c for c in COLUMN_ORDER if c in df.columns]
        extras  = [c for c in df.columns if c not in COLUMN_ORDER and not c.endswith("_dt")]
        dt_cols = [c for c in df.columns if c.endswith("_dt")]
        df = df[ordered + extras + dt_cols]
        return df
    except Exception as e:
        logger.error("fetch_all_records error: %s", e)
        return pd.DataFrame()

def invalidate_cache():
    fetch_all_records.clear()

def safe_commit():
    """Commit with error logging; returns True on success."""
    try:
        conn.commit()
        return True
    except Exception as e:
        logger.error("commit error: %s", e)
        return False

# ── STATUS COLOURS FOR COLUMNS ───────────────────────────────
DELIVERY_STATUS_COLORS = {
    "Delivered":  "#d1fae5",
    "In Transit": "#dbeafe",
    "Pending":    "#fef9c3",
    "Delayed":    "#ffedd5",
    "RTO":        "#fee2e2",
    "Cancelled":  "#f3f4f6",
}

# ── SIDEBAR STATE INIT — must be before first use ───────────
if "sidebar_visible" not in st.session_state:
    st.session_state.sidebar_visible = True

# When sidebar is hidden → hide it via CSS and show floating ▶ button
if not st.session_state.sidebar_visible:
    st.markdown("""
    <style>
    [data-testid="stSidebar"]        { display: none !important; }
    [data-testid="collapsedControl"] { display: none !important; }
    /* Style the open button as a fixed left-edge tab */
    div[data-testid="stVerticalBlock"] > div:first-child .stButton > button {
        position: fixed !important;
        top: 48% !important;
        left: 0px !important;
        transform: translateY(-50%) !important;
        z-index: 9999999 !important;
        background: linear-gradient(160deg, #302b63, #0f0c29) !important;
        color: white !important;
        border: none !important;
        border-radius: 0 14px 14px 0 !important;
        padding: 18px 12px !important;
        font-size: 20px !important;
        font-weight: 900 !important;
        box-shadow: 4px 0 18px rgba(0,0,0,0.45) !important;
        cursor: pointer !important;
        min-width: unset !important;
        width: auto !important;
    }
    </style>
    """, unsafe_allow_html=True)
    if st.button("▶", key="btn_open_sidebar", help="Open Navigation"):
        st.session_state.sidebar_visible = True
        st.rerun()

# ── SIDEBAR ──────────────────────────────────────────────────
# Only render sidebar content when visible
if st.session_state.sidebar_visible:
    st.sidebar.markdown(
        """
        <div class="sidebar-brand">
          <span class="logo-icon">🚚</span>
          <div class="brand-name">DesiDiya Tracking</div>
          <div class="brand-sub">Supply Chain Master Tracking</div>
        </div>
        """,
        unsafe_allow_html=True,
    )

PAGES = [
    "🏠  Master Tracking",
    "📤  File Upload & Download",
    "📋  Record Operations",
    "🚨  Exception Queue",
    "📁  Bulk CSV Sync",
]

# Add ✕ close button at bottom of sidebar
if st.session_state.sidebar_visible:
    with st.sidebar:
        st.markdown("""
        <style>
        /* Style the ✕ close button */
        [data-testid="stSidebar"] .stButton > button[title="Collapse sidebar"] {
            background: rgba(255,255,255,0.08) !important;
            color: #e2e8f0 !important;
            border: 1px solid rgba(255,255,255,0.2) !important;
            border-radius: 8px !important;
            width: 100% !important;
            font-size: 13px !important;
            padding: 8px !important;
            transition: background 0.18s !important;
            margin-top: 8px !important;
        }
        [data-testid="stSidebar"] .stButton > button[title="Collapse sidebar"]:hover {
            background: rgba(255,255,255,0.18) !important;
        }
        </style>
        """, unsafe_allow_html=True)
        if st.button("✕  Close Sidebar", key="btn_close_sidebar",
                     help="Collapse sidebar"):
            st.session_state.sidebar_visible = False
            st.rerun()

# Clean navigation — widget key manages state, no manual index syncing
if st.session_state.sidebar_visible:
    page = st.sidebar.radio(
        "Navigation",
        PAGES,
        key="nav_radio",
        label_visibility="collapsed",
    )
    st.sidebar.markdown("---")
    st.sidebar.markdown(
        "<small style='color:rgba(255,255,255,0.4); font-size:11px;'>DesiDiya Tracking v3.0 · DesiDiya</small>",
        unsafe_allow_html=True,
    )
else:
    # When sidebar hidden, keep last selected page from session state
    page = st.session_state.get("nav_radio", PAGES[0])



# ── HELPER: page banner ──────────────────────────────────────
def page_banner(icon: str, title: str, subtitle: str = ""):
    st.markdown(
        f'<div class="page-banner">'
        f'<h1>{icon} {title}</h1>'
        + (f'<p>{subtitle}</p>' if subtitle else '')
        + '</div>',
        unsafe_allow_html=True,
    )

# ════════════════════════════════════════════════════════════
# PAGE: COMMAND CENTER
# ════════════════════════════════════════════════════════════
if page == PAGES[0]:
    page_banner("🏠", "Master Tracking", "Real-time overview of your supply chain")

    df_full = fetch_all_records()

    if df_full.empty:
        st.info("No data in invoice_tracking. Add records via **File Upload & Download**.")
        st.stop()

    # ── Filters ──────────────────────────────────────────────
    # ── Invoice Quick Search (above expander) ─────────────────
    # Callback clears BEFORE next rerun — avoids StreamlitAPIException
    def _clear_inv_search():
        st.session_state["f_inv_search"] = ""

    search_col1, search_col2 = st.columns([3, 1])
    with search_col1:
        search_invoice = st.text_input(
            "🔎 Quick Search by Invoice No.",
            value="",
            key="f_inv_search",
            placeholder="Type full or partial Invoice No. and press Enter…",
        )
    with search_col2:
        st.button(
            "✕ Clear Search",
            key="clear_inv_search",
            type="secondary",
            on_click=_clear_inv_search,
        )

    # ── Highlighted single-invoice result card ─────────────
    if search_invoice.strip():
        inv_results = df_full[
            df_full["invoice_no"].astype(str).str.contains(
                search_invoice.strip(), case=False, na=False
            )
        ].copy()
        if len(inv_results) == 0:
            st.warning(f"⚠️ No invoice found matching **'{search_invoice.strip()}'**")
        else:
            st.markdown(
                f"<div style='background:#f0fdf4;border:1.5px solid #10b981;border-radius:12px;"
                f"padding:10px 18px;margin-bottom:10px;font-size:13px;'>"
                f"✅ <b>{len(inv_results)}</b> result(s) found for "
                f"<code>{search_invoice.strip()}</code> — shown in Master Data View below.</div>",
                unsafe_allow_html=True,
            )

    with st.expander("🔍  Filters & Search", expanded=False):
        fc1, fc2, fc3, fc4, fc5, fc6, fc7 = st.columns(7)
        vendor_opts   = ["All"] + sorted(df_full["vendor_name"].dropna().unique().tolist())
        transport_opts = ["All", "Safe Express", "Shiprocket", "Self Vehicle"]
        po_type_opts  = ["All"] + sorted(df_full["po_type"].dropna().unique().tolist())                         if "po_type" in df_full.columns else ["All"]
        status_opts   = ["All"] + sorted(df_full["delivery_status"].dropna().unique().tolist())

        sel_vendor    = fc1.selectbox("Vendor",          vendor_opts,    key="f_vendor")
        sel_transport = fc2.selectbox("Transport Mode",  transport_opts, key="f_transport")
        sel_po_type   = fc3.selectbox("PO Type",         po_type_opts,   key="f_po_type")
        sel_status    = fc4.selectbox("Delivery Status", status_opts,    key="f_status")
        sel_disp_from = fc5.date_input("Dispatched From", value=None,   key="f_disp_from")
        sel_disp_to   = fc6.date_input("Dispatched To",   value=None,   key="f_disp_to")
        sel_appt_date = fc7.date_input("Appointment Date", value=None,  key="f_appt")

    fdf = df_full.copy()
    # Invoice search takes priority — apply first
    if search_invoice.strip():
        fdf = fdf[fdf["invoice_no"].astype(str).str.contains(
            search_invoice.strip(), case=False, na=False
        )]
    if sel_vendor    != "All": fdf = fdf[fdf["vendor_name"]     == sel_vendor]
    if sel_transport != "All": fdf = fdf[fdf["transport_mode"]  == sel_transport]
    if sel_po_type   != "All": fdf = fdf[fdf["po_type"]         == sel_po_type]
    if sel_status    != "All": fdf = fdf[fdf["delivery_status"] == sel_status]
    if sel_disp_from and "dispatched_date_dt" in fdf.columns:
        fdf = fdf[fdf["dispatched_date_dt"] >= pd.Timestamp(sel_disp_from)]
    if sel_disp_to and "dispatched_date_dt" in fdf.columns:
        fdf = fdf[fdf["dispatched_date_dt"] <= pd.Timestamp(sel_disp_to)]
    if sel_appt_date and "appointment_date_dt" in fdf.columns:
        fdf = fdf[fdf["appointment_date_dt"] == pd.Timestamp(sel_appt_date)]

    # ── KPI Metrics ──────────────────────────────────────────
    today = pd.Timestamp(datetime.date.today())  # Timestamp for datetime64 comparisons
    total_inv    = len(fdf)
    total_amt    = fdf["invoice_amount"].sum() if "invoice_amount" in fdf.columns else 0
    delivered    = int(fdf["delivery_status"].eq("Delivered").sum()) if "delivery_status" in fdf.columns else 0
    pct_delivered = round((delivered / total_inv * 100), 1) if total_inv else 0

    pending_appt_count = 0
    if "appointment_date_dt" in fdf.columns and "delivery_status" in fdf.columns:
        pending_appt_count = int(((fdf["appointment_date_dt"] < today) & (fdf["delivery_status"] != "Delivered")).sum())

    # Count undelivered records with NO appointment date set
    missing_appt_count = 0
    _rto_statuses = ["RTO", "RTO Delivered", "Cancelled"]
    if "delivery_status" in fdf.columns and "appointment_date" in fdf.columns:
        missing_appt_count = int(
            (
                (~fdf["delivery_status"].astype(str).str.strip().isin(["Delivered"] + _rto_statuses)) &
                (fdf["appointment_date"].isna() | (fdf["appointment_date"].astype(str).str.strip().isin(["", "NaT", "nan", "None"])))
            ).sum()
        )

    # Today's pending appointments
    today_appt_count = 0
    if "appointment_date_dt" in fdf.columns and "delivery_status" in fdf.columns:
        today_appt_count = int(
            ((fdf["appointment_date_dt"] == today) & (fdf["delivery_status"] != "Delivered")).sum()
        )


    # Data Quality issue count for KPI summary
    dq_issues_count = 0
    if "delivery_status" in fdf.columns:
        dq_issues_count += int(
            (fdf["delivery_status"].isna() |
             fdf["delivery_status"].astype(str).str.strip().isin(["", "nan", "None", "NaT"])).sum()
        )
    if "tracking_id" in fdf.columns and "delivery_status" in fdf.columns:
        _undelivered_no_track = fdf[
            (~fdf["delivery_status"].astype(str).str.strip().eq("Delivered")) &
            (fdf["tracking_id"].isna() |
             fdf["tracking_id"].astype(str).str.strip().isin(["", "nan", "None", "NaT"]))
        ]
        dq_issues_count += len(_undelivered_no_track)

    k1, k2, k3, k4, k5, k6, k7 = st.columns(7)
    k1.metric("📦 Total Invoices",     f"{total_inv:,}")
    k2.metric("💰 Invoice Value",       f"₹{total_amt:,.0f}")
    k3.metric("✅ Delivered",           f"{delivered:,}")
    k4.metric("📊 Delivery Rate",       f"{pct_delivered}%")
    k5.metric("⚠️ Overdue Appts",      f"{pending_appt_count}", delta=str(-pending_appt_count) if pending_appt_count else None, delta_color="inverse")
    k6.metric("📅 Missing Appt Dates",  f"{missing_appt_count}", delta=str(-missing_appt_count) if missing_appt_count else None, delta_color="inverse")
    k7.metric("🔍 Data Quality Issues", f"{dq_issues_count}", delta=str(-dq_issues_count) if dq_issues_count else None, delta_color="inverse")

    # ── Today's Appointment Banner ────────────────────────────
    if today_appt_count > 0:
        st.markdown(
            f'''<div style="background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;padding:14px 22px;
            border-radius:12px;margin-bottom:12px;display:flex;align-items:center;gap:12px;box-shadow:0 4px 14px rgba(245,158,11,0.35);">
            <span style="font-size:22px;">📆</span>
            <span><b>{today_appt_count} appointment(s) scheduled for TODAY</b> that are still undelivered — take action now!</span>
            </div>''',
            unsafe_allow_html=True,
        )

    st.markdown("---")

    # ── Alert Metrics ─────────────────────────────────────────
    st.markdown("### 🚨 Alert Metrics")
    al1, al2, al3 = st.columns(3)

    # Pending appointments
    with al1:
        if "appointment_date_dt" in fdf.columns:
            pa = fdf[(fdf["appointment_date_dt"] < today) & (fdf["delivery_status"] != "Delivered")]
            if len(pa):
                st.error(f"**{len(pa)} Overdue Appointment(s)**")
                with st.expander("View Details"):
                    cols_show = [c for c in ["invoice_no","po_number","vendor_name","location","po_type","tracking_id","appointment_date","delivery_status","assigned_person"] if c in pa.columns]
                    pa_out = rename_cols(pa[cols_show])
                    df_download_button(rename_cols(pa[cols_show], add_sr_no=False), "overdue_appointments.csv", "⬇️ Export", "dl_pa")
                    st.dataframe(pa_out, width='stretch', hide_index=True)
            else:
                st.success("✅ No overdue appointments")

    # Expiring POs
    with al2:
        if "po_expiry_date_dt" in fdf.columns:
            three_later = today + pd.Timedelta(days=3)
            ep = fdf[(fdf["po_expiry_date_dt"] >= today) & (fdf["po_expiry_date_dt"] <= three_later) & (fdf["delivery_status"] != "Delivered")]
            if len(ep):
                st.warning(f"**{len(ep)} PO(s) Expiring in 3 Days**")
                with st.expander("View Details"):
                    cols_show = [c for c in ["invoice_no","po_number","vendor_name","location","po_type","tracking_id","po_expiry_date","delivery_status","assigned_person"] if c in ep.columns]
                    ep_out = rename_cols(ep[cols_show])
                    df_download_button(rename_cols(ep[cols_show], add_sr_no=False), "expiring_pos.csv", "⬇️ Export", "dl_ep")
                    st.dataframe(ep_out, width='stretch', hide_index=True)
            else:
                st.success("✅ No POs expiring soon")

    # High aging – exclude Delivered, RTO, RTO Delivered (shipment is returning/returned)
    with al3:
        if "dispatched_date_dt" in fdf.columns:
            twenty_ago = today - pd.Timedelta(days=20)
            _ha_exclude_statuses = ["Delivered", "RTO", "RTO Delivered"]
            ha = fdf[
                (fdf["dispatched_date_dt"] < twenty_ago) &
                (~fdf["delivery_status"].astype(str).str.strip().isin(_ha_exclude_statuses))
            ]
            if len(ha):
                st.error(f"**{len(ha)} High-Aging Shipment(s) (>20 days)**")
                with st.expander("View Details"):
                    cols_show = [c for c in ["invoice_no","po_number","vendor_name","location","po_type","tracking_id","dispatched_date","delivery_status","assigned_person"] if c in ha.columns]
                    ha_out = rename_cols(ha[cols_show])
                    df_download_button(rename_cols(ha[cols_show], add_sr_no=False), "high_aging.csv", "⬇️ Export", "dl_ha")
                    st.dataframe(ha_out, width='stretch', hide_index=True)
            else:
                st.success("✅ No high-aging shipments")


    # ── Appointment Alert Center ──────────────────────────────
    st.markdown("---")
    st.markdown("### 📅 Appointment Alert Center")
    st.caption("Tracks appointment compliance for all undelivered POs & Invoices")

    appt_c1, appt_c2, appt_c3 = st.columns(3)

    # ── Missing Appointment Dates ──────────────────────────────
    with appt_c1:
        st.markdown("#### 🔴 Missing Appointment Dates")
        st.caption("Undelivered POs/Invoices with NO appointment date set")
        if "delivery_status" in fdf.columns and "appointment_date" in fdf.columns:
            # Exclude Delivered, RTO, RTO Delivered, Cancelled — no appointment needed
            _appt_exclude = ["Delivered", "RTO", "RTO Delivered", "Cancelled"]
            missing_appt_df = fdf[
                (~fdf["delivery_status"].astype(str).str.strip().isin(_appt_exclude)) &
                (fdf["appointment_date"].isna() | (fdf["appointment_date"].astype(str).str.strip().isin(["", "NaT", "nan", "None"])))
            ].copy()
            if len(missing_appt_df):
                st.error(f"**{len(missing_appt_df)} Invoice(s)/PO(s) have NO appointment date set!**")
                with st.expander(f"📋 View {len(missing_appt_df)} Records — Action Required"):
                    _ma_cols = [c for c in ["invoice_no","po_number","vendor_name","location","po_type",
                                             "tracking_id","dispatched_date","delivery_status","assigned_person"]
                                if c in missing_appt_df.columns]
                    for _dc in ["dispatched_date"]:
                        if _dc in missing_appt_df.columns:
                            missing_appt_df[_dc] = pd.to_datetime(missing_appt_df[_dc], errors="coerce").dt.strftime("%Y-%m-%d").where(missing_appt_df[_dc].notna(), other=None)
                    ma_out = rename_cols(missing_appt_df[_ma_cols])
                    df_download_button(rename_cols(missing_appt_df[_ma_cols], add_sr_no=False), "missing_appointment_dates.csv", "⬇️ Export", "dl_missing_appt")
                    st.dataframe(ma_out, width="stretch", hide_index=True)
                st.markdown(
                    "<small>💡 <b>Action:</b> Go to <b>Record Operations → Edit</b> and set an appointment date for each undelivered PO/Invoice.</small>",
                    unsafe_allow_html=True,
                )
            else:
                st.success("✅ All undelivered invoices have an appointment date set")
        else:
            st.info("No data available.")

    # ── Today's Appointments ──────────────────────────────────
    with appt_c2:
        st.markdown("#### 🟡 Today's Appointments")
        st.caption(f"Appointments scheduled for today: {today.strftime('%d %b %Y')}")
        if "appointment_date_dt" in fdf.columns and "delivery_status" in fdf.columns:
            today_appt_df = fdf[
                (fdf["appointment_date_dt"] == today) &
                (fdf["delivery_status"] != "Delivered")
            ].copy()
            if len(today_appt_df):
                st.warning(f"**{len(today_appt_df)} Appointment(s) scheduled for TODAY — still undelivered!**")
                with st.expander(f"📋 View Today's {len(today_appt_df)} Appointments"):
                    _ta_cols = [c for c in ["invoice_no","po_number","vendor_name","location","po_type",
                                             "tracking_id","appointment_date","delivery_status","assigned_person"]
                                if c in today_appt_df.columns]
                    ta_out = rename_cols(today_appt_df[_ta_cols])
                    df_download_button(rename_cols(today_appt_df[_ta_cols], add_sr_no=False), "todays_appointments.csv", "⬇️ Export", "dl_today_appt")
                    st.dataframe(ta_out, width="stretch", hide_index=True)
            else:
                st.success("✅ No appointments scheduled for today")
        else:
            st.info("No appointment data available.")

    # ── Upcoming Appointments (Next 3 Days) ────────────────────
    with appt_c3:
        st.markdown("#### 🟢 Upcoming Appointments")
        st.caption("Appointments due in the next 1–3 days (undelivered)")
        if "appointment_date_dt" in fdf.columns and "delivery_status" in fdf.columns:
            _tomorrow = today + pd.Timedelta(days=1)
            _next3    = today + pd.Timedelta(days=3)
            upcoming_appt_df = fdf[
                (fdf["appointment_date_dt"] >= _tomorrow) &
                (fdf["appointment_date_dt"] <= _next3) &
                (fdf["delivery_status"] != "Delivered")
            ].copy()
            if len(upcoming_appt_df):
                st.info(f"**{len(upcoming_appt_df)} Appointment(s) due in next 3 days — prepare in advance!**")
                with st.expander(f"📋 View Upcoming {len(upcoming_appt_df)} Appointments"):
                    _ua_cols = [c for c in ["invoice_no","po_number","vendor_name","location","po_type",
                                             "tracking_id","appointment_date","delivery_status","assigned_person"]
                                if c in upcoming_appt_df.columns]
                    ua_out = rename_cols(upcoming_appt_df[_ua_cols])
                    df_download_button(rename_cols(upcoming_appt_df[_ua_cols], add_sr_no=False), "upcoming_appointments.csv", "⬇️ Export", "dl_upcoming_appt")
                    st.dataframe(ua_out, width="stretch", hide_index=True)
            else:
                st.success("✅ No upcoming appointments in next 3 days")
        else:
            st.info("No appointment data available.")

    # ── Pending GRN Alert (row 2) ─────────────────────────────
    st.markdown("---")
    al4, al5 = st.columns([1, 2])

    # Pending GRN: Delivered but GRN not completed
    # Logic: delivery_status == "Delivered" AND
    #        (grn_quantity is 0/null  OR  grn_file_path is null/empty)
    with al4:
        st.markdown("#### 📦 Pending GRN")
        # GRN is considered DONE if ANY ONE of these is true (OR condition):
        #   • grn_quantity > 0
        #   • grn_no is filled (has a value)
        #   • grn_amount  > 0
        if "delivery_status" in fdf.columns:
            _grn_qty_num_p  = pd.to_numeric(fdf.get("grn_quantity", pd.Series([0]*len(fdf))), errors="coerce").fillna(0)
            _grn_amt_num_p  = pd.to_numeric(fdf.get("grn_amount",   pd.Series([0]*len(fdf))), errors="coerce").fillna(0)
            _grn_no_filled  = ~(
                fdf.get("grn_no", pd.Series([""]*len(fdf))).isna() |
                fdf.get("grn_no", pd.Series([""]*len(fdf))).astype(str).str.strip().isin(["", "nan", "None", "NaT"])
            )
            # OR: any signal present means GRN is done
            _grn_complete = (_grn_qty_num_p > 0) | _grn_no_filled | (_grn_amt_num_p > 0)
            pending_grn = fdf[
                (fdf["delivery_status"] == "Delivered") &
                ~_grn_complete
            ].copy()
        else:
            pending_grn = pd.DataFrame()

        if len(pending_grn):
            st.error(f"**{len(pending_grn)} Delivered Invoice(s) with Pending GRN**")
            with st.expander("📋 View Pending GRN Records"):
                grn_cols = [c for c in [
                    "invoice_no", "po_number", "vendor_name", "location", "po_type",
                    "tracking_id", "dispatched_date", "delivery_status",
                    "grn_quantity", "no_of_box", "grn_no", "assigned_person"
                ] if c in pending_grn.columns]

                # Format date for display
                for _dc in ["dispatched_date"]:
                    if _dc in pending_grn.columns:
                        pending_grn[_dc] = pd.to_datetime(
                            pending_grn[_dc], errors="coerce"
                        ).dt.strftime("%Y-%m-%d").where(
                            pending_grn[_dc].notna(), other=None
                        )
                grn_out = rename_cols(pending_grn[grn_cols])
                df_download_button(rename_cols(pending_grn[grn_cols], add_sr_no=False), "pending_grn.csv", "⬇️ Export", "dl_pending_grn")
                st.dataframe(grn_out, width="stretch", hide_index=True)

            # Summary mini-metrics
            total_inv_amt = pd.to_numeric(
                pending_grn.get("invoice_amount", pd.Series()), errors="coerce"
            ).sum()
            st.caption(
                f"💰 Pending GRN Invoice Value: ₹{total_inv_amt:,.0f} &nbsp;|&nbsp; "
                f"📦 Invoices: {len(pending_grn)}"
            )
        else:
            st.success("✅ All delivered invoices have GRN completed")

    with al5:
        st.markdown("#### 📊 GRN Completion Status")
        if "delivery_status" in fdf.columns:
            delivered_df = fdf[fdf["delivery_status"] == "Delivered"].copy()
            if len(delivered_df):
                delivered_df["grn_status"] = delivered_df.apply(
                    lambda r: "GRN Done" if (
                        # OR condition: any one signal means GRN is done
                        pd.to_numeric(r.get("grn_quantity", 0), errors="coerce") > 0 or
                        str(r.get("grn_no", "")).strip() not in ["", "nan", "None", "NaT"] or
                        pd.to_numeric(r.get("grn_amount", 0), errors="coerce") > 0
                    ) else "GRN Pending",
                    axis=1
                )
                grn_status_count = delivered_df["grn_status"].value_counts().reset_index()
                grn_status_count.columns = ["Status", "Count"]

                import plotly.express as px
                fig_grn = px.pie(
                    grn_status_count, values="Count", names="Status",
                    color="Status",
                    color_discrete_map={"GRN Done": "#10b981", "GRN Pending": "#ef4444"},
                    hole=0.5
                )
                fig_grn.update_traces(
                    textposition="outside", textinfo="percent+label",
                    hovertemplate="%{label}: %{value} invoices"
                )
                fig_grn.update_layout(
                    paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
                    margin=dict(l=10, r=10, t=30, b=10),
                    showlegend=True,
                    legend=dict(orientation="h", y=-0.1),
                    height=260,
                    title=dict(text="Delivered Invoices — GRN Completion", font=dict(size=13), x=0.01)
                )
                st.plotly_chart(fig_grn, width='stretch')
            else:
                st.info("No delivered invoices yet.")
        else:
            st.info("No data available.")

    st.markdown("---")


    # ── Data Quality Alerts ──────────────────────────────────────────────────
    st.markdown("---")
    st.markdown("### 🔍 Data Quality Alerts")
    st.caption("Flags records with missing or incomplete critical field values — action required")

    dqa1, dqa2, dqa3, dqa4 = st.columns(4)

    # ── (A) Missing delivery_status ──────────────────────────────────────────
    with dqa1:
        st.markdown("#### 🔴 Missing Delivery Status")
        if "delivery_status" in fdf.columns:
            missing_del_status = fdf[
                fdf["delivery_status"].isna() |
                fdf["delivery_status"].astype(str).str.strip().isin(["", "nan", "None", "NaT"])
            ].copy()
            if len(missing_del_status):
                st.error(f"**{len(missing_del_status)} Record(s) have NO Delivery Status set!**")
                with st.expander(f"📋 View {len(missing_del_status)} Records — Update Required"):
                    _mds_cols = [c for c in [
                        "invoice_no", "po_number", "vendor_name", "location",
                        "po_type", "tracking_id", "dispatched_date", "assigned_person"
                    ] if c in missing_del_status.columns]
                    for _dc in ["dispatched_date"]:
                        if _dc in missing_del_status.columns:
                            missing_del_status[_dc] = pd.to_datetime(
                                missing_del_status[_dc], errors="coerce"
                            ).dt.strftime("%Y-%m-%d").where(missing_del_status[_dc].notna(), other=None)
                    mds_out = rename_cols(missing_del_status[_mds_cols])
                    df_download_button(
                        rename_cols(missing_del_status[_mds_cols], add_sr_no=False),
                        "missing_delivery_status.csv", "⬇️ Export", "dl_missing_del_status"
                    )
                    st.dataframe(mds_out, width="stretch", hide_index=True)
                st.markdown(
                    "<small>💡 <b>Action:</b> Go to <b>Record Operations → Edit</b> and set "
                    "Delivery Status for each flagged record.</small>",
                    unsafe_allow_html=True,
                )
            else:
                st.success("✅ All records have a Delivery Status set")
        else:
            st.info("delivery_status column not found.")

    # ── (B) Missing GRN No. ───────────────────────────────────────────────────
    with dqa2:
        st.markdown("#### 🟠 Missing GRN No.")
        if "grn_no" in fdf.columns:
            # Flag: delivered OR grn_quantity > 0 but GRN No. is blank
            _grn_qty_num = pd.to_numeric(fdf.get("grn_quantity", pd.Series([0]*len(fdf))), errors="coerce").fillna(0)
            _has_grn_activity = (
                (fdf["delivery_status"].astype(str).str.strip() == "Delivered") |
                (_grn_qty_num > 0)
            ) if "delivery_status" in fdf.columns else (_grn_qty_num > 0)

            missing_grn_no = fdf[
                _has_grn_activity &
                (
                    fdf["grn_no"].isna() |
                    fdf["grn_no"].astype(str).str.strip().isin(["", "nan", "None", "NaT"])
                )
            ].copy()

            if len(missing_grn_no):
                st.warning(f"**{len(missing_grn_no)} Delivered/GRN Record(s) have NO GRN No.!**")
                with st.expander(f"📋 View {len(missing_grn_no)} Records — GRN No. Missing"):
                    _mgn_cols = [c for c in [
                        "invoice_no", "po_number", "vendor_name", "location",
                        "po_type", "tracking_id", "delivery_status",
                        "grn_quantity", "grn_no", "assigned_person"
                    ] if c in missing_grn_no.columns]
                    mgn_out = rename_cols(missing_grn_no[_mgn_cols])
                    df_download_button(
                        rename_cols(missing_grn_no[_mgn_cols], add_sr_no=False),
                        "missing_grn_no.csv", "⬇️ Export", "dl_missing_grn_no"
                    )
                    st.dataframe(mgn_out, width="stretch", hide_index=True)
                st.markdown(
                    "<small>💡 <b>Action:</b> Go to <b>Record Operations → Edit</b> and fill in "
                    "the GRN No. for each record that has been received/delivered.</small>",
                    unsafe_allow_html=True,
                )
            else:
                st.success("✅ All GRN-processed records have a GRN No.")
        else:
            st.info("grn_no column not found.")

    # ── (C) DN Qty > 0 but DN Status missing ────────────────────────────────
    with dqa3:
        st.markdown("#### 🟡 Missing DN Status")
        if "dn_quantity" in fdf.columns and "dn_status" in fdf.columns:
            _dn_qty_num = pd.to_numeric(fdf["dn_quantity"], errors="coerce").fillna(0)
            missing_dn_status = fdf[
                (_dn_qty_num > 0) &
                (
                    fdf["dn_status"].isna() |
                    fdf["dn_status"].astype(str).str.strip().isin(["", "nan", "None", "NaT"])
                )
            ].copy()

            if len(missing_dn_status):
                st.warning(f"**{len(missing_dn_status)} Record(s) have DN Qty but NO DN Status!**")
                with st.expander(f"📋 View {len(missing_dn_status)} Records — DN Status Missing"):
                    _mdn_cols = [c for c in [
                        "invoice_no", "po_number", "vendor_name", "po_type",
                        "tracking_id", "delivery_status", "invoice_quantity",
                        "grn_quantity", "dn_quantity", "dn_status", "assigned_person"
                    ] if c in missing_dn_status.columns]
                    mdn_out = rename_cols(missing_dn_status[_mdn_cols])
                    df_download_button(
                        rename_cols(missing_dn_status[_mdn_cols], add_sr_no=False),
                        "missing_dn_status.csv", "⬇️ Export", "dl_missing_dn_status"
                    )
                    st.dataframe(mdn_out, width="stretch", hide_index=True)
                # Quick resolve button that jumps to Exception Queue
                st.markdown(
                    "<small>💡 <b>Action:</b> Go to <b>Exception Queue</b> to set DN Status "
                    "(Open / In Progress / Closed) or use <b>Record Operations → Edit</b>.</small>",
                    unsafe_allow_html=True,
                )
                # Inline quick-close form
                with st.expander("⚡ Quick-Set DN Status for Flagged Records"):
                    dn_inv_opts = missing_dn_status["invoice_no"].tolist()
                    sel_dn_inv  = st.selectbox("Select Invoice", dn_inv_opts, key="dqa_dn_inv_sel")
                    _dn_set_status = st.selectbox(
                        "Set DN Status to",
                        ["Open", "In Progress", "Closed"],
                        key="dqa_dn_status_val"
                    )
                    if st.button("💾 Apply DN Status", key="dqa_dn_apply_btn", type="primary"):
                        try:
                            conn.execute(
                                "UPDATE invoice_tracking SET dn_status = ? WHERE invoice_no = ?",
                                (_dn_set_status, sel_dn_inv)
                            )
                            if safe_commit():
                                invalidate_cache()
                                st.success(f"✅ DN Status set to **{_dn_set_status}** for **{sel_dn_inv}**")
                                st.rerun()
                            else:
                                st.error("Commit failed. Please retry.")
                        except Exception as _e:
                            st.error(f"Update error: {_e}")
            else:
                st.success("✅ All records with DN Qty have a DN Status set")
        else:
            st.info("dn_quantity / dn_status columns not found.")

    # ── (D) Missing Tracking ID ──────────────────────────────────────────────
    with dqa4:
        st.markdown("#### 🔵 Missing Tracking ID")
        if "tracking_id" in fdf.columns:
            missing_tracking = fdf[
                fdf["tracking_id"].isna() |
                fdf["tracking_id"].astype(str).str.strip().isin(["", "nan", "None", "NaT"])
            ].copy()
            # Exclude already-delivered records if desired — or show all
            # Show all undelivered missing tracking
            if "delivery_status" in fdf.columns:
                missing_tracking = missing_tracking[
                    ~missing_tracking["delivery_status"].astype(str).str.strip().eq("Delivered")
                ]

            if len(missing_tracking):
                st.info(f"**{len(missing_tracking)} Undelivered Record(s) have NO Tracking ID!**")
                with st.expander(f"📋 View {len(missing_tracking)} Records — Tracking ID Missing"):
                    _mtr_cols = [c for c in [
                        "invoice_no", "po_number", "vendor_name", "location",
                        "po_type", "transport_mode", "dispatched_date",
                        "delivery_status", "assigned_person"
                    ] if c in missing_tracking.columns]
                    for _dc in ["dispatched_date"]:
                        if _dc in missing_tracking.columns:
                            missing_tracking[_dc] = pd.to_datetime(
                                missing_tracking[_dc], errors="coerce"
                            ).dt.strftime("%Y-%m-%d").where(missing_tracking[_dc].notna(), other=None)
                    mtr_out = rename_cols(missing_tracking[_mtr_cols])
                    df_download_button(
                        rename_cols(missing_tracking[_mtr_cols], add_sr_no=False),
                        "missing_tracking_id.csv", "⬇️ Export", "dl_missing_tracking"
                    )
                    st.dataframe(mtr_out, width="stretch", hide_index=True)
                st.markdown(
                    "<small>💡 <b>Action:</b> Obtain the courier tracking number and update via "
                    "<b>Record Operations → Edit</b>.</small>",
                    unsafe_allow_html=True,
                )
            else:
                st.success("✅ All undelivered records have a Tracking ID")
        else:
            st.info("tracking_id column not found.")

    # ── Row 2: Document Alerts (B) ────────────────────────────────────────────
    st.markdown("---")
    st.markdown("#### 📎 Document Completeness Alerts")
    st.caption("Flags records with missing critical document attachments")
    dqb1, dqb2, dqb3 = st.columns(3)

    def _is_file_missing(series):
        return series.isna() | series.astype(str).str.strip().isin(["", "nan", "None", "NaT"])

    # ── (B1) Missing Invoice Document ────────────────────────────────────────
    with dqb1:
        st.markdown("##### 🧾 Missing Invoice Document")
        if "invoice_file_path" in fdf.columns:
            _excl_inv_doc = ["Cancelled", "RTO", "RTO Delivered"]
            missing_inv_doc = fdf[
                (~fdf["delivery_status"].astype(str).str.strip().isin(_excl_inv_doc)) &
                _is_file_missing(fdf["invoice_file_path"])
            ].copy()
            if len(missing_inv_doc):
                st.error(f"**{len(missing_inv_doc)} Record(s) missing Invoice document!**")
                with st.expander(f"📋 View {len(missing_inv_doc)} Records"):
                    _bid_cols = [c for c in ["invoice_no","po_number","vendor_name","location","po_type","delivery_status","assigned_person"] if c in missing_inv_doc.columns]
                    st.dataframe(rename_cols(missing_inv_doc[_bid_cols]), width="stretch", hide_index=True)
                    df_download_button(rename_cols(missing_inv_doc[_bid_cols], add_sr_no=False), "missing_invoice_doc.csv", "⬇️ Export", "dl_miss_inv_doc")
                st.markdown("<small>💡 <b>Action:</b> Upload the Invoice PDF via <b>File Upload & Download → Upload Document</b>.</small>", unsafe_allow_html=True)
            else:
                st.success("✅ All active records have Invoice document")
        else:
            st.caption("invoice_file_path column not in DB yet.")

    # ── (B2) Missing DN Document (when DN Qty > 0) ───────────────────────────
    with dqb2:
        st.markdown("##### 📄 Missing DN Document")
        if "dn_file_path" in fdf.columns and "dn_quantity" in fdf.columns:
            _dn_qty_n = pd.to_numeric(fdf["dn_quantity"], errors="coerce").fillna(0)
            missing_dn_doc = fdf[
                (_dn_qty_n > 0) &
                _is_file_missing(fdf["dn_file_path"])
            ].copy()
            if len(missing_dn_doc):
                st.warning(f"**{len(missing_dn_doc)} Record(s) have DN Qty but no DN Document!**")
                with st.expander(f"📋 View {len(missing_dn_doc)} Records"):
                    _bdd_cols = [c for c in ["invoice_no","po_number","vendor_name","dn_quantity","dn_status","delivery_status","assigned_person"] if c in missing_dn_doc.columns]
                    st.dataframe(rename_cols(missing_dn_doc[_bdd_cols]), width="stretch", hide_index=True)
                    df_download_button(rename_cols(missing_dn_doc[_bdd_cols], add_sr_no=False), "missing_dn_doc.csv", "⬇️ Export", "dl_miss_dn_doc")
                st.markdown("<small>💡 <b>Action:</b> Upload the Debit Note PDF via <b>File Upload & Download → Upload Document</b>.</small>", unsafe_allow_html=True)
            else:
                st.success("✅ All records with DN Qty have DN document")
        else:
            st.caption("dn_file_path / dn_quantity column not found.")

    # ── (B3) Missing POD Document (for Delivered records) ────────────────────
    with dqb3:
        st.markdown("##### 📦 Missing POD Document")
        if "pod_file_path" in fdf.columns and "delivery_status" in fdf.columns:
            missing_pod_doc = fdf[
                (fdf["delivery_status"].astype(str).str.strip() == "Delivered") &
                _is_file_missing(fdf["pod_file_path"])
            ].copy()
            if len(missing_pod_doc):
                st.warning(f"**{len(missing_pod_doc)} Delivered Record(s) missing POD document!**")
                with st.expander(f"📋 View {len(missing_pod_doc)} Records"):
                    _bpd_cols = [c for c in ["invoice_no","po_number","vendor_name","location","delivery_status","grn_no","assigned_person"] if c in missing_pod_doc.columns]
                    st.dataframe(rename_cols(missing_pod_doc[_bpd_cols]), width="stretch", hide_index=True)
                    df_download_button(rename_cols(missing_pod_doc[_bpd_cols], add_sr_no=False), "missing_pod_doc.csv", "⬇️ Export", "dl_miss_pod_doc")
                st.markdown("<small>💡 <b>Action:</b> Upload the Proof of Delivery via <b>File Upload & Download → Upload Document</b>.</small>", unsafe_allow_html=True)
            else:
                st.success("✅ All delivered records have POD document")
        else:
            st.caption("pod_file_path / delivery_status column not found.")

    # ── Row 3: Additional DQ Alerts (C) ───────────────────────────────────────
    st.markdown("---")
    st.markdown("#### ⚙️ Advanced Data Quality Checks")
    st.caption("Structural & business-rule violations that indicate data entry errors")
    dqc1, dqc2, dqc3, dqc4 = st.columns(4)

    # ── (C1) GRN Qty > Invoice Qty (data integrity) ───────────────────────────
    with dqc1:
        st.markdown("##### 🔢 GRN Qty > Invoice Qty")
        if "invoice_quantity" in fdf.columns and "grn_quantity" in fdf.columns:
            _iq = pd.to_numeric(fdf["invoice_quantity"], errors="coerce").fillna(0)
            _gq = pd.to_numeric(fdf["grn_quantity"],     errors="coerce").fillna(0)
            grn_excess = fdf[(_gq > _iq) & (_iq > 0)].copy()
            if len(grn_excess):
                st.error(f"**{len(grn_excess)} Record(s) where GRN Qty exceeds Invoice Qty!**")
                with st.expander(f"📋 View {len(grn_excess)} Records"):
                    _gex_cols = [c for c in ["invoice_no","po_number","vendor_name","invoice_quantity","grn_quantity","delivery_status","assigned_person"] if c in grn_excess.columns]
                    st.dataframe(rename_cols(grn_excess[_gex_cols]), width="stretch", hide_index=True)
                    df_download_button(rename_cols(grn_excess[_gex_cols], add_sr_no=False), "grn_exceeds_invoice.csv", "⬇️ Export", "dl_grn_excess")
                st.markdown("<small>💡 GRN quantity cannot exceed invoice quantity — verify and correct in <b>Record Operations</b>.</small>", unsafe_allow_html=True)
            else:
                st.success("✅ No GRN qty exceeding invoice qty")
        else:
            st.caption("invoice_quantity / grn_quantity not found.")

    # ── (C2) Missing Vendor Name ──────────────────────────────────────────────
    with dqc2:
        st.markdown("##### 🏢 Missing Vendor Name")
        if "vendor_name" in fdf.columns:
            missing_vendor = fdf[
                fdf["vendor_name"].isna() |
                fdf["vendor_name"].astype(str).str.strip().isin(["", "nan", "None", "NaT"])
            ].copy()
            if len(missing_vendor):
                st.warning(f"**{len(missing_vendor)} Record(s) have NO Vendor Name!**")
                with st.expander(f"📋 View {len(missing_vendor)} Records"):
                    _mvn_cols = [c for c in ["invoice_no","po_number","location","po_type","delivery_status","dispatched_date","assigned_person"] if c in missing_vendor.columns]
                    st.dataframe(rename_cols(missing_vendor[_mvn_cols]), width="stretch", hide_index=True)
                    df_download_button(rename_cols(missing_vendor[_mvn_cols], add_sr_no=False), "missing_vendor.csv", "⬇️ Export", "dl_miss_vendor")
                st.markdown("<small>💡 <b>Action:</b> Update vendor name via <b>Record Operations → Edit</b>.</small>", unsafe_allow_html=True)
            else:
                st.success("✅ All records have a Vendor Name")
        else:
            st.caption("vendor_name column not found.")

    # ── (C3) Missing Assigned Person (for active/in-transit shipments) ────────
    with dqc3:
        st.markdown("##### 👤 Unassigned Active Shipments")
        if "assigned_person" in fdf.columns and "delivery_status" in fdf.columns:
            _active_statuses = ["Pending", "In Transit", "Delayed"]
            missing_assign = fdf[
                fdf["delivery_status"].astype(str).str.strip().isin(_active_statuses) &
                (
                    fdf["assigned_person"].isna() |
                    fdf["assigned_person"].astype(str).str.strip().isin(["", "nan", "None", "NaT"])
                )
            ].copy()
            if len(missing_assign):
                st.warning(f"**{len(missing_assign)} Active Shipment(s) have NO assigned person!**")
                with st.expander(f"📋 View {len(missing_assign)} Records"):
                    _mas_cols = [c for c in ["invoice_no","po_number","vendor_name","location","po_type","tracking_id","delivery_status","dispatched_date"] if c in missing_assign.columns]
                    st.dataframe(rename_cols(missing_assign[_mas_cols]), width="stretch", hide_index=True)
                    df_download_button(rename_cols(missing_assign[_mas_cols], add_sr_no=False), "unassigned_shipments.csv", "⬇️ Export", "dl_miss_assign")
                st.markdown("<small>💡 <b>Action:</b> Assign a responsible person via <b>Record Operations → Edit</b>.</small>", unsafe_allow_html=True)
            else:
                st.success("✅ All active shipments are assigned")
        else:
            st.caption("assigned_person / delivery_status column not found.")

    # ── (C4) Invoice Amount = 0 or Null ──────────────────────────────────────
    with dqc4:
        st.markdown("##### 💰 Zero / Missing Invoice Amount")
        if "invoice_amount" in fdf.columns:
            _excl_zero = ["Cancelled", "RTO", "RTO Delivered"]
            _ia = pd.to_numeric(fdf["invoice_amount"], errors="coerce").fillna(0)
            missing_amount = fdf[
                (~fdf["delivery_status"].astype(str).str.strip().isin(_excl_zero)) &
                ((_ia == 0) | fdf["invoice_amount"].isna())
            ].copy()
            if len(missing_amount):
                st.warning(f"**{len(missing_amount)} Record(s) have Zero / No Invoice Amount!**")
                with st.expander(f"📋 View {len(missing_amount)} Records"):
                    _mia_cols = [c for c in ["invoice_no","po_number","vendor_name","po_type","delivery_status","dispatched_date","assigned_person"] if c in missing_amount.columns]
                    st.dataframe(rename_cols(missing_amount[_mia_cols]), width="stretch", hide_index=True)
                    df_download_button(rename_cols(missing_amount[_mia_cols], add_sr_no=False), "zero_invoice_amount.csv", "⬇️ Export", "dl_zero_amount")
                st.markdown("<small>💡 <b>Action:</b> Update the invoice amount via <b>Record Operations → Edit</b>.</small>", unsafe_allow_html=True)
            else:
                st.success("✅ All active records have a valid Invoice Amount")
        else:
            st.caption("invoice_amount column not found.")

    # ── Master Data Table ─────────────────────────────────────
    # Dynamic section title — shows search context if active
    if search_invoice.strip():
        st.markdown(f"### 📋 Master Data View — Search: `{search_invoice.strip()}`")
    else:
        st.markdown("### 📋 Master Data View")

    disp_df = fdf.copy()
    for c in ["dispatched_date", "appointment_date", "po_expiry_date"]:
        if c in disp_df.columns:
            disp_df[c] = pd.to_datetime(disp_df[c], errors="coerce").dt.strftime("%Y-%m-%d").where(disp_df[c].notna(), other=None)
    # Remove _dt helper cols, file path cols and shipment_track_id from display
    _hide_cols = (
        [c for c in disp_df.columns if c.endswith("_dt")] +
        list(FILE_COLUMN_DISPLAY.keys()) +
        ["shipment_track_id"]
    )
    disp_df = disp_df.drop(columns=_hide_cols, errors="ignore")
    disp_df = reorder_df(disp_df)   # apply canonical column order

    # Download + table row
    ms_c1, ms_c2 = st.columns([0.85, 0.15])
    with ms_c2:
        df_download_button(rename_cols(disp_df, add_sr_no=False), "master_data.csv", "⬇️ Export CSV", "dl_master_view")
    selection = st.dataframe(
        rename_cols(disp_df),
        on_select="rerun",
        selection_mode="single-row",
        width='stretch',
        hide_index=True,
    )


    st.markdown("---")
    st.markdown("### 📊 Analytics Dashboard")

    if len(fdf) > 0:
        chart_tab1, chart_tab2, chart_tab3, chart_tab4 = st.tabs([
            "🚦 Delivery Status", "💰 Financial Summary", "🚛 Transport Analysis", "📅 Aging & Timeline"
        ])

        # ── Tab 1: Delivery Status ──────────────────────────────
        with chart_tab1:
            ch1, ch2 = st.columns(2)

            with ch1:
                st.markdown("**Delivery Status Distribution**")
                if "delivery_status" in fdf.columns:
                    status_counts = fdf["delivery_status"].fillna("Unknown").value_counts().reset_index()
                    status_counts.columns = ["Status", "Count"]
                    STATUS_COLORS = {
                        "Delivered": "#10b981", "In Transit": "#3b82f6",
                        "Pending": "#f59e0b",   "Delayed": "#f97316",
                        "RTO": "#ef4444",        "Cancelled": "#94a3b8",
                        "Unknown": "#cbd5e1"
                    }
                    color_map = {s: STATUS_COLORS.get(s, "#6366f1") for s in status_counts["Status"]}
                    fig_pie = px.pie(status_counts, values="Count", names="Status",
                                    color="Status", color_discrete_map=color_map,
                                    hole=0.42)
                    fig_pie.update_traces(textposition="outside", textinfo="percent+label",
                                          hovertemplate="%{label}: %{value} invoices (%{percent})")
                    make_chart_plotly(fig_pie, "Delivery Status Breakdown")
                    df_download_button(status_counts, "delivery_status.csv", "⬇️ Export", "dl_del_status")

            with ch2:
                st.markdown("**Invoice Status Distribution**")
                if "invoice_status" in fdf.columns:
                    inv_status = fdf["invoice_status"].fillna("Unknown").value_counts().reset_index()
                    inv_status.columns = ["Status", "Count"]
                    fig_inv = px.bar(inv_status, x="Status", y="Count", color="Status",
                                     color_discrete_sequence=px.colors.qualitative.Pastel,
                                     text="Count")
                    fig_inv.update_traces(textposition="outside")
                    fig_inv.update_layout(showlegend=False, xaxis_title="", yaxis_title="Invoices")
                    make_chart_plotly(fig_inv, "Invoice Status Breakdown")
                    df_download_button(inv_status, "invoice_status.csv", "⬇️ Export", "dl_inv_status")

        # ── Tab 2: Financial Summary ────────────────────────────
        with chart_tab2:
            ch3, ch4 = st.columns(2)

            with ch3:
                st.markdown("**Invoice Amount by Vendor (Top 10)**")
                if "vendor_name" in fdf.columns and "invoice_amount" in fdf.columns:
                    vendor_amt = (fdf.groupby("vendor_name", as_index=False)["invoice_amount"]
                                    .sum()
                                    .dropna()
                                    .sort_values("invoice_amount", ascending=False)
                                    .head(10))
                    vendor_amt.columns = ["Vendor", "Invoice Amount (₹)"]
                    fig_bar = px.bar(vendor_amt, x="Invoice Amount (₹)", y="Vendor",
                                     orientation="h",
                                     color="Invoice Amount (₹)",
                                     color_continuous_scale="Blues",
                                     text=vendor_amt["Invoice Amount (₹)"].apply(lambda x: f"₹{x:,.0f}"))
                    fig_bar.update_traces(textposition="outside")
                    fig_bar.update_layout(yaxis={"categoryorder": "total ascending"},
                                          coloraxis_showscale=False, xaxis_title="Amount (₹)", yaxis_title="")
                    make_chart_plotly(fig_bar, "Top 10 Vendors by Invoice Amount")
                    df_download_button(vendor_amt, "vendor_amounts.csv", "⬇️ Export", "dl_vendor_amt")

            with ch4:
                st.markdown("**GRN vs Invoice Quantity Gap**")
                if all(c in fdf.columns for c in ["invoice_quantity", "grn_quantity", "invoice_no"]):
                    qty_df = fdf[["invoice_no", "vendor_name", "invoice_quantity", "grn_quantity"]].dropna(subset=["invoice_quantity"])
                    qty_df = qty_df.copy()
                    qty_df["invoice_quantity"] = pd.to_numeric(qty_df["invoice_quantity"], errors="coerce").fillna(0)
                    qty_df["grn_quantity"]     = pd.to_numeric(qty_df["grn_quantity"],     errors="coerce").fillna(0)
                    qty_df["gap"]              = qty_df["invoice_quantity"] - qty_df["grn_quantity"]
                    gap_df = qty_df[qty_df["gap"] != 0].sort_values("gap", ascending=False).head(10)
                    if len(gap_df):
                        fig_gap = px.bar(gap_df, x="invoice_no", y="gap",
                                         color="gap",
                                         color_continuous_scale=["#10b981", "#f59e0b", "#ef4444"],
                                         labels={"invoice_no": "Invoice", "gap": "Qty Gap"},
                                         text="gap")
                        fig_gap.update_traces(textposition="outside")
                        fig_gap.update_layout(xaxis_tickangle=-35, coloraxis_showscale=False)
                        make_chart_plotly(fig_gap, "Invoice vs GRN Quantity Gap")
                        df_download_button(gap_df, "quantity_gaps.csv", "⬇️ Export", "dl_qty_gap")
                    else:
                        st.success("✅ No quantity gaps found!")

        # ── Tab 3: Transport Analysis ───────────────────────────
        with chart_tab3:
            ch5, ch6 = st.columns(2)

            with ch5:
                st.markdown("**Shipments by Transport Mode**")
                if "transport_mode" in fdf.columns:
                    transport_cnt = fdf["transport_mode"].fillna("Not Set").value_counts().reset_index()
                    transport_cnt.columns = ["Mode", "Shipments"]
                    TRANSPORT_COLORS = {
                        "Safe Express": "#6366f1", "Shiprocket": "#f59e0b",
                        "Self Vehicle": "#10b981", "Not Set": "#cbd5e1"
                    }
                    fig_tm = px.pie(transport_cnt, values="Shipments", names="Mode",
                                    color="Mode",
                                    color_discrete_map={m: TRANSPORT_COLORS.get(m, "#64748b") for m in transport_cnt["Mode"]},
                                    hole=0.38)
                    fig_tm.update_traces(textposition="outside", textinfo="percent+label")
                    make_chart_plotly(fig_tm, "Transport Mode Share")
                    df_download_button(transport_cnt, "transport_mode.csv", "⬇️ Export", "dl_transport")

            with ch6:
                st.markdown("**Deliveries by Assigned Person**")
                if "assigned_person" in fdf.columns:
                    person_df = fdf.groupby(["assigned_person", "delivery_status"]).size().reset_index(name="Count")
                    person_df = person_df[person_df["assigned_person"].notna()]
                    if len(person_df):
                        fig_person = px.bar(person_df, x="assigned_person", y="Count",
                                            color="delivery_status",
                                            color_discrete_map={
                                                "Delivered": "#10b981", "In Transit": "#3b82f6",
                                                "Pending": "#f59e0b", "Delayed": "#f97316",
                                                "RTO": "#ef4444", "Cancelled": "#94a3b8"
                                            },
                                            barmode="stack",
                                            labels={"assigned_person": "Person", "delivery_status": "Status"})
                        fig_person.update_layout(xaxis_tickangle=-25, xaxis_title="", yaxis_title="Shipments")
                        make_chart_plotly(fig_person, "Workload by Assigned Person")
                        df_download_button(person_df, "person_deliveries.csv", "⬇️ Export", "dl_person")
                    else:
                        st.info("No assigned person data available.")

        # ── Tab 4: Aging & Timeline ─────────────────────────────
        with chart_tab4:
            ch7, ch8 = st.columns(2)

            with ch7:
                st.markdown("**Shipment Aging Analysis (Undelivered)**")
                if "dispatched_date" in fdf.columns and "delivery_status" in fdf.columns:
                    _aging_exclude = ["Delivered", "RTO", "RTO Delivered"]
                    aging_df = fdf[~fdf["delivery_status"].astype(str).str.strip().isin(_aging_exclude)].copy()
                    aging_df["dispatched_date"] = pd.to_datetime(aging_df["dispatched_date"], errors="coerce")
                    aging_df = aging_df.dropna(subset=["dispatched_date"])
                    if len(aging_df):
                        aging_df["age_days"] = (pd.Timestamp.today() - aging_df["dispatched_date"]).dt.days
                        bins = [0, 7, 15, 20, 30, 60, 9999]
                        labels = ["0-7d", "8-15d", "16-20d", "21-30d", "31-60d", "60d+"]
                        aging_df["bucket"] = pd.cut(aging_df["age_days"], bins=bins, labels=labels, right=True)
                        bucket_cnt = aging_df["bucket"].value_counts().sort_index().reset_index()
                        bucket_cnt.columns = ["Age Bucket", "Count"]
                        AGING_COLORS = ["#10b981","#3b82f6","#f59e0b","#f97316","#ef4444","#7f1d1d"]
                        fig_aging = px.bar(bucket_cnt, x="Age Bucket", y="Count",
                                           color="Age Bucket",
                                           color_discrete_sequence=AGING_COLORS,
                                           text="Count")
                        fig_aging.update_traces(textposition="outside")
                        fig_aging.update_layout(showlegend=False, xaxis_title="", yaxis_title="Shipments")
                        make_chart_plotly(fig_aging, "Undelivered Shipment Aging")
                        df_download_button(bucket_cnt, "aging_analysis.csv", "⬇️ Export", "dl_aging")
                    else:
                        st.success("✅ All shipments delivered!")

            with ch8:
                st.markdown("**Monthly Dispatch Volume**")
                if "dispatched_date" in fdf.columns:
                    monthly = fdf.copy()
                    monthly["dispatched_date"] = pd.to_datetime(monthly["dispatched_date"], errors="coerce")
                    monthly = monthly.dropna(subset=["dispatched_date"])
                    if len(monthly):
                        monthly["month"] = monthly["dispatched_date"].dt.to_period("M").astype(str)
                        monthly_cnt = monthly.groupby("month").size().reset_index(name="Dispatched")
                        fig_line = px.line(monthly_cnt, x="month", y="Dispatched",
                                           markers=True,
                                           color_discrete_sequence=["#6366f1"],
                                           labels={"month": "Month", "Dispatched": "Shipments"})
                        fig_line.update_traces(line_width=2.5, marker_size=7)
                        fig_line.update_layout(xaxis_tickangle=-30)
                        make_chart_plotly(fig_line, "Monthly Dispatch Trend")
                        df_download_button(monthly_cnt, "monthly_dispatch.csv", "⬇️ Export", "dl_monthly")
                    else:
                        st.info("No dispatch date data available.")

    # ── Summary Table — Top Pending Invoices ──────────────────
    st.markdown("---")
    st.markdown("### 🔴 Top Pending & At-Risk Invoices")
    risk_df = fdf[fdf["delivery_status"].isin(["Pending", "Delayed", "In Transit"])].copy()
    if len(risk_df):
        risk_display_cols = [c for c in ["invoice_no","po_number","vendor_name",
                                          "dispatched_date","appointment_date",
                                          "po_type","delivery_status","assigned_person"] if c in risk_df.columns]
        for dc in ["dispatched_date","appointment_date"]:
            if dc in risk_df.columns:
                risk_df[dc] = pd.to_datetime(risk_df[dc], errors="coerce").dt.strftime("%Y-%m-%d").where(risk_df[dc].notna(), other=None)
        risk_out = rename_cols(risk_df[risk_display_cols])
        rc1, rc2 = st.columns([0.85, 0.15])
        with rc2:
            df_download_button(risk_out, "at_risk_invoices.csv", "⬇️ Export", "dl_risk")
        st.dataframe(risk_out, width="stretch", hide_index=True)
    else:
        st.success("✅ No pending or at-risk invoices.")

    # ── Action Panel ──────────────────────────────────────────
    sel_rows = selection.get("selection", {}).get("rows", [])
    if sel_rows:
        sel_idx     = sel_rows[0]
        sel_row     = fdf.iloc[sel_idx]
        sel_invoice = sel_row["invoice_no"]

        st.markdown(f"### 🛠️ Action Panel — Invoice `{sel_invoice}`")
        ap_c1, ap_c2 = st.columns(2)

        with ap_c1:
            st.markdown("**📎 Document Downloads**")
            for col_key, display_name in FILE_COLUMN_DISPLAY.items():
                fp = sel_row.get(col_key)
                if fp and pd.notna(fp):
                    abs_p = os.path.abspath(str(fp))
                    if os.path.exists(abs_p):
                        with open(abs_p, "rb") as fh:
                            st.download_button(
                                f"📥 {display_name}",
                                data=fh.read(),
                                file_name=os.path.basename(abs_p),
                                mime="application/octet-stream",
                                key=f"dl_{col_key}_{sel_invoice}",
                                width='stretch',
                            )
                    else:
                        st.caption(f"⚠️ {display_name} — file not found on disk")
                else:
                    st.caption(f"🔗 {display_name} — not uploaded yet")

        with ap_c2:
            st.markdown("**⚡ Quick Actions**")

            def _go_edit(inv):
                st.session_state.record_select = f"{inv} (Invoice)"
                st.session_state.nav_radio     = PAGES[2]

            st.button("✏️ Edit Record",   width='stretch', on_click=_go_edit,   args=(sel_invoice,), key=f"edit_{sel_invoice}")

            if st.button("🗑️ Delete Record", width='stretch', type="secondary", key=f"del_{sel_invoice}"):
                try:
                    if database.delete_invoice(sel_invoice):
                        invalidate_cache()
                        st.toast(f"Invoice '{sel_invoice}' deleted.", icon="🗑️")
                        st.rerun()
                    else:
                        st.warning("Invoice not found for deletion.")
                except Exception as e:
                    st.error(f"Delete error: {e}")

            st.markdown("**📊 Record Details**")
            detail_fields = {
                "Vendor":          sel_row.get("vendor_name"),
                "Location":        sel_row.get("location"),
                "Transport":       sel_row.get("transport_mode"),
                "Delivery Status": sel_row.get("delivery_status"),
                "Invoice Status":  sel_row.get("invoice_status"),
                "Invoice Qty":     sel_row.get("invoice_quantity"),
                "GRN Qty":         sel_row.get("grn_quantity"),
                "No. of Boxes":    sel_row.get("no_of_box"),
                "Invoice Amount":  f"₹{sel_row.get('invoice_amount', 0):,.2f}" if sel_row.get("invoice_amount") else "—",
            }
            for lbl, val in detail_fields.items():
                if val and str(val) not in ("None", "nan", "0", "0.0"):
                    st.write(f"**{lbl}:** {val}")

# ════════════════════════════════════════════════════════════
# PAGE: DATA ENTRY & FILE UPLOAD
# ════════════════════════════════════════════════════════════
elif page == PAGES[1]:
    page_banner("📤", "File Upload & Download", "Upload documents, create invoice records, and download attachments")

    tab_upload, tab_new, tab_doc_dl = st.tabs(["📎 Upload Document to Existing Invoice", "➕ Insert New Invoice", "📥 Document Download"])

    with tab_upload:
        st.markdown("Attach a document file to an already-existing invoice record.")
        with st.form("upload_form"):
            u1, u2 = st.columns(2)
            invoice_no_up = u1.text_input("Invoice Number *", placeholder="e.g. INV-2024-001")
            doc_type      = u2.selectbox("Document Type *", list(FOLDER_MAP.keys()),
                                         help="Select which document type you are uploading")
            uploaded_file = st.file_uploader(
                f"Choose file for {doc_type}",
                type=["pdf", "png", "jpg", "jpeg", "doc", "docx", "xls", "xlsx"],
            )
            submitted_up = st.form_submit_button("⬆️ Upload & Update Database", type="primary")

            if submitted_up:
                if not invoice_no_up.strip():
                    st.error("Invoice number is required.")
                elif not uploaded_file:
                    st.error("Please select a file.")
                else:
                    inv_clean = invoice_no_up.strip()
                    try:
                        row = conn.execute("SELECT invoice_no FROM invoice_tracking WHERE invoice_no = ?", (inv_clean,)).fetchone()
                        if row is None:
                            st.error(f"Invoice **'{inv_clean}'** not found. Create it first in 'Insert New Invoice' tab.")
                        else:
                            target_path = DATA_LAKE / FOLDER_MAP[doc_type]
                            ext         = Path(uploaded_file.name).suffix
                            # Sanitise filename
                            safe_inv    = "".join(c for c in inv_clean if c.isalnum() or c in "-_")
                            new_fname   = f"{safe_inv}_{doc_type}{ext}"
                            save_path   = target_path / new_fname
                            save_path.write_bytes(uploaded_file.getbuffer())

                            conn.execute(
                                f"UPDATE invoice_tracking SET {COLUMN_MAP[doc_type]} = ? WHERE invoice_no = ?",
                                (str(save_path), inv_clean),
                            )
                            if safe_commit():
                                invalidate_cache()
                                st.success(f"✅ **{doc_type}** uploaded for invoice **{inv_clean}**!")
                                st.info(f"Saved: `{save_path}`")
                            else:
                                st.error("Database commit failed. Please retry.")
                    except Exception as e:
                        logger.error("upload error: %s", e)
                        st.error(f"Upload failed: {e}")

    with tab_new:
        st.info("💡 **Either Invoice No. or PO Number is required.** If only PO Number is provided (for pre-invoice appointment tracking), a temporary ID **PO-PENDING-xxx** is auto-generated. Update it once the invoice arrives.")
        with st.form("insert_invoice_form"):
            ni_r1c1, ni_r1c2, ni_r1c3 = st.columns(3)
            new_invoice_no  = ni_r1c1.text_input("Invoice No. (optional if PO given)", key="new_inv_no", placeholder="INV-2024-001")
            new_po_number   = ni_r1c2.text_input("PO Number",          key="new_po_num",   placeholder="PO-2024-001")
            new_vendor_name = ni_r1c3.text_input("Vendor Name",        key="new_vendor",   placeholder="Supplier Name")

            ni_r2c1, ni_r2c2, ni_r2c3 = st.columns(3)
            new_po_type     = ni_r2c1.text_input("PO Type",            key="new_po_type",  placeholder="Regular / Express / Spot")
            new_tracking_id = ni_r2c2.text_input("Tracking ID (Courier)", key="new_tracking", placeholder="e.g. SAFE123456789")
            new_location    = ni_r2c3.text_input("Location",           key="new_location", placeholder="e.g. Mumbai Warehouse")

            insert_sub = st.form_submit_button("➕ Create Invoice Record", type="primary")

            if insert_sub:
                _inv_raw = new_invoice_no.strip()
                _po_raw  = new_po_number.strip()

                # ── Validation: at least Invoice No. OR PO Number required ──
                if not _inv_raw and not _po_raw:
                    st.error("❌ Please enter at least an **Invoice No.** or a **PO Number**.")
                else:
                    # Auto-generate invoice_no if only PO number is given
                    _auto_generated = False
                    if not _inv_raw and _po_raw:
                        inv_c = f"PO-PENDING-{_po_raw}"
                        _auto_generated = True
                    else:
                        inv_c = _inv_raw

                    try:
                        # Duplicate check: same invoice_no OR same PO number on same record
                        existing_inv = conn.execute(
                            "SELECT invoice_no FROM invoice_tracking WHERE invoice_no = ?",
                            (inv_c,)
                        ).fetchone()

                        existing_po = conn.execute(
                            "SELECT invoice_no FROM invoice_tracking WHERE po_number = ? AND po_number IS NOT NULL",
                            (_po_raw,)
                        ).fetchone() if _po_raw else None

                        if existing_inv:
                            st.warning(
                                f"⚠️ A record with Invoice No. **'{inv_c}'** already exists. "
                                f"Use **Record Operations → Edit** to update it."
                            )
                        elif existing_po and not _inv_raw:
                            # PO exists and no invoice number — ask user to confirm
                            st.warning(
                                f"⚠️ PO Number **'{_po_raw}'** already exists on invoice "
                                f"**'{existing_po[0]}'**. "
                                f"If this is a new delivery on the same PO, provide a unique Invoice No."
                            )
                        else:
                            conn.execute(
                                "INSERT INTO invoice_tracking "
                                "(invoice_no, po_number, vendor_name, location, po_type, tracking_id) "
                                "VALUES (?, ?, ?, ?, ?, ?)",
                                (inv_c,
                                 _po_raw                  or None,
                                 new_vendor_name.strip()  or None,
                                 new_location.strip()     or None,
                                 new_po_type.strip()      or None,
                                 new_tracking_id.strip()  or None),
                            )
                            if safe_commit():
                                invalidate_cache()
                                if _auto_generated:
                                    st.success(
                                        f"✅ Record created with auto-generated ID **'{inv_c}'**. "
                                        f"Update the Invoice No. once received via Record Operations → Edit."
                                    )
                                else:
                                    st.success(f"✅ Record **'{inv_c}'** created successfully!")
                            else:
                                st.error("Commit failed. Please retry.")
                    except Exception as e:
                        st.error(f"Insert error: {e}")


    # ── Tab 3: Document Download ───────────────────────────
    with tab_doc_dl:
        st.markdown("### 📥 Download Documents by Invoice No.")
        st.markdown("Enter an Invoice Number to view and download all attached documents for that record.")

        dd_col1, dd_col2 = st.columns([3, 1])
        with dd_col1:
            dd_invoice = st.text_input(
                "🔎 Invoice Number",
                key="dd_invoice_input",
                placeholder="e.g. INV-2024-001",
            )
        with dd_col2:
            st.markdown("<br>", unsafe_allow_html=True)
            dd_load = st.button("🔍 Find Documents", key="dd_find_btn", type="primary")

        if dd_load or dd_invoice.strip():
            dd_inv_clean = dd_invoice.strip()
            if not dd_inv_clean:
                st.warning("⚠️ Please enter an Invoice Number.")
            else:
                try:
                    dd_row_cur = conn.execute(
                        "SELECT * FROM invoice_tracking WHERE invoice_no = ?", (dd_inv_clean,)
                    )
                    dd_row = dd_row_cur.fetchone()
                    if dd_row is None:
                        st.error(f"❌ Invoice **'{dd_inv_clean}'** not found in the database.")
                    else:
                        dd_data = dict(zip([d[0] for d in dd_row_cur.description], dd_row))
                        st.success(f"✅ Found record: **{dd_inv_clean}**")
                        st.markdown(f"**Vendor:** {dd_data.get('vendor_name','—')} &nbsp;|&nbsp; "
                                    f"**Status:** {dd_data.get('delivery_status','—')} &nbsp;|&nbsp; "
                                    f"**Location:** {dd_data.get('location','—')}")
                        st.markdown("---")
                        st.markdown("#### 📎 Attached Documents")
                        found_any = False
                        for col_key, display_name in FILE_COLUMN_DISPLAY.items():
                            fp = dd_data.get(col_key)
                            if fp and pd.notna(fp) and str(fp).strip() not in ("", "nan", "None"):
                                abs_p = os.path.abspath(str(fp))
                                if os.path.exists(abs_p):
                                    found_any = True
                                    doc_c1, doc_c2 = st.columns([3, 2])
                                    with doc_c1:
                                        st.markdown(f"✅ **{display_name}**")
                                        st.caption(f"`{os.path.basename(abs_p)}`")
                                    with doc_c2:
                                        with open(abs_p, "rb") as fh:
                                            st.download_button(
                                                f"📥 Download {display_name}",
                                                data=fh.read(),
                                                file_name=os.path.basename(abs_p),
                                                mime="application/octet-stream",
                                                key=f"dd_dl_{col_key}_{dd_inv_clean}",
                                                use_container_width=True,
                                            )
                                else:
                                    st.warning(f"⚠️ **{display_name}** — path exists in DB but file not found on disk.")
                            else:
                                st.caption(f"🔗 **{display_name}** — not uploaded yet")
                        if not found_any:
                            st.info("ℹ️ No documents have been uploaded for this invoice yet. "
                                    "Use the **Upload Document** tab to attach files.")
                except Exception as _dd_e:
                    st.error(f"Error loading record: {_dd_e}")


# PAGE: RECORD OPERATIONS
# ════════════════════════════════════════════════════════════
elif page == PAGES[2]:
    page_banner("📋", "Record Operations", "Create, edit, and manage individual shipment records")

    tab1, tab2, tab3 = st.tabs(["✏️ Single Record Entry / Edit", "📅 Bulk Appointment Upload", "🗑️ Data Cleanup & Deletion"])

    # ── Tab 1: Single record ─────────────────────────────────
    with tab1:
        # ── Invoice Number Lookup ─────────────────────────────
        st.markdown("#### 🔎 Load Existing Record or Create New")
        ro_c1, ro_c2, ro_c3 = st.columns([3, 1, 1])
        with ro_c1:
            ro_inv_input = st.text_input(
                "Type Invoice No. or PO Number to load",
                key="ro_inv_typed",
                placeholder="e.g. INV-2024-001 or PO-2024-001",
                help="Type the Invoice No. or PO Number and click Load Record. Leave blank to create a new record.",
            )
        with ro_c2:
            st.markdown("<br>", unsafe_allow_html=True)
            ro_load_btn = st.button("📂 Load Record", key="ro_load_btn", type="primary", use_container_width=True)
        with ro_c3:
            st.markdown("<br>", unsafe_allow_html=True)
            if st.button("➕ New Record", key="ro_new_btn", type="secondary", use_container_width=True):
                st.session_state["ro_loaded_data"] = None
                st.session_state["ro_loaded_inv"]  = ""
                st.rerun()

        # ── Load record on button click ───────────────────────
        if ro_load_btn and ro_inv_input.strip():
            _typed = ro_inv_input.strip()
            try:
                _cur = conn.execute("SELECT * FROM invoice_tracking WHERE invoice_no = ?", (_typed,))
                _row = _cur.fetchone()
                if _row:
                    st.session_state["ro_loaded_data"] = dict(zip([d[0] for d in _cur.description], _row))
                    st.session_state["ro_loaded_inv"]  = _typed
                else:
                    # Try by PO number
                    _cur2 = conn.execute("SELECT * FROM invoice_tracking WHERE po_number = ?", (_typed,))
                    _row2 = _cur2.fetchone()
                    if _row2:
                        st.session_state["ro_loaded_data"] = dict(zip([d[0] for d in _cur2.description], _row2))
                        st.session_state["ro_loaded_inv"]  = _row2[0] if _row2 else _typed
                    else:
                        st.warning(f"⚠️ No record found for **'{_typed}'**. You can fill the form below to create a new one.")
                        st.session_state["ro_loaded_data"] = None
                        st.session_state["ro_loaded_inv"]  = _typed
            except Exception as _e:
                st.error(f"Error loading record: {_e}")

        # Get loaded record data from session state
        record_data = st.session_state.get("ro_loaded_data", None)
        _loaded_inv = st.session_state.get("ro_loaded_inv", "")

        if record_data:
            _is_pending = str(record_data.get("invoice_no","")).startswith("PO-PENDING-")
            if _is_pending:
                st.warning("📋 **PO-Only record** — Update the Invoice No. once the invoice is received.")
            else:
                st.success(f"✅ Record loaded: **{record_data.get('invoice_no','')}** | Vendor: {record_data.get('vendor_name','—')} | Status: {record_data.get('delivery_status','—')}")
        elif _loaded_inv:
            st.info(f"ℹ️ Creating new record. Invoice No. pre-filled as: **{_loaded_inv}**")
        
        st.markdown("---")

        def _rd(key, default=""):
            """Safe accessor for record_data dict."""
            return record_data.get(key) if record_data else default

        def _rd_date(key):
            val = _rd(key)
            if val:
                try:
                    return pd.to_datetime(val).date()
                except:
                    pass
            return None

        def _rd_float(key):
            val = _rd(key)
            try:
                return float(val) if val else 0.0
            except:
                return 0.0

        def _rd_int(key, default=0):
            val = _rd(key)
            try:
                return int(val) if val else default
            except:
                return default

        with st.form("single_record_form"):
            # ── Core ──
            st.markdown("#### 🔑 Core Information")
            c1, c2, c3 = st.columns(3)
            invoice_no    = c1.text_input("Invoice No. *",   value=str(_rd("invoice_no") or _loaded_inv or ""))
            po_number     = c2.text_input("PO Number",       value=str(_rd("po_number") or ""),
                                          help="Purchase Order Number")
            vendor_name   = c3.text_input("Vendor Name",     value=str(_rd("vendor_name") or ""))

            cv1, cv2 = st.columns(2)
            location      = cv1.text_input("Location",
                                           value=str(_rd("location") or ""),
                                           placeholder="e.g. Mumbai Warehouse - Gate 3",
                                           help="Delivery/dispatch location or warehouse")

            # Row 2: po_type + tracking_id
            cx1, cx2 = st.columns(2)
            po_type_val     = cx1.text_input("PO Type",
                                              value=str(_rd("po_type") or ""),
                                              placeholder="e.g. Regular / Express / Spot",
                                              help="Type of Purchase Order")
            tracking_id_val = cx2.text_input("Tracking ID (Courier)",
                                              value=str(_rd("tracking_id") or ""),
                                              placeholder="e.g. SAFE123456789",
                                              help="Courier/shipment tracking number")

            # ── Dates ──
            st.markdown("#### 📅 Dates")
            d1, d2, d3 = st.columns(3)
            dispatched_date  = d1.date_input("Dispatched Date",   value=_rd_date("dispatched_date"),  key="sr_disp")
            appointment_date = d2.date_input("Appointment Date",  value=_rd_date("appointment_date"), key="sr_appt")
            po_expiry_date   = d3.date_input("PO Expiry Date",    value=_rd_date("po_expiry_date"),   key="sr_poexp")

            # ── Status ──
            st.markdown("#### 🚦 Status")
            s1, s2 = st.columns(2)
            _del_opts = ["", "Pending", "In Transit", "Delivered", "Delayed", "Cancelled", "RTO"]
            _inv_opts = ["", "Pending", "Paid", "Overdue", "Cancelled", "Disputed"]
            _cur_del  = str(_rd("delivery_status") or "")
            _cur_inv  = str(_rd("invoice_status")  or "")
            delivery_status = s1.selectbox("Delivery Status", _del_opts, index=_del_opts.index(_cur_del) if _cur_del in _del_opts else 0)
            invoice_status  = s2.selectbox("Invoice Status",  _inv_opts, index=_inv_opts.index(_cur_inv) if _cur_inv in _inv_opts else 0)

            # ── Quantities ──
            st.markdown("#### 📦 Quantities")
            q1, q2, q3, q4 = st.columns(4)
            invoice_quantity = q1.number_input("Invoice Qty",   min_value=0, value=_rd_int("invoice_quantity"), step=1)
            grn_quantity     = q2.number_input("GRN Qty",       min_value=0, value=_rd_int("grn_quantity"),     step=1)
            dn_quantity      = q3.number_input("DN Qty",        min_value=0, value=_rd_int("dn_quantity"),      step=1)
            no_of_box        = q4.number_input("No. of Boxes",  min_value=0, value=_rd_int("no_of_box"),        step=1,
                                               help="Total number of boxes/packets in this shipment")

            # ── Financials ──
            st.markdown("#### 💰 Financials")
            f1, f2, f3 = st.columns(3)
            invoice_amount = f1.number_input("Invoice Amount ₹", min_value=0.0, value=_rd_float("invoice_amount"), step=0.01, format="%.2f")
            grn_amount     = f2.number_input("GRN Amount ₹",     min_value=0.0, value=_rd_float("grn_amount"),     step=0.01, format="%.2f")
            dn_amount      = f3.number_input("DN Amount ₹",      min_value=0.0, value=_rd_float("dn_amount"),      step=0.01, format="%.2f")

            # ── Logistics ──
            st.markdown("#### 🚛 Logistics & Assignment")
            l1, l2, l3 = st.columns(3)
            _tm_opts = ["", "Safe Express", "Shiprocket", "Self Vehicle"]
            _cur_tm  = str(_rd("transport_mode") or "")
            transport_mode  = l1.selectbox("Transport Mode", _tm_opts, index=_tm_opts.index(_cur_tm) if _cur_tm in _tm_opts else 0)
            assigned_person = l2.text_input("Assigned Person", value=str(_rd("assigned_person") or ""))
            grn_no          = l3.text_input("GRN No",          value=str(_rd("grn_no")          or ""))

            # ── Appointment Tracking ──
            st.markdown("#### 📆 Appointment Tracking")
            at1, at2 = st.columns(2)
            appointment_count   = at1.number_input("Appointment Count", min_value=1, value=_rd_int("appointment_count", 1), step=1)
            appointment_history = at2.text_area("Appointment History", value=str(_rd("appointment_history") or ""), height=80, placeholder="Missed dates & notes...")

            # ── Exception ──
            st.markdown("#### 🚨 Exception Tracking")
            e1, e2, e3 = st.columns(3)
            _dns_opts = ["", "Open", "Closed", "In Progress"]
            _dnr_opts = ["", "RTO", "Corrected", "Disposed", "Pending"]
            _cur_dns  = str(_rd("dn_status")     or "")
            _cur_dnr  = str(_rd("dn_resolution") or "")
            dn_status      = e1.selectbox("DN Status",     _dns_opts, index=_dns_opts.index(_cur_dns) if _cur_dns in _dns_opts else 0)
            dn_resolution  = e2.selectbox("DN Resolution", _dnr_opts, index=_dnr_opts.index(_cur_dnr) if _cur_dnr in _dnr_opts else 0)
            dn_closure_date = e3.date_input("DN Closure Date", value=_rd_date("dn_closure_date"), key="sr_dncl")

            # ── Remarks ──
            st.markdown("#### 📝 Remarks")
            r1, r2 = st.columns(2)
            delivery_remark = r1.text_area("Delivery Remark", value=str(_rd("delivery_remark") or ""), height=80)
            invoice_remark  = r1.text_area("Invoice Remark",  value=str(_rd("invoice_remark")  or ""), height=80)
            general_remark  = r2.text_area("General Remark",  value=str(_rd("general_remark")  or ""), height=168)

            save_btn = st.form_submit_button("💾 Save Record", type="primary", width='stretch')

            if save_btn:
                if not invoice_no.strip():
                    st.error("Invoice Number is required!")
                else:
                    data_dict = {
                        "invoice_no":          invoice_no.strip(),
                        "po_number":           po_number.strip()    or None,
                        "po_type":         po_type_val.strip()     or None,
                        "tracking_id":     tracking_id_val.strip() or None,
                        "vendor_name":         vendor_name.strip()  or None,
                        "location":            location.strip()     or None,
                        "dispatched_date":     dispatched_date.isoformat()  if dispatched_date  else None,
                        "appointment_date":    appointment_date.isoformat() if appointment_date else None,
                        "po_expiry_date":      po_expiry_date.isoformat()   if po_expiry_date   else None,
                        "delivery_status":     delivery_status  or None,
                        "invoice_status":      invoice_status   or None,
                        "invoice_quantity":    invoice_quantity if invoice_quantity > 0 else None,
                        "grn_quantity":        grn_quantity     if grn_quantity > 0     else None,
                        "dn_quantity":         dn_quantity      if dn_quantity > 0      else None,
                        "no_of_box":           no_of_box        if no_of_box > 0        else None,
                        "invoice_amount":      invoice_amount   if invoice_amount > 0   else None,
                        "grn_amount":          grn_amount       if grn_amount > 0       else None,
                        "dn_amount":           dn_amount        if dn_amount > 0        else None,
                        "transport_mode":      transport_mode   or None,
                        "assigned_person":     assigned_person.strip() or None,
                        "grn_no":              grn_no.strip()          or None,
                        "appointment_count":   appointment_count,
                        "appointment_history": appointment_history.strip() or None,
                        "dn_status":           dn_status        or None,
                        "dn_resolution":       dn_resolution    or None,
                        "dn_closure_date":     dn_closure_date.isoformat() if dn_closure_date else None,
                        "delivery_remark":     delivery_remark.strip() or None,
                        "invoice_remark":      invoice_remark.strip()  or None,
                        "general_remark":      general_remark.strip()  or None,
                    }
                    try:
                        database.upsert_invoice_data(data_dict)
                        invalidate_cache()
                        st.success(f"✅ Record **'{data_dict['invoice_no']}'** saved successfully!")
                        st.rerun()
                    except Exception as e:
                        st.error(f"Save error: {e}")


        # ── Delete Record (outside form) ─────────────────────
        if record_data:
            st.markdown("---")
            st.markdown("##### 🗑️ Danger Zone — Delete Record")
            _del_confirm_key = f"ro_del_confirm_{record_data.get('invoice_no', 'unknown')}"
            if _del_confirm_key not in st.session_state:
                st.session_state[_del_confirm_key] = False

            if not st.session_state[_del_confirm_key]:
                if st.button("🗑️ Delete This Record", key="ro_del_btn", type="secondary"):
                    st.session_state[_del_confirm_key] = True
                    st.rerun()
            else:
                st.error(
                    f"⚠️ Confirm permanent deletion of **'{record_data.get('invoice_no', '')}'**? "
                    "This action **cannot** be undone."
                )
                _del_c1, _del_c2 = st.columns(2)
                with _del_c1:
                    if st.button("✅ YES, DELETE PERMANENTLY", key="ro_del_yes", type="primary", use_container_width=True):
                        try:
                            conn.execute(
                                "DELETE FROM invoice_tracking WHERE invoice_no = ?",
                                (record_data.get("invoice_no", ""),)
                            )
                            if safe_commit():
                                invalidate_cache()
                                st.session_state["ro_loaded_data"] = None
                                st.session_state["ro_loaded_inv"]  = ""
                                st.session_state[_del_confirm_key] = False
                                st.success(f"✅ Record **'{record_data.get('invoice_no', '')}'** permanently deleted.")
                                st.rerun()
                            else:
                                st.error("Commit failed — record was NOT deleted.")
                        except Exception as _del_e:
                            st.error(f"Delete error: {_del_e}")
                with _del_c2:
                    if st.button("❌ Cancel", key="ro_del_cancel", use_container_width=True):
                        st.session_state[_del_confirm_key] = False
                        st.rerun()

    # ── Tab 2: Bulk Appointment Upload ───────────────────────
    with tab2:
        st.info("Upload a CSV with columns **invoice_no** (or **po_no**) and **appointment_date** (YYYY-MM-DD) to update appointment dates in bulk.")

        tmpl = pd.DataFrame(columns=["invoice_no", "po_no", "appointment_date"])
        st.download_button("📥 Download Appointment CSV Template", tmpl.to_csv(index=False).encode(), "appointment_template.csv", "text/csv", key="dl_appt_tmpl")

        bulk_file = st.file_uploader("Choose CSV file", type=["csv"], key="bulk_appt_csv")
        if bulk_file:
            try:
                ba_df = pd.read_csv(bulk_file)
                st.write("**Preview:**")
                ba_dl1, ba_dl2 = st.columns([0.85, 0.15])
                with ba_dl2:
                    df_download_button(ba_df, "bulk_appointment_data.csv", "⬇️ Full CSV", "dl_ba_preview")
                st.dataframe(ba_df.head(), width='stretch', hide_index=True)

                has_inv = "invoice_no" in ba_df.columns
                has_po  = "po_no"      in ba_df.columns
                if not (has_inv or has_po):
                    st.error("CSV needs 'invoice_no' or 'po_no' column.")
                elif "appointment_date" not in ba_df.columns:
                    st.error("CSV needs 'appointment_date' column.")
                else:
                    if st.button("🚀 Update Appointment Dates", type="primary"):
                        prog = st.progress(0)
                        status_txt = st.empty()
                        total   = len(ba_df)
                        ok_ct   = 0
                        err_ct  = 0
                        err_log = []

                        for i, row in ba_df.iterrows():
                            try:
                                if has_inv and pd.notna(row.get("invoice_no")):
                                    ident  = str(row["invoice_no"])
                                    where  = "invoice_no = ?"
                                elif has_po and pd.notna(row.get("po_no")):
                                    ident  = str(row["po_no"])
                                    where  = "po_type = ?"
                                else:
                                    err_ct += 1; err_log.append(f"Row {i+1}: no identifier"); continue

                                appt_date = row["appointment_date"]
                                if pd.isna(appt_date):
                                    err_ct += 1; err_log.append(f"Row {i+1}: missing appointment_date"); continue

                                cur_row = conn.execute(
                                    f"SELECT appointment_date, appointment_count, appointment_history FROM invoice_tracking WHERE {where}",
                                    (ident,)
                                ).fetchone()

                                new_cnt  = 1
                                new_hist = ""
                                if cur_row:
                                    c_date, c_cnt, c_hist = cur_row
                                    c_cnt  = c_cnt  or 1
                                    c_hist = c_hist or ""
                                    if c_date and str(c_date) != str(appt_date):
                                        new_cnt  = c_cnt + 1
                                        entry    = f"Missed: {c_date}"
                                        new_hist = f"{entry} | {c_hist}" if c_hist else entry
                                    else:
                                        new_cnt  = c_cnt
                                        new_hist = c_hist

                                conn.execute(
                                    f"UPDATE invoice_tracking SET appointment_date=?, appointment_count=?, appointment_history=? WHERE {where}",
                                    (appt_date, new_cnt, new_hist, ident),
                                )
                                ok_ct += 1
                            except Exception as ex:
                                err_ct += 1
                                err_log.append(f"Row {i+1}: {ex}")

                            prog.progress((i + 1) / total)
                            status_txt.text(f"Processing {i+1}/{total}…")

                        prog.empty(); status_txt.empty()
                        safe_commit()
                        invalidate_cache()
                        st.success(f"✅ Done! **{ok_ct}** updated, **{err_ct}** errors.")
                        if err_log:
                            with st.expander("View Errors"):
                                st.write("\n".join(f"- {e}" for e in err_log))
            except Exception as e:
                st.error(f"CSV error: {e}")

    # ── Tab 3: Cleanup & Deletion ─────────────────────────────
    with tab3:
        st.warning("⚠️ Actions here are permanent and cannot be undone.")
        inv_result = conn.execute("SELECT invoice_no FROM invoice_tracking ORDER BY invoice_no").fetchall()
        inv_options = [r[0] for r in inv_result] if inv_result else []

        if not inv_options:
            st.info("No invoices in database.")
        else:
            sel_del_inv = st.selectbox("Select Invoice", inv_options, key="cleanup_inv")
            if sel_del_inv:
                inv_data = database.get_invoice_by_no(sel_del_inv)
                if inv_data:
                    st.info(f"**Vendor:** {inv_data.get('vendor_name','N/A')} | **Status:** {inv_data.get('delivery_status','N/A')} | **Inv Status:** {inv_data.get('invoice_status','N/A')}")

                    # File manager
                    st.markdown("#### 📁 File Manager")
                    files_found = False
                    for col_key, display_name in FILE_COLUMN_DISPLAY.items():
                        fp = inv_data.get(col_key)
                        if fp and pd.notna(fp):
                            files_found = True
                            fc1, fc2, fc3 = st.columns([3, 2, 1])
                            fc1.markdown(f"**{display_name}**")
                            fc1.caption(f"`{os.path.basename(str(fp))}`")
                            abs_p = os.path.abspath(str(fp))
                            fc2.success("✅ On disk") if os.path.exists(abs_p) else fc2.warning("⚠️ Not on disk")
                            if fc3.button("Remove", key=f"rm_{col_key}_{sel_del_inv}"):
                                try:
                                    if database.clear_document_path(sel_del_inv, col_key):
                                        invalidate_cache()
                                        st.toast(f"{display_name} removed.", icon="🗑️")
                                        st.rerun()
                                    else:
                                        st.error("Removal failed.")
                                except Exception as e:
                                    st.error(f"Error: {e}")
                    if not files_found:
                        st.info("No documents attached to this record.")

                    # Danger zone — double confirmation
                    st.markdown("#### 🔴 Danger Zone")
                    dc_key2 = f"dc_confirm2_{sel_del_inv}"
                    if dc_key2 not in st.session_state:
                        st.session_state[dc_key2] = False

                    if not st.session_state[dc_key2]:
                        if st.button("🗑️ Delete Entire Record", type="primary", key=f"del_full_{sel_del_inv}"):
                            st.session_state[dc_key2] = True
                            st.rerun()
                    elif st.session_state[dc_key2]:
                        st.error(f"🔴 FINAL CONFIRMATION: Permanently delete **'{sel_del_inv}'**? This CANNOT be undone.")
                        fc1, fc2 = st.columns(2)
                        with fc1:
                            if st.button("🗑️ YES, PERMANENTLY DELETE", type="primary",
                                         key=f"del_final_cleanup_{sel_del_inv}", width="stretch"):
                                try:
                                    if database.delete_invoice(sel_del_inv):
                                        invalidate_cache()
                                        st.session_state[dc_key2] = False
                                        st.toast(f"Invoice '{sel_del_inv}' permanently deleted.", icon="✅")
                                        st.rerun()
                                    else:
                                        st.warning("Invoice not found.")
                                except Exception as e:
                                    st.error(f"Delete error: {e}")
                        with fc2:
                            if st.button("❌ Cancel", key=f"del_cancel_cleanup_{sel_del_inv}", width="stretch"):
                                st.session_state[dc_key2] = False
                                st.rerun()

# ════════════════════════════════════════════════════════════
# PAGE: EXCEPTION QUEUE
# ════════════════════════════════════════════════════════════
elif page == PAGES[3]:
    page_banner("🚨", "Exception Queue (DN / RTO)", "Manage quantity discrepancies and delivery exceptions")

    df_all = fetch_all_records()

    if df_all.empty:
        st.info("No data found.")
        st.stop()

    # ── Date Filters ──────────────────────────────────────────
    with st.expander("🔍 Date Filters", expanded=False):
        _ef1, _ef2, _ef3, _ef4 = st.columns(4)
        exc_disp_from = _ef1.date_input("Dispatched From",  value=None, key="exc_disp_from")
        exc_disp_to   = _ef2.date_input("Dispatched To",    value=None, key="exc_disp_to")
        exc_appt_from = _ef3.date_input("Appointment From", value=None, key="exc_appt_from")
        exc_appt_to   = _ef4.date_input("Appointment To",   value=None, key="exc_appt_to")

    for _fdc in ["dispatched_date", "appointment_date"]:
        if _fdc in df_all.columns:
            df_all[f"{_fdc}_dt"] = pd.to_datetime(df_all[_fdc], errors="coerce").dt.normalize()

    if exc_disp_from and "dispatched_date_dt" in df_all.columns:
        df_all = df_all[df_all["dispatched_date_dt"] >= pd.Timestamp(exc_disp_from)]
    if exc_disp_to and "dispatched_date_dt" in df_all.columns:
        df_all = df_all[df_all["dispatched_date_dt"] <= pd.Timestamp(exc_disp_to)]
    if exc_appt_from and "appointment_date_dt" in df_all.columns:
        df_all = df_all[df_all["appointment_date_dt"] >= pd.Timestamp(exc_appt_from)]
    if exc_appt_to and "appointment_date_dt" in df_all.columns:
        df_all = df_all[df_all["appointment_date_dt"] <= pd.Timestamp(exc_appt_to)]

    for nc in ["invoice_quantity", "grn_quantity"]:
        if nc in df_all.columns:
            df_all[nc] = pd.to_numeric(df_all[nc], errors="coerce").fillna(0)
    df_all["dn_status"] = df_all["dn_status"].fillna("")

    exc_df = df_all[(df_all["invoice_quantity"] != df_all["grn_quantity"]) & (df_all["dn_status"] != "Closed")].copy()

    st.markdown("### ⚡ Action Required")

    if len(exc_df) == 0:
        st.success("✅ All exceptions have been resolved!")
    else:
        st.error(f"**{len(exc_df)} exception(s) require attention.**")
        exc_show_cols = [c for c in ["invoice_no","po_number","vendor_name","po_type","tracking_id","invoice_quantity","grn_quantity","no_of_box","dn_status","dn_resolution","delivery_status","assigned_person"] if c in exc_df.columns]
        exc_out = rename_cols(exc_df[exc_show_cols])
        exc_dl1, exc_dl2 = st.columns([0.85, 0.15])
        with exc_dl2:
            df_download_button(exc_out, "open_exceptions.csv", "⬇️ Export", "dl_exc_open")
        st.dataframe(exc_out, width='stretch', hide_index=True)

        st.markdown("---")
        st.markdown("### 🛠️ Resolve Exception")

        exc_invoices = exc_df["invoice_no"].tolist()
        sel_exc_inv  = st.selectbox("Select Invoice to Resolve", exc_invoices, key="exc_sel")

        if sel_exc_inv:
            inv_exc_data = database.get_invoice_by_no(sel_exc_inv)
            if inv_exc_data:
                with st.expander("📄 Invoice Details"):
                    ed1, ed2, ed3 = st.columns(3)
                    ed1.metric("Invoice Qty", inv_exc_data.get("invoice_quantity", 0))
                    ed2.metric("GRN Qty",     inv_exc_data.get("grn_quantity",     0))
                    ed3.metric("Diff",        int(inv_exc_data.get("invoice_quantity", 0) or 0) - int(inv_exc_data.get("grn_quantity", 0) or 0))
                    st.write(f"**Vendor:** {inv_exc_data.get('vendor_name','N/A')} | **DN Status:** {inv_exc_data.get('dn_status','Not set')}")

                with st.form("resolve_form"):
                    res_action = st.radio("Resolution Action", ["RTO - Returned to Origin", "GRN Corrected on Different Invoice", "Disposed", "Other"], key="res_act")
                    res_remark = st.text_area("Resolution Remarks *", placeholder="Describe how the exception was resolved…", height=100)
                    res_submit = st.form_submit_button("✅ Close Exception", type="primary")

                    if res_submit:
                        if not res_remark.strip():
                            st.error("Resolution remarks are required.")
                        else:
                            try:
                                cur_rmk     = inv_exc_data.get("general_remark", "") or ""
                                new_rmk     = f"{cur_rmk} | Exception ({datetime.date.today()}): {res_remark.strip()}" if cur_rmk else f"Exception ({datetime.date.today()}): {res_remark.strip()}"
                                conn.execute(
                                    """UPDATE invoice_tracking SET dn_status=?, dn_resolution=?, dn_closure_date=?, general_remark=? WHERE invoice_no=?""",
                                    ("Closed", res_action, datetime.date.today().isoformat(), new_rmk, sel_exc_inv),
                                )
                                if safe_commit():
                                    invalidate_cache()
                                    st.success(f"✅ Exception for **'{sel_exc_inv}'** closed!")
                                    st.rerun()
                                else:
                                    st.error("Commit failed.")
                            except Exception as e:
                                st.error(f"Update error: {e}")

    # Closed exceptions summary
    closed_exc = df_all[(df_all["invoice_quantity"] != df_all["grn_quantity"]) & (df_all["dn_status"] == "Closed")]
    if len(closed_exc):
        st.markdown("---")
        st.markdown("### ✅ Closed Exceptions")
        cl_cols = [c for c in ["invoice_no","po_number","vendor_name","invoice_quantity","grn_quantity","no_of_box","dn_resolution","dn_closure_date","assigned_person"] if c in closed_exc.columns]
        cl_out = rename_cols(closed_exc[cl_cols])
        cl_dl1, cl_dl2 = st.columns([0.85, 0.15])
        with cl_dl2:
            df_download_button(cl_out, "closed_exceptions.csv", "⬇️ Export", "dl_exc_closed")
        st.dataframe(cl_out, width='stretch', hide_index=True)

# ════════════════════════════════════════════════════════════
# PAGE: BULK CSV SYNC
# ════════════════════════════════════════════════════════════
elif page == PAGES[4]:
    page_banner("📁", "Bulk CSV Sync", "Download templates and sync mass data into the database")

    # ── COLUMN_ORDER for template (no file path cols) ────────
    TEMPLATE_COLS = [
        "invoice_no", "po_number", "vendor_name", "location",
        "dispatched_date", "appointment_date", "po_expiry_date",
        "invoice_quantity", "grn_quantity", "dn_quantity", "no_of_box",
        "invoice_amount", "grn_amount", "dn_amount",
        "po_type", "tracking_id", "transport_mode",
        "appointment_count", "appointment_history",
        "delivery_status", "invoice_status",
        "dn_status", "dn_resolution", "dn_closure_date",
        "delivery_remark", "invoice_remark", "general_remark",
        "assigned_person", "grn_no",
    ]

    # ── Sample row with example values ───────────────────────
    SAMPLE_ROW = {
        "invoice_no":          "INV-2024-001",
        "po_number":           "PO-2024-001",
        "vendor_name":         "ABC Suppliers Pvt Ltd",
        "location":            "Mumbai Warehouse - Gate 3",
        "dispatched_date":     "2024-03-01",
        "appointment_date":    "2024-03-10",
        "po_expiry_date":      "2024-06-30",
        "invoice_quantity":    100,
        "grn_quantity":        95,
        "dn_quantity":         5,
        "no_of_box":           12,
        "invoice_amount":      50000,
        "grn_amount":          47500,
        "dn_amount":           2500,
        "po_type":             "Regular",
        "tracking_id":         "SAFE123456789",
        "transport_mode":      "Safe Express",
        "appointment_count":   1,
        "appointment_history": "2024-03-10 First appointment",
        "delivery_status":     "Delivered",
        "invoice_status":      "Approved",
        "dn_status":           "Open",
        "dn_resolution":       "Pending",
        "dn_closure_date":     "",
        "delivery_remark":     "Delivered on time",
        "invoice_remark":      "",
        "general_remark":      "",
        "assigned_person":     "Rahul Kumar",
        "grn_no":              "GRN-2024-001",
    }

    tmpl_df = pd.DataFrame([SAMPLE_ROW], columns=TEMPLATE_COLS)

    st.markdown("### 1️⃣ Download Master Data Template")
    st.markdown("""
    <div style="background:#f0f9ff;border-left:4px solid #3b82f6;padding:14px 18px;border-radius:8px;margin-bottom:12px;">
    <b>📋 Template Instructions</b><br>
    <ul style="margin:8px 0 0 0;padding-left:20px;font-size:13px;">
    <li><b>Date columns</b> must be in <code>YYYY-MM-DD</code> format (e.g. <code>2024-03-15</code>). Columns: <code>dispatched_date</code>, <code>appointment_date</code>, <code>po_expiry_date</code>, <code>dn_closure_date</code></li>
    <li><b>invoice_no</b> is mandatory — rows without it will be skipped.</li>
    <li><b>Numeric columns</b> (quantities, amounts) must be plain numbers — no commas or ₹ symbol.</li>
    <li><b>po_type</b> — type of PO e.g. Regular, Express, Spot, Framework.</li>
    <li><b>delivery_status</b> — allowed values: <code>Pending</code>, <code>In Transit</code>, <code>Delivered</code>, <code>Delayed</code>, <code>RTO</code>, <code>Cancelled</code>.</li>
    <li><b>Duplicate check</b> — upload checks for exact full-row duplicates; same PO number on different invoices is allowed.</li>
    <li>The first row in the downloaded template is a sample — replace it with your actual data before uploading.</li>
    </ul>
    </div>
    """, unsafe_allow_html=True)
    st.download_button(
        "📥 Download Template (with sample)",
        tmpl_df.to_csv(index=False).encode("utf-8"),
        "master_data_template.csv",
        "text/csv",
        key="dl_template"
    )

    st.markdown("---")
    st.markdown("### 2️⃣ Upload & Sync Filled CSV")

    sync_file = st.file_uploader("Choose CSV file", type=["csv"],
                                  help="Must include invoice_no column. Dates must be YYYY-MM-DD.")
    if sync_file:
        try:
            sync_df = pd.read_csv(sync_file, dtype=str).fillna("")
            # Normalise date cols
            for _dc in ["dispatched_date","appointment_date","po_expiry_date","dn_closure_date"]:
                if _dc in sync_df.columns:
                    sync_df[_dc] = pd.to_datetime(sync_df[_dc], errors="coerce").dt.strftime("%Y-%m-%d").where(
                        pd.to_datetime(sync_df[_dc], errors="coerce").notna(), other="")

            st.write(f"**Preview** — {len(sync_df)} rows detected:")
            sc_dl1, sc_dl2 = st.columns([0.85, 0.15])
            with sc_dl2:
                df_download_button(sync_df, "sync_data_full.csv", "⬇️ Full CSV", "dl_sync_preview")
            st.dataframe(sync_df.head(10), width='stretch', hide_index=True)

            if "invoice_no" not in sync_df.columns:
                st.error("❌ CSV must contain an 'invoice_no' column.")
            else:
                # ── Duplicate detection ───────────────────────────────
                dup_mask  = sync_df.duplicated(keep=False)
                dup_count = dup_mask.sum()
                if dup_count:
                    st.warning(f"⚠️ **{dup_count} duplicate rows** detected in the file (full-row duplicates). "
                               f"These will be skipped during sync.")
                    with st.expander(f"View {dup_count} duplicate rows"):
                        st.dataframe(sync_df[dup_mask], width="stretch", hide_index=True)
                    sync_df = sync_df.drop_duplicates()
                    st.info(f"After removing duplicates: **{len(sync_df)} rows** will be synced.")

                col_a, col_b = st.columns([1, 3])
                with col_a:
                    if st.button("🚀 Sync to Database", type="primary", width='stretch'):
                        prog  = st.progress(0)
                        stat  = st.empty()
                        total = len(sync_df)
                        ok_ct   = 0
                        err_ct  = 0
                        err_log = []

                        for _i, row in sync_df.iterrows():
                            row_dict = {k: (None if v == "" else v) for k, v in row.to_dict().items()}
                            try:
                                database.upsert_invoice_data(row_dict)
                                ok_ct += 1
                            except Exception as ex:
                                err_ct += 1
                                err_log.append(f"Row {_i+1} (inv: {row_dict.get('invoice_no','?')}): {ex}")
                            prog.progress((_i + 1) / total)
                            stat.text(f"Syncing {_i+1}/{total}…")

                        prog.empty(); stat.empty()
                        invalidate_cache()
                        st.success(f"✅ Sync complete! **{ok_ct}** upserted, **{err_ct}** errors.")
                        if err_log:
                            with st.expander("View Errors"):
                                st.write("\n".join(f"- {e}" for e in err_log))
        except Exception as e:
            st.error(f"CSV error: {e}")

# ── SIDEBAR FOOTER ────────────────────────────────────────────
if st.session_state.sidebar_visible:
    st.sidebar.markdown(
        """
        <div style='margin-top:32px; padding:12px; background:rgba(255,255,255,0.05); border-radius:10px; font-size:11px; color:rgba(255,255,255,0.45); text-align:center;'>
            🚚 DesiDiya Tracking v3.0<br/>
            Powered by DuckDB · Streamlit
        </div>
        """,
        unsafe_allow_html=True,
    )
