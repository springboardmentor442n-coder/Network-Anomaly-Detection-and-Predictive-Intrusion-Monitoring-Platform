(()=>{"use strict";(globalThis["TURBOPACK"] || (globalThis["TURBOPACK"] = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/src/app/alerts/page.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>SecurityAlertsPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$layout$2f$AppShell$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/layout/AppShell.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$charts$2f$charts$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/charts/charts.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$primitives$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/primitives.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$context$2f$AnalysisContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/context/AnalysisContext.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/api.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/format.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$severity$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/severity.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
;
;
;
;
const STATUS_TABS = [
    'all',
    'open',
    'acknowledged',
    'resolved'
];
const SORT_OPTIONS = [
    {
        value: 'createdAt',
        label: 'Detected (newest first)'
    },
    {
        value: 'severity',
        label: 'Severity'
    },
    {
        value: 'status',
        label: 'Status'
    },
    {
        value: 'confidence',
        label: 'Confidence'
    },
    {
        value: 'predictedClass',
        label: 'Predicted class'
    },
    {
        value: 'category',
        label: 'Attack category'
    }
];
function SecurityAlertsPage() {
    _s();
    const { connection, alertStats, reloadAlerts, refresh, notify } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$context$2f$AnalysisContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAnalysis"])();
    const [stats, setStats] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(alertStats);
    const [tab, setTab] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('all');
    const [severity, setSeverity] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [sort, setSort] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('createdAt');
    const [order, setOrder] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('desc');
    const [search, setSearch] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [debouncedSearch, setDebouncedSearch] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [page, setPage] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(1);
    const [pageSize, setPageSize] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(25);
    const [items, setItems] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [total, setTotal] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(0);
    const [totalPages, setTotalPages] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(1);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [selected, setSelected] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(new Set());
    const [expanded, setExpanded] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [busy, setBusy] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "SecurityAlertsPage.useEffect": ()=>{
            if (alertStats) setStats(alertStats);
        }
    }["SecurityAlertsPage.useEffect"], [
        alertStats
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "SecurityAlertsPage.useEffect": ()=>{
            const timer = window.setTimeout({
                "SecurityAlertsPage.useEffect.timer": ()=>setDebouncedSearch(search.trim())
            }["SecurityAlertsPage.useEffect.timer"], 350);
            return ({
                "SecurityAlertsPage.useEffect": ()=>window.clearTimeout(timer)
            })["SecurityAlertsPage.useEffect"];
        }
    }["SecurityAlertsPage.useEffect"], [
        search
    ]);
    const loadAlerts = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "SecurityAlertsPage.useCallback[loadAlerts]": async ()=>{
            setLoading(true);
            setError(null);
            try {
                const response = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].alerts.list({
                    status: tab === 'all' ? undefined : tab,
                    severity: severity || undefined,
                    q: debouncedSearch || undefined,
                    sort,
                    order,
                    page,
                    pageSize
                });
                setItems(response.items ?? []);
                setTotal(response.total ?? 0);
                setTotalPages(response.totalPages ?? 1);
            } catch (err) {
                setItems([]);
                setTotal(0);
                setTotalPages(1);
                setError(err instanceof Error ? err.message : String(err));
            } finally{
                setLoading(false);
            }
        }
    }["SecurityAlertsPage.useCallback[loadAlerts]"], [
        debouncedSearch,
        order,
        page,
        pageSize,
        severity,
        sort,
        tab
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "SecurityAlertsPage.useEffect": ()=>{
            void loadAlerts();
        }
    }["SecurityAlertsPage.useEffect"], [
        loadAlerts
    ]);
    const handleStatusChange = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "SecurityAlertsPage.useCallback[handleStatusChange]": async (id, status)=>{
            setBusy(true);
            try {
                const response = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].alerts.update(id, status);
                setStats(response.stats);
                await Promise.all([
                    loadAlerts(),
                    reloadAlerts()
                ]);
                notify('success', `Alert ${id} marked ${status}.`);
            } catch (err) {
                notify('danger', err instanceof Error ? err.message : String(err));
            } finally{
                setBusy(false);
            }
        }
    }["SecurityAlertsPage.useCallback[handleStatusChange]"], [
        loadAlerts,
        notify,
        reloadAlerts
    ]);
    const handleBulk = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "SecurityAlertsPage.useCallback[handleBulk]": async (status)=>{
            if (selected.size === 0) {
                notify('info', 'Select at least one alert first.');
                return;
            }
            setBusy(true);
            try {
                await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].alerts.bulkStatus(Array.from(selected), status);
                setSelected(new Set());
                await Promise.all([
                    loadAlerts(),
                    reloadAlerts(),
                    refresh({
                        silent: true
                    })
                ]);
                notify('success', `${selected.size} alert(s) marked ${status}.`);
            } catch (err) {
                notify('danger', err instanceof Error ? err.message : String(err));
            } finally{
                setBusy(false);
            }
        }
    }["SecurityAlertsPage.useCallback[handleBulk]"], [
        loadAlerts,
        notify,
        refresh,
        reloadAlerts,
        selected
    ]);
    const handleDelete = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "SecurityAlertsPage.useCallback[handleDelete]": async (ids)=>{
            if (ids.length === 0) return;
            if (!window.confirm(`Delete ${ids.length} alert(s)? This cannot be undone.`)) return;
            setBusy(true);
            try {
                const response = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].alerts.remove(ids);
                setSelected(new Set());
                setStats(response.stats);
                await Promise.all([
                    loadAlerts(),
                    reloadAlerts(),
                    refresh({
                        silent: true
                    })
                ]);
                notify('success', `${response.deleted} alert(s) deleted.`);
            } catch (err) {
                notify('danger', err instanceof Error ? err.message : String(err));
            } finally{
                setBusy(false);
            }
        }
    }["SecurityAlertsPage.useCallback[handleDelete]"], [
        loadAlerts,
        notify,
        refresh,
        reloadAlerts
    ]);
    const severityBars = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "SecurityAlertsPage.useMemo[severityBars]": ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$severity$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SEVERITY_ORDER"].map({
                "SecurityAlertsPage.useMemo[severityBars]": (key)=>({
                        name: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$severity$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["severityMeta"])(key).label,
                        value: stats?.bySeverity?.[key] ?? 0
                    })
            }["SecurityAlertsPage.useMemo[severityBars]"])
    }["SecurityAlertsPage.useMemo[severityBars]"], [
        stats
    ]);
    const statusDonut = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "SecurityAlertsPage.useMemo[statusDonut]": ()=>[
                'open',
                'acknowledged',
                'resolved'
            ].map({
                "SecurityAlertsPage.useMemo[statusDonut]": (key)=>({
                        name: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$severity$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["statusMeta"])(key).label,
                        value: stats?.byStatus?.[key] ?? 0
                    })
            }["SecurityAlertsPage.useMemo[statusDonut]"])
    }["SecurityAlertsPage.useMemo[statusDonut]"], [
        stats
    ]);
    const allOnPageSelected = items.length > 0 && items.every((item)=>selected.has(item.id));
    const reportUrl = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].alerts.reportUrl({
        status: tab === 'all' ? undefined : tab,
        severity: severity || undefined,
        q: debouncedSearch || undefined
    });
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "space-y-5",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$layout$2f$AppShell$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PageHeader"], {
                title: "Security Alerts",
                description: "Alerts are created only from records a trained model flagged as threats. A stable fingerprint prevents duplicate alerts, and status changes are persisted in the backend database.",
                actions: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$primitives$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                            variant: "ghost",
                            loading: loading,
                            onClick: ()=>void loadAlerts(),
                            children: "Reload"
                        }, void 0, false, {
                            fileName: "[project]/src/app/alerts/page.tsx",
                            lineNumber: 190,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$primitives$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["LinkButton"], {
                            href: reportUrl,
                            variant: "primary",
                            children: "Export alerts (CSV)"
                        }, void 0, false, {
                            fileName: "[project]/src/app/alerts/page.tsx",
                            lineNumber: 193,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/app/alerts/page.tsx",
                    lineNumber: 189,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/app/alerts/page.tsx",
                lineNumber: 185,
                columnNumber: 7
            }, this),
            connection === 'offline' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$primitives$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Notice"], {
                tone: "danger",
                title: "Backend unreachable",
                children: "Alerts are stored by the backend. Start it and reload this page."
            }, void 0, false, {
                fileName: "[project]/src/app/alerts/page.tsx",
                lineNumber: 201,
                columnNumber: 9
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$primitives$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["MetricCard"], {
                        label: "Total alerts",
                        value: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatNumber"])(stats?.total ?? 0),
                        accent: "cyan"
                    }, void 0, false, {
                        fileName: "[project]/src/app/alerts/page.tsx",
                        lineNumber: 207,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$primitives$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["MetricCard"], {
                        label: "Open",
                        value: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatNumber"])(stats?.byStatus?.open ?? 0),
                        accent: "critical"
                    }, void 0, false, {
                        fileName: "[project]/src/app/alerts/page.tsx",
                        lineNumber: 208,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$primitives$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["MetricCard"], {
                        label: "Acknowledged",
                        value: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatNumber"])(stats?.byStatus?.acknowledged ?? 0),
                        accent: "medium"
                    }, void 0, false, {
                        fileName: "[project]/src/app/alerts/page.tsx",
                        lineNumber: 209,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$primitives$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["MetricCard"], {
                        label: "Resolved",
                        value: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatNumber"])(stats?.byStatus?.resolved ?? 0),
                        accent: "low"
                    }, void 0, false, {
                        fileName: "[project]/src/app/alerts/page.tsx",
                        lineNumber: 210,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$primitives$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["MetricCard"], {
                        label: "Critical",
                        value: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatNumber"])(stats?.bySeverity?.critical ?? 0),
                        accent: "critical"
                    }, void 0, false, {
                        fileName: "[project]/src/app/alerts/page.tsx",
                        lineNumber: 211,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$primitives$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["MetricCard"], {
                        label: "High",
                        value: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatNumber"])(stats?.bySeverity?.high ?? 0),
                        accent: "high"
                    }, void 0, false, {
                        fileName: "[project]/src/app/alerts/page.tsx",
                        lineNumber: 212,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/alerts/page.tsx",
                lineNumber: 206,
                columnNumber: 7
            }, this),
            stats && stats.total > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "grid gap-4 xl:grid-cols-2",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$primitives$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Panel"], {
                        title: "Alerts by severity",
                        subtitle: "All alerts recorded by the backend",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$charts$2f$charts$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["BarChart"], {
                            data: severityBars,
                            height: 160
                        }, void 0, false, {
                            fileName: "[project]/src/app/alerts/page.tsx",
                            lineNumber: 218,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/app/alerts/page.tsx",
                        lineNumber: 217,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$primitives$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Panel"], {
                        title: "Alerts by status",
                        subtitle: "Open / acknowledged / resolved",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$charts$2f$charts$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DonutChart"], {
                            data: statusDonut,
                            centerLabel: "alerts"
                        }, void 0, false, {
                            fileName: "[project]/src/app/alerts/page.tsx",
                            lineNumber: 221,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/app/alerts/page.tsx",
                        lineNumber: 220,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/alerts/page.tsx",
                lineNumber: 216,
                columnNumber: 9
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$primitives$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Panel"], {
                title: "Alert queue",
                subtitle: "Severity, status, sorting and text search are applied by the backend",
                actions: selected.size > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: "text-xs text-soc-muted",
                            children: [
                                selected.size,
                                " selected"
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/alerts/page.tsx",
                            lineNumber: 232,
                            columnNumber: 15
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$primitives$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                            variant: "ghost",
                            disabled: busy,
                            onClick: ()=>void handleBulk('acknowledged'),
                            children: "Acknowledge"
                        }, void 0, false, {
                            fileName: "[project]/src/app/alerts/page.tsx",
                            lineNumber: 233,
                            columnNumber: 15
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$primitives$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                            variant: "ghost",
                            disabled: busy,
                            onClick: ()=>void handleBulk('resolved'),
                            children: "Resolve"
                        }, void 0, false, {
                            fileName: "[project]/src/app/alerts/page.tsx",
                            lineNumber: 236,
                            columnNumber: 15
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$primitives$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                            variant: "danger",
                            disabled: busy,
                            onClick: ()=>void handleDelete(Array.from(selected)),
                            children: "Delete"
                        }, void 0, false, {
                            fileName: "[project]/src/app/alerts/page.tsx",
                            lineNumber: 239,
                            columnNumber: 15
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/app/alerts/page.tsx",
                    lineNumber: 231,
                    columnNumber: 13
                }, this),
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex flex-wrap items-center gap-3",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$primitives$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Tabs"], {
                            active: tab,
                            onChange: (id)=>{
                                setTab(id);
                                setPage(1);
                            },
                            tabs: [
                                {
                                    id: 'all',
                                    label: 'All'
                                },
                                {
                                    id: 'open',
                                    label: 'Open',
                                    count: stats?.byStatus?.open
                                },
                                {
                                    id: 'acknowledged',
                                    label: 'Acknowledged',
                                    count: stats?.byStatus?.acknowledged
                                },
                                {
                                    id: 'resolved',
                                    label: 'Resolved',
                                    count: stats?.byStatus?.resolved
                                }
                            ]
                        }, void 0, false, {
                            fileName: "[project]/src/app/alerts/page.tsx",
                            lineNumber: 247,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/app/alerts/page.tsx",
                        lineNumber: 246,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mt-3 grid gap-3 lg:grid-cols-4",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "lg:col-span-2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                        className: "soc-label",
                                        htmlFor: "alert-search",
                                        children: "Search"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/alerts/page.tsx",
                                        lineNumber: 264,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                        id: "alert-search",
                                        className: "soc-input",
                                        placeholder: "Alert id, class, category, source record, reason…",
                                        value: search,
                                        onChange: (event)=>{
                                            setSearch(event.target.value);
                                            setPage(1);
                                        }
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/alerts/page.tsx",
                                        lineNumber: 267,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/alerts/page.tsx",
                                lineNumber: 263,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                        className: "soc-label",
                                        htmlFor: "alert-severity",
                                        children: "Severity"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/alerts/page.tsx",
                                        lineNumber: 279,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$primitives$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Select"], {
                                        id: "alert-severity",
                                        value: severity,
                                        onChange: (value)=>{
                                            setSeverity(value);
                                            setPage(1);
                                        },
                                        options: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$severity$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SEVERITY_ORDER"].map((key)=>({
                                                value: key,
                                                label: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$severity$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["severityMeta"])(key).label
                                            })),
                                        placeholder: "All severities"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/alerts/page.tsx",
                                        lineNumber: 282,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/alerts/page.tsx",
                                lineNumber: 278,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                        className: "soc-label",
                                        htmlFor: "alert-sort",
                                        children: "Sort by"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/alerts/page.tsx",
                                        lineNumber: 294,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex gap-2",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$primitives$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Select"], {
                                                id: "alert-sort",
                                                value: sort,
                                                onChange: (value)=>{
                                                    setSort(value);
                                                    setPage(1);
                                                },
                                                options: SORT_OPTIONS
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/alerts/page.tsx",
                                                lineNumber: 298,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$primitives$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                                                variant: "ghost",
                                                className: "shrink-0",
                                                onClick: ()=>setOrder((current)=>current === 'desc' ? 'asc' : 'desc'),
                                                "aria-label": `Sort ${order === 'desc' ? 'ascending' : 'descending'}`,
                                                children: order === 'desc' ? '↓' : '↑'
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/alerts/page.tsx",
                                                lineNumber: 307,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/alerts/page.tsx",
                                        lineNumber: 297,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/alerts/page.tsx",
                                lineNumber: 293,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/alerts/page.tsx",
                        lineNumber: 262,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mt-3 flex flex-wrap items-center gap-3 text-xs text-soc-muted",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$primitives$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                                variant: "ghost",
                                onClick: ()=>{
                                    setSeverity('');
                                    setSearch('');
                                    setSort('createdAt');
                                    setOrder('desc');
                                    setTab('all');
                                    setPage(1);
                                },
                                children: "Clear filters"
                            }, void 0, false, {
                                fileName: "[project]/src/app/alerts/page.tsx",
                                lineNumber: 320,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                children: [
                                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatNumber"])(total),
                                    " alert(s) matching"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/alerts/page.tsx",
                                lineNumber: 333,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/alerts/page.tsx",
                        lineNumber: 319,
                        columnNumber: 9
                    }, this),
                    error && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mt-3",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$primitives$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ErrorState"], {
                            title: "Could not load alerts",
                            message: error
                        }, void 0, false, {
                            fileName: "[project]/src/app/alerts/page.tsx",
                            lineNumber: 338,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/app/alerts/page.tsx",
                        lineNumber: 337,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mt-3 overflow-auto rounded-lg border border-soc-border",
                        children: loading && items.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$primitives$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["LoadingBlock"], {
                            label: "Loading alerts…"
                        }, void 0, false, {
                            fileName: "[project]/src/app/alerts/page.tsx",
                            lineNumber: 344,
                            columnNumber: 13
                        }, this) : items.length === 0 && !error ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$primitives$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["EmptyState"], {
                            title: "No alerts match",
                            description: "Alerts appear here after a machine-learning detection flags threats. Rule-based assessments never create alerts."
                        }, void 0, false, {
                            fileName: "[project]/src/app/alerts/page.tsx",
                            lineNumber: 346,
                            columnNumber: 13
                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                            className: "soc-table text-xs",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                    type: "checkbox",
                                                    className: "h-3.5 w-3.5 accent-soc-accent",
                                                    "aria-label": "Select all alerts on this page",
                                                    checked: allOnPageSelected,
                                                    onChange: (event)=>{
                                                        setSelected((current)=>{
                                                            const next = new Set(current);
                                                            if (event.target.checked) items.forEach((item)=>next.add(item.id));
                                                            else items.forEach((item)=>next.delete(item.id));
                                                            return next;
                                                        });
                                                    }
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/alerts/page.tsx",
                                                    lineNumber: 355,
                                                    columnNumber: 21
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/alerts/page.tsx",
                                                lineNumber: 354,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {}, void 0, false, {
                                                fileName: "[project]/src/app/alerts/page.tsx",
                                                lineNumber: 370,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                children: "Alert id"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/alerts/page.tsx",
                                                lineNumber: 371,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                children: "Detected"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/alerts/page.tsx",
                                                lineNumber: 372,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                children: "Source record"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/alerts/page.tsx",
                                                lineNumber: 373,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                children: "Class / category"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/alerts/page.tsx",
                                                lineNumber: 374,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                className: "text-right",
                                                children: "Confidence"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/alerts/page.tsx",
                                                lineNumber: 375,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                children: "Severity"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/alerts/page.tsx",
                                                lineNumber: 376,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                children: "Status"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/alerts/page.tsx",
                                                lineNumber: 377,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                className: "text-right",
                                                children: "Actions"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/alerts/page.tsx",
                                                lineNumber: 378,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/alerts/page.tsx",
                                        lineNumber: 353,
                                        columnNumber: 17
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/src/app/alerts/page.tsx",
                                    lineNumber: 352,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                                    children: items.map((alert)=>{
                                        const severityInfo = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$severity$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["severityMeta"])(alert.severity);
                                        const statusInfo = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$severity$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["statusMeta"])(alert.status);
                                        const open = expanded === alert.id;
                                        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                type: "checkbox",
                                                                className: "h-3.5 w-3.5 accent-soc-accent",
                                                                "aria-label": `Select alert ${alert.id}`,
                                                                checked: selected.has(alert.id),
                                                                onChange: (event)=>{
                                                                    setSelected((current)=>{
                                                                        const next = new Set(current);
                                                                        if (event.target.checked) next.add(alert.id);
                                                                        else next.delete(alert.id);
                                                                        return next;
                                                                    });
                                                                }
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/app/alerts/page.tsx",
                                                                lineNumber: 390,
                                                                columnNumber: 27
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/alerts/page.tsx",
                                                            lineNumber: 389,
                                                            columnNumber: 25
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                type: "button",
                                                                className: "text-soc-accent hover:underline",
                                                                "aria-expanded": open,
                                                                onClick: ()=>setExpanded(open ? null : alert.id),
                                                                children: open ? '−' : '+'
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/app/alerts/page.tsx",
                                                                lineNumber: 406,
                                                                columnNumber: 27
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/alerts/page.tsx",
                                                            lineNumber: 405,
                                                            columnNumber: 25
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                            className: "font-mono text-[11px]",
                                                            children: alert.id
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/alerts/page.tsx",
                                                            lineNumber: 415,
                                                            columnNumber: 25
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                            children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatRelative"])(alert.createdAt)
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/alerts/page.tsx",
                                                            lineNumber: 416,
                                                            columnNumber: 25
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                            className: "font-mono text-[11px]",
                                                            children: alert.sourceRecord ?? '—'
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/alerts/page.tsx",
                                                            lineNumber: 417,
                                                            columnNumber: 25
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                            className: "max-w-[12rem] truncate",
                                                            title: alert.attackCategory ?? alert.predictedClass ?? '',
                                                            children: alert.attackCategory ?? alert.predictedClass ?? '—'
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/alerts/page.tsx",
                                                            lineNumber: 418,
                                                            columnNumber: 25
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                            className: "text-right tabular-nums",
                                                            children: alert.confidence === null || alert.confidence === undefined ? '—' : (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatPercent"])(alert.confidence)
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/alerts/page.tsx",
                                                            lineNumber: 421,
                                                            columnNumber: 25
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: `rounded-full border px-2 py-0.5 text-[10px] ${severityInfo.badgeClass}`,
                                                                children: severityInfo.label
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/app/alerts/page.tsx",
                                                                lineNumber: 427,
                                                                columnNumber: 27
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/alerts/page.tsx",
                                                            lineNumber: 426,
                                                            columnNumber: 25
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: `rounded-full border px-2 py-0.5 text-[10px] ${statusInfo.badgeClass}`,
                                                                children: statusInfo.label
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/app/alerts/page.tsx",
                                                                lineNumber: 432,
                                                                columnNumber: 27
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/alerts/page.tsx",
                                                            lineNumber: 431,
                                                            columnNumber: 25
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                            className: "text-right",
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "flex justify-end gap-1.5",
                                                                children: [
                                                                    alert.status === 'open' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$primitives$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                                                                        variant: "ghost",
                                                                        className: "px-2 py-1 text-[11px]",
                                                                        disabled: busy,
                                                                        onClick: ()=>void handleStatusChange(alert.id, 'acknowledged'),
                                                                        children: "Acknowledge"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/app/alerts/page.tsx",
                                                                        lineNumber: 439,
                                                                        columnNumber: 31
                                                                    }, this),
                                                                    alert.status !== 'resolved' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$primitives$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                                                                        variant: "ghost",
                                                                        className: "px-2 py-1 text-[11px]",
                                                                        disabled: busy,
                                                                        onClick: ()=>void handleStatusChange(alert.id, 'resolved'),
                                                                        children: "Resolve"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/app/alerts/page.tsx",
                                                                        lineNumber: 449,
                                                                        columnNumber: 31
                                                                    }, this),
                                                                    alert.status !== 'open' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$primitives$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                                                                        variant: "ghost",
                                                                        className: "px-2 py-1 text-[11px]",
                                                                        disabled: busy,
                                                                        onClick: ()=>void handleStatusChange(alert.id, 'open'),
                                                                        children: "Reopen"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/app/alerts/page.tsx",
                                                                        lineNumber: 459,
                                                                        columnNumber: 31
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/src/app/alerts/page.tsx",
                                                                lineNumber: 437,
                                                                columnNumber: 27
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/alerts/page.tsx",
                                                            lineNumber: 436,
                                                            columnNumber: 25
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/app/alerts/page.tsx",
                                                    lineNumber: 388,
                                                    columnNumber: 23
                                                }, this),
                                                open && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                    className: "bg-soc-panel2/60",
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                        colSpan: 10,
                                                        className: "whitespace-normal",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("dl", {
                                                                className: "grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Detail, {
                                                                        label: "Alert identifier",
                                                                        value: alert.id,
                                                                        mono: true
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/app/alerts/page.tsx",
                                                                        lineNumber: 475,
                                                                        columnNumber: 31
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Detail, {
                                                                        label: "Fingerprint (deduplication key)",
                                                                        value: alert.fingerprint,
                                                                        mono: true
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/app/alerts/page.tsx",
                                                                        lineNumber: 476,
                                                                        columnNumber: 31
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Detail, {
                                                                        label: "Detection timestamp",
                                                                        value: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatDateTime"])(alert.createdAt)
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/app/alerts/page.tsx",
                                                                        lineNumber: 477,
                                                                        columnNumber: 31
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Detail, {
                                                                        label: "Last updated",
                                                                        value: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatDateTime"])(alert.updatedAt)
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/app/alerts/page.tsx",
                                                                        lineNumber: 478,
                                                                        columnNumber: 31
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Detail, {
                                                                        label: "Detection run",
                                                                        value: alert.detectionId ?? '—',
                                                                        mono: true
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/app/alerts/page.tsx",
                                                                        lineNumber: 479,
                                                                        columnNumber: 31
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Detail, {
                                                                        label: "Source record",
                                                                        value: alert.sourceRecord ?? '—',
                                                                        mono: true
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/app/alerts/page.tsx",
                                                                        lineNumber: 480,
                                                                        columnNumber: 31
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Detail, {
                                                                        label: "Model algorithm",
                                                                        value: alert.modelAlgorithm ?? '—'
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/app/alerts/page.tsx",
                                                                        lineNumber: 481,
                                                                        columnNumber: 31
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Detail, {
                                                                        label: "Predicted class",
                                                                        value: alert.predictedClass ?? '—'
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/app/alerts/page.tsx",
                                                                        lineNumber: 482,
                                                                        columnNumber: 31
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Detail, {
                                                                        label: "Attack category",
                                                                        value: alert.attackCategory ?? '—'
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/app/alerts/page.tsx",
                                                                        lineNumber: 483,
                                                                        columnNumber: 31
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Detail, {
                                                                        label: "Model confidence",
                                                                        value: alert.confidence === null || alert.confidence === undefined ? 'Not available for this model' : `${(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatPercent"])(alert.confidence)} (model output, not a guarantee)`
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/app/alerts/page.tsx",
                                                                        lineNumber: 484,
                                                                        columnNumber: 31
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Detail, {
                                                                        label: "Detection source",
                                                                        value: alert.detectionSource ?? '—'
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/app/alerts/page.tsx",
                                                                        lineNumber: 492,
                                                                        columnNumber: 31
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Detail, {
                                                                        label: "Severity",
                                                                        value: severityInfo.label
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/app/alerts/page.tsx",
                                                                        lineNumber: 493,
                                                                        columnNumber: 31
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/src/app/alerts/page.tsx",
                                                                lineNumber: 474,
                                                                columnNumber: 29
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "mt-3 grid gap-3 lg:grid-cols-2",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        children: [
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                className: "text-[11px] font-semibold uppercase tracking-wide text-soc-muted",
                                                                                children: "Explanation"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/src/app/alerts/page.tsx",
                                                                                lineNumber: 497,
                                                                                columnNumber: 33
                                                                            }, this),
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                className: "mt-1 text-xs leading-relaxed text-soc-text",
                                                                                children: alert.reason ?? '—'
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/src/app/alerts/page.tsx",
                                                                                lineNumber: 500,
                                                                                columnNumber: 33
                                                                            }, this)
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/src/app/alerts/page.tsx",
                                                                        lineNumber: 496,
                                                                        columnNumber: 31
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        children: [
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                className: "text-[11px] font-semibold uppercase tracking-wide text-soc-muted",
                                                                                children: "Recommended defensive action"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/src/app/alerts/page.tsx",
                                                                                lineNumber: 503,
                                                                                columnNumber: 33
                                                                            }, this),
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                className: "mt-1 text-xs leading-relaxed text-soc-text",
                                                                                children: alert.recommendedAction ?? '—'
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/src/app/alerts/page.tsx",
                                                                                lineNumber: 506,
                                                                                columnNumber: 33
                                                                            }, this)
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/src/app/alerts/page.tsx",
                                                                        lineNumber: 502,
                                                                        columnNumber: 31
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/src/app/alerts/page.tsx",
                                                                lineNumber: 495,
                                                                columnNumber: 29
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "mt-3 flex flex-wrap gap-2",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$primitives$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Badge"], {
                                                                        className: severityInfo.badgeClass,
                                                                        children: [
                                                                            severityInfo.label,
                                                                            " severity"
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/src/app/alerts/page.tsx",
                                                                        lineNumber: 512,
                                                                        columnNumber: 31
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$primitives$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Badge"], {
                                                                        className: statusInfo.badgeClass,
                                                                        children: statusInfo.label
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/app/alerts/page.tsx",
                                                                        lineNumber: 513,
                                                                        columnNumber: 31
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$primitives$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                                                                        variant: "danger",
                                                                        className: "px-2 py-1 text-[11px]",
                                                                        disabled: busy,
                                                                        onClick: ()=>void handleDelete([
                                                                                alert.id
                                                                            ]),
                                                                        children: "Delete alert"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/app/alerts/page.tsx",
                                                                        lineNumber: 514,
                                                                        columnNumber: 31
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/src/app/alerts/page.tsx",
                                                                lineNumber: 511,
                                                                columnNumber: 29
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/app/alerts/page.tsx",
                                                        lineNumber: 473,
                                                        columnNumber: 27
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/alerts/page.tsx",
                                                    lineNumber: 472,
                                                    columnNumber: 25
                                                }, this)
                                            ]
                                        }, alert.id, true, {
                                            fileName: "[project]/src/app/alerts/page.tsx",
                                            lineNumber: 387,
                                            columnNumber: 21
                                        }, this);
                                    })
                                }, void 0, false, {
                                    fileName: "[project]/src/app/alerts/page.tsx",
                                    lineNumber: 381,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/alerts/page.tsx",
                            lineNumber: 351,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/app/alerts/page.tsx",
                        lineNumber: 342,
                        columnNumber: 9
                    }, this),
                    items.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$primitives$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Pagination"], {
                        page: page,
                        totalPages: totalPages,
                        total: total,
                        pageSize: pageSize,
                        onPageChange: setPage,
                        onPageSizeChange: (size)=>{
                            setPageSize(size);
                            setPage(1);
                        }
                    }, void 0, false, {
                        fileName: "[project]/src/app/alerts/page.tsx",
                        lineNumber: 530,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/alerts/page.tsx",
                lineNumber: 226,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$primitives$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Panel"], {
                title: "How alerts work",
                subtitle: "What NetShield AI does and does not do",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                    className: "list-disc space-y-1.5 pl-5 text-xs leading-relaxed text-soc-muted",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                            children: "Only records the model classified as attacks become alerts; normal traffic never raises one."
                        }, void 0, false, {
                            fileName: "[project]/src/app/alerts/page.tsx",
                            lineNumber: 546,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                            children: "A stable fingerprint (detection mode + class + category + severity + input features) prevents the same record from creating duplicate alerts."
                        }, void 0, false, {
                            fileName: "[project]/src/app/alerts/page.tsx",
                            lineNumber: 547,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                            children: "Statuses are persisted in the backend database, so acknowledging an alert survives a page refresh."
                        }, void 0, false, {
                            fileName: "[project]/src/app/alerts/page.tsx",
                            lineNumber: 548,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                            children: [
                                "NetShield AI ",
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                    children: "does not"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/alerts/page.tsx",
                                    lineNumber: 550,
                                    columnNumber: 26
                                }, this),
                                " block traffic, quarantine hosts or reconfigure network devices. Recommended actions are advice for an analyst."
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/alerts/page.tsx",
                            lineNumber: 549,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                            children: [
                                "Severity thresholds can be changed on the",
                                ' ',
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                    href: "/detection",
                                    className: "text-soc-accent hover:underline",
                                    children: "Threat Detection"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/alerts/page.tsx",
                                    lineNumber: 555,
                                    columnNumber: 13
                                }, this),
                                ' ',
                                "page before a run; they apply to new detections only."
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/alerts/page.tsx",
                            lineNumber: 553,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/app/alerts/page.tsx",
                    lineNumber: 545,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/app/alerts/page.tsx",
                lineNumber: 544,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/app/alerts/page.tsx",
        lineNumber: 184,
        columnNumber: 5
    }, this);
}
_s(SecurityAlertsPage, "fmCpvpWiQ1ky1oh1NaXRjnEf4V4=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$context$2f$AnalysisContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAnalysis"]
    ];
});
_c = SecurityAlertsPage;
function Detail({ label, value, mono = false }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "min-w-0",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("dt", {
                className: "text-[10px] uppercase tracking-wide text-soc-muted",
                children: label
            }, void 0, false, {
                fileName: "[project]/src/app/alerts/page.tsx",
                lineNumber: 569,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("dd", {
                className: `break-words text-xs text-soc-text ${mono ? 'font-mono' : ''}`,
                children: value
            }, void 0, false, {
                fileName: "[project]/src/app/alerts/page.tsx",
                lineNumber: 570,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/app/alerts/page.tsx",
        lineNumber: 568,
        columnNumber: 5
    }, this);
}
_c1 = Detail;
var _c, _c1;
__turbopack_context__.k.register(_c, "SecurityAlertsPage");
__turbopack_context__.k.register(_c1, "Detail");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/charts/charts.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "BarChart",
    ()=>BarChart,
    "ChartLegend",
    ()=>ChartLegend,
    "ConfusionMatrix",
    ()=>ConfusionMatrix,
    "DonutChart",
    ()=>DonutChart,
    "Heatmap",
    ()=>Heatmap,
    "MetricBar",
    ()=>MetricBar
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
/**
 * Dependency-free SVG charts tuned for the SOC dark theme.
 * Keeping them local avoids pulling a heavy charting library into the bundle
 * and lets every chart share the same colour tokens as the rest of the UI.
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$severity$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/severity.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/format.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature();
'use client';
;
;
;
function BarChart({ data, max, valueFormat = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatNumber"], emptyLabel = 'No data', height }) {
    _s();
    const rows = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "BarChart.useMemo[rows]": ()=>{
            const sorted = [
                ...data ?? []
            ].sort({
                "BarChart.useMemo[rows].sorted": (a, b)=>b.value - a.value
            }["BarChart.useMemo[rows].sorted"]);
            return sorted.length > 16 ? sorted.slice(0, 16) : sorted;
        }
    }["BarChart.useMemo[rows]"], [
        data
    ]);
    if (rows.length === 0) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
            className: "py-6 text-center text-xs text-soc-muted",
            children: emptyLabel
        }, void 0, false, {
            fileName: "[project]/src/components/charts/charts.tsx",
            lineNumber: 36,
            columnNumber: 12
        }, this);
    }
    const peak = max ?? Math.max(...rows.map((row)=>row.value), 1);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "space-y-2",
        style: height ? {
            maxHeight: height,
            overflowY: 'auto'
        } : undefined,
        children: rows.map((row, index)=>{
            const pct = peak > 0 ? row.value / peak * 100 : 0;
            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "group",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-baseline justify-between gap-2 text-xs",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "truncate text-soc-text",
                                title: row.name,
                                children: row.name || '(empty)'
                            }, void 0, false, {
                                fileName: "[project]/src/components/charts/charts.tsx",
                                lineNumber: 48,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "tabular-nums text-soc-muted",
                                children: valueFormat(row.value)
                            }, void 0, false, {
                                fileName: "[project]/src/components/charts/charts.tsx",
                                lineNumber: 51,
                                columnNumber: 15
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/charts/charts.tsx",
                        lineNumber: 47,
                        columnNumber: 13
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mt-1 h-2 w-full overflow-hidden rounded-full bg-soc-panel3",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "h-full rounded-full transition-all duration-500",
                            style: {
                                width: `${pct}%`,
                                backgroundColor: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$severity$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["chartColor"])(index)
                            }
                        }, void 0, false, {
                            fileName: "[project]/src/components/charts/charts.tsx",
                            lineNumber: 54,
                            columnNumber: 15
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/components/charts/charts.tsx",
                        lineNumber: 53,
                        columnNumber: 13
                    }, this)
                ]
            }, `${row.name}-${index}`, true, {
                fileName: "[project]/src/components/charts/charts.tsx",
                lineNumber: 46,
                columnNumber: 11
            }, this);
        })
    }, void 0, false, {
        fileName: "[project]/src/components/charts/charts.tsx",
        lineNumber: 42,
        columnNumber: 5
    }, this);
}
_s(BarChart, "LHVMCglWcQeRoCgUufL/A5uf67g=");
_c = BarChart;
/* -------------------------------------------------------------------------- */ /* Donut chart                                                                 */ /* -------------------------------------------------------------------------- */ /**
 * Arc lengths plus prefix-summed start offsets for every donut segment.
 * Computed in a plain function (outside a component render) so no value is
 * reassigned while React is rendering.
 */ function donutSegments(entries, total, circumference) {
    return entries.reduce((acc, entry, index)=>{
        const previous = acc[index - 1];
        const start = previous ? previous.start + previous.dash : 0;
        const dash = total > 0 ? entry.value / total * circumference : 0;
        acc.push({
            entry,
            dash,
            start
        });
        return acc;
    }, []);
}
function DonutChart({ data, size = 168, thickness = 22, centerLabel, centerValue, valueFormat = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatNumber"] }) {
    _s1();
    const gid = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useId"])().replace(/:/g, '');
    const entries = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "DonutChart.useMemo[entries]": ()=>(data ?? []).filter({
                "DonutChart.useMemo[entries]": (item)=>item.value > 0
            }["DonutChart.useMemo[entries]"])
    }["DonutChart.useMemo[entries]"], [
        data
    ]);
    const total = entries.reduce((sum, item)=>sum + item.value, 0);
    const radius = (size - thickness) / 2;
    const circumference = 2 * Math.PI * radius;
    const segments = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "DonutChart.useMemo[segments]": ()=>donutSegments(entries, total, circumference)
    }["DonutChart.useMemo[segments]"], [
        entries,
        total,
        circumference
    ]);
    if (entries.length === 0 || total === 0) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "mx-auto flex items-center justify-center rounded-full border border-dashed border-soc-border text-xs text-soc-muted",
            style: {
                width: size,
                height: size
            },
            children: "No data"
        }, void 0, false, {
            fileName: "[project]/src/components/charts/charts.tsx",
            lineNumber: 110,
            columnNumber: 7
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex flex-wrap items-center justify-center gap-5",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                width: size,
                height: size,
                viewBox: `0 0 ${size} ${size}`,
                role: "img",
                "aria-label": "distribution",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
                        transform: `rotate(-90 ${size / 2} ${size / 2})`,
                        children: segments.map(({ entry, dash, start }, index)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                                cx: size / 2,
                                cy: size / 2,
                                r: radius,
                                fill: "none",
                                stroke: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$severity$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["chartColor"])(index),
                                strokeWidth: thickness,
                                strokeDasharray: `${dash} ${circumference - dash}`,
                                strokeDashoffset: -start,
                                strokeLinecap: "butt"
                            }, `${entry.name}-${index}`, false, {
                                fileName: "[project]/src/components/charts/charts.tsx",
                                lineNumber: 124,
                                columnNumber: 13
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/src/components/charts/charts.tsx",
                        lineNumber: 122,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                        cx: size / 2,
                        cy: size / 2,
                        r: radius - thickness / 2 - 1,
                        fill: `url(#${gid})`,
                        opacity: "0"
                    }, void 0, false, {
                        fileName: "[project]/src/components/charts/charts.tsx",
                        lineNumber: 138,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("text", {
                        x: "50%",
                        y: "47%",
                        textAnchor: "middle",
                        className: "fill-soc-text",
                        style: {
                            fontSize: 20,
                            fontWeight: 600
                        },
                        children: centerValue ?? (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatNumber"])(total)
                    }, void 0, false, {
                        fileName: "[project]/src/components/charts/charts.tsx",
                        lineNumber: 139,
                        columnNumber: 9
                    }, this),
                    centerLabel && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("text", {
                        x: "50%",
                        y: "60%",
                        textAnchor: "middle",
                        className: "fill-soc-muted",
                        style: {
                            fontSize: 10
                        },
                        children: centerLabel
                    }, void 0, false, {
                        fileName: "[project]/src/components/charts/charts.tsx",
                        lineNumber: 149,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/charts/charts.tsx",
                lineNumber: 121,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                className: "space-y-1.5 text-xs",
                children: entries.map((entry, index)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                        className: "flex items-center gap-2",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "h-2.5 w-2.5 shrink-0 rounded-sm",
                                style: {
                                    backgroundColor: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$severity$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["chartColor"])(index)
                                },
                                "aria-hidden": "true"
                            }, void 0, false, {
                                fileName: "[project]/src/components/charts/charts.tsx",
                                lineNumber: 157,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-soc-text",
                                children: entry.name || '(empty)'
                            }, void 0, false, {
                                fileName: "[project]/src/components/charts/charts.tsx",
                                lineNumber: 162,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "tabular-nums text-soc-muted",
                                children: [
                                    valueFormat(entry.value),
                                    " · ",
                                    (entry.value / total * 100).toFixed(1),
                                    "%"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/charts/charts.tsx",
                                lineNumber: 163,
                                columnNumber: 13
                            }, this)
                        ]
                    }, `${entry.name}-legend-${index}`, true, {
                        fileName: "[project]/src/components/charts/charts.tsx",
                        lineNumber: 156,
                        columnNumber: 11
                    }, this))
            }, void 0, false, {
                fileName: "[project]/src/components/charts/charts.tsx",
                lineNumber: 154,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/charts/charts.tsx",
        lineNumber: 120,
        columnNumber: 5
    }, this);
}
_s1(DonutChart, "k3rlZpg+aG8GT5ZfXZCZSeq/DJc=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useId"]
    ];
});
_c1 = DonutChart;
function Heatmap({ columns, matrix }) {
    if (!columns || columns.length === 0) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
            className: "py-6 text-center text-xs text-soc-muted",
            children: "Not enough numeric features for a correlation matrix."
        }, void 0, false, {
            fileName: "[project]/src/components/charts/charts.tsx",
            lineNumber: 184,
            columnNumber: 12
        }, this);
    }
    const cell = Math.max(28, Math.min(48, Math.floor(520 / columns.length)));
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "overflow-auto",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "grid gap-px",
                style: {
                    gridTemplateColumns: `minmax(96px, max-content) repeat(${columns.length}, ${cell}px)`
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {}, void 0, false, {
                        fileName: "[project]/src/components/charts/charts.tsx",
                        lineNumber: 195,
                        columnNumber: 9
                    }, this),
                    columns.map((column)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "truncate pb-1 text-center text-[10px] text-soc-muted",
                            style: {
                                writingMode: 'vertical-rl',
                                transform: 'rotate(180deg)',
                                height: 96
                            },
                            title: column,
                            children: column
                        }, `h-${column}`, false, {
                            fileName: "[project]/src/components/charts/charts.tsx",
                            lineNumber: 197,
                            columnNumber: 11
                        }, this)),
                    matrix.map((row, rowIndex)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "contents",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "truncate pr-2 text-right text-[10px] text-soc-muted",
                                    title: columns[rowIndex],
                                    children: columns[rowIndex]
                                }, void 0, false, {
                                    fileName: "[project]/src/components/charts/charts.tsx",
                                    lineNumber: 208,
                                    columnNumber: 13
                                }, this),
                                row.map((value, colIndex)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-center justify-center text-[10px] tabular-nums text-soc-text/90",
                                        style: {
                                            height: cell,
                                            backgroundColor: correlationColor(value),
                                            color: Math.abs(value ?? 0) > 0.6 ? '#04121F' : undefined
                                        },
                                        title: `${columns[rowIndex]} × ${columns[colIndex]}: ${value === null ? 'n/a' : value.toFixed(3)}`,
                                        children: value === null ? '—' : value.toFixed(2)
                                    }, `c-${rowIndex}-${colIndex}`, false, {
                                        fileName: "[project]/src/components/charts/charts.tsx",
                                        lineNumber: 212,
                                        columnNumber: 15
                                    }, this))
                            ]
                        }, `row-${rowIndex}`, true, {
                            fileName: "[project]/src/components/charts/charts.tsx",
                            lineNumber: 207,
                            columnNumber: 11
                        }, this))
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/charts/charts.tsx",
                lineNumber: 191,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mt-3 flex items-center gap-2 text-[11px] text-soc-muted",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        children: "-1"
                    }, void 0, false, {
                        fileName: "[project]/src/components/charts/charts.tsx",
                        lineNumber: 229,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "h-2 w-40 rounded-full",
                        style: {
                            background: 'linear-gradient(90deg,#F43F5E,#0B1424,#22D3EE)'
                        }
                    }, void 0, false, {
                        fileName: "[project]/src/components/charts/charts.tsx",
                        lineNumber: 230,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        children: "+1"
                    }, void 0, false, {
                        fileName: "[project]/src/components/charts/charts.tsx",
                        lineNumber: 231,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "ml-2",
                        children: "Pearson correlation (numeric columns, capped at 12)"
                    }, void 0, false, {
                        fileName: "[project]/src/components/charts/charts.tsx",
                        lineNumber: 232,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/charts/charts.tsx",
                lineNumber: 228,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/charts/charts.tsx",
        lineNumber: 190,
        columnNumber: 5
    }, this);
}
_c2 = Heatmap;
function correlationColor(value) {
    if (value === null) return '#0B1424';
    const v = Math.max(-1, Math.min(1, value));
    if (v >= 0) {
        const alpha = 0.12 + v * 0.78;
        return `rgba(34, 211, 238, ${alpha})`;
    }
    const alpha = 0.12 + Math.abs(v) * 0.78;
    return `rgba(244, 63, 94, ${alpha})`;
}
function ConfusionMatrix({ labels, matrix, displayLabels }) {
    const total = matrix.flat().reduce((sum, value)=>sum + value, 0);
    const max = Math.max(...matrix.flat(), 1);
    const names = displayLabels && displayLabels.length === labels.length ? displayLabels : labels;
    if (!labels.length || !matrix.length) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
            className: "py-6 text-center text-xs text-soc-muted",
            children: "No evaluation data available."
        }, void 0, false, {
            fileName: "[project]/src/components/charts/charts.tsx",
            lineNumber: 266,
            columnNumber: 12
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "overflow-auto",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                className: "w-full border-collapse text-xs",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                    className: "p-2 text-left text-soc-muted",
                                    children: "Actual ↓ / Predicted →"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/charts/charts.tsx",
                                    lineNumber: 274,
                                    columnNumber: 13
                                }, this),
                                names.map((name)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                        className: "p-2 text-center font-medium text-soc-muted",
                                        children: name
                                    }, name, false, {
                                        fileName: "[project]/src/components/charts/charts.tsx",
                                        lineNumber: 276,
                                        columnNumber: 15
                                    }, this))
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/charts/charts.tsx",
                            lineNumber: 273,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/components/charts/charts.tsx",
                        lineNumber: 272,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                        children: matrix.map((row, rowIndex)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                        className: "p-2 text-left font-medium text-soc-muted",
                                        children: names[rowIndex] ?? labels[rowIndex]
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/charts/charts.tsx",
                                        lineNumber: 285,
                                        columnNumber: 15
                                    }, this),
                                    row.map((value, colIndex)=>{
                                        const isDiagonal = rowIndex === colIndex;
                                        const intensity = value / max;
                                        const background = isDiagonal ? `rgba(34, 211, 238, ${0.1 + intensity * 0.7})` : value > 0 ? `rgba(244, 63, 94, ${0.08 + intensity * 0.65})` : 'rgba(15,27,46,0.6)';
                                        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                            className: "p-2 text-center tabular-nums text-soc-text",
                                            style: {
                                                background
                                            },
                                            title: `${names[rowIndex]} → ${names[colIndex]}: ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatNumber"])(value)}`,
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "font-semibold",
                                                    children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatNumber"])(value)
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/charts/charts.tsx",
                                                    lineNumber: 301,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "text-[10px] text-soc-text/70",
                                                    children: total > 0 ? `${(value / total * 100).toFixed(1)}%` : '—'
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/charts/charts.tsx",
                                                    lineNumber: 302,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, `cm-${rowIndex}-${colIndex}`, true, {
                                            fileName: "[project]/src/components/charts/charts.tsx",
                                            lineNumber: 295,
                                            columnNumber: 19
                                        }, this);
                                    })
                                ]
                            }, `cm-${rowIndex}`, true, {
                                fileName: "[project]/src/components/charts/charts.tsx",
                                lineNumber: 284,
                                columnNumber: 13
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/src/components/charts/charts.tsx",
                        lineNumber: 282,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/charts/charts.tsx",
                lineNumber: 271,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "mt-2 text-[11px] text-soc-muted",
                children: "Diagonal cells are correct predictions; off-diagonal cells are errors (false positives / false negatives)."
            }, void 0, false, {
                fileName: "[project]/src/components/charts/charts.tsx",
                lineNumber: 312,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/charts/charts.tsx",
        lineNumber: 270,
        columnNumber: 5
    }, this);
}
_c3 = ConfusionMatrix;
function MetricBar({ label, value, tone = 'accent', hint }) {
    const pct = value === null ? 0 : Math.max(0, Math.min(1, value)) * 100;
    const colors = {
        accent: 'bg-soc-accent',
        critical: 'bg-soc-critical',
        medium: 'bg-soc-medium'
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-baseline justify-between text-xs",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "text-soc-muted",
                        children: label
                    }, void 0, false, {
                        fileName: "[project]/src/components/charts/charts.tsx",
                        lineNumber: 342,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "tabular-nums text-soc-text",
                        children: value === null ? 'undefined' : `${pct.toFixed(1)}%`
                    }, void 0, false, {
                        fileName: "[project]/src/components/charts/charts.tsx",
                        lineNumber: 343,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/charts/charts.tsx",
                lineNumber: 341,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mt-1 h-1.5 w-full overflow-hidden rounded-full bg-soc-panel3",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('h-full rounded-full', colors[tone]),
                    style: {
                        width: `${pct}%`
                    }
                }, void 0, false, {
                    fileName: "[project]/src/components/charts/charts.tsx",
                    lineNumber: 346,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/components/charts/charts.tsx",
                lineNumber: 345,
                columnNumber: 7
            }, this),
            hint && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "mt-1 text-[10px] text-soc-muted",
                children: hint
            }, void 0, false, {
                fileName: "[project]/src/components/charts/charts.tsx",
                lineNumber: 348,
                columnNumber: 16
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/charts/charts.tsx",
        lineNumber: 340,
        columnNumber: 5
    }, this);
}
_c4 = MetricBar;
function ChartLegend({ items }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
        className: "flex flex-wrap gap-x-4 gap-y-1.5 text-[11px]",
        children: items.map((item, index)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                className: "flex items-center gap-1.5",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "h-2.5 w-2.5 rounded-sm",
                        style: {
                            backgroundColor: item.color ?? __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$severity$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CHART_PALETTE"][index % __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$severity$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CHART_PALETTE"].length]
                        }
                    }, void 0, false, {
                        fileName: "[project]/src/components/charts/charts.tsx",
                        lineNumber: 361,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "text-soc-muted",
                        children: item.label
                    }, void 0, false, {
                        fileName: "[project]/src/components/charts/charts.tsx",
                        lineNumber: 365,
                        columnNumber: 11
                    }, this),
                    item.value && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "tabular-nums text-soc-text",
                        children: item.value
                    }, void 0, false, {
                        fileName: "[project]/src/components/charts/charts.tsx",
                        lineNumber: 366,
                        columnNumber: 26
                    }, this)
                ]
            }, item.label, true, {
                fileName: "[project]/src/components/charts/charts.tsx",
                lineNumber: 360,
                columnNumber: 9
            }, this))
    }, void 0, false, {
        fileName: "[project]/src/components/charts/charts.tsx",
        lineNumber: 358,
        columnNumber: 5
    }, this);
}
_c5 = ChartLegend;
var _c, _c1, _c2, _c3, _c4, _c5;
__turbopack_context__.k.register(_c, "BarChart");
__turbopack_context__.k.register(_c1, "DonutChart");
__turbopack_context__.k.register(_c2, "Heatmap");
__turbopack_context__.k.register(_c3, "ConfusionMatrix");
__turbopack_context__.k.register(_c4, "MetricBar");
__turbopack_context__.k.register(_c5, "ChartLegend");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/lib/severity.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "CHART_PALETTE",
    ()=>CHART_PALETTE,
    "SEVERITY_META",
    ()=>SEVERITY_META,
    "SEVERITY_ORDER",
    ()=>SEVERITY_ORDER,
    "STATUS_META",
    ()=>STATUS_META,
    "chartColor",
    ()=>chartColor,
    "severityMeta",
    ()=>severityMeta,
    "statusMeta",
    ()=>statusMeta
]);
const CHART_PALETTE = [
    '#22D3EE',
    '#8B5CF6',
    '#38BDF8',
    '#F97316',
    '#22C55E',
    '#FACC15',
    '#F43F5E',
    '#14B8A6',
    '#A855F7',
    '#84CC16',
    '#EC4899',
    '#0EA5E9'
];
function chartColor(index) {
    return CHART_PALETTE[index % CHART_PALETTE.length];
}
const SEVERITY_ORDER = [
    'critical',
    'high',
    'medium',
    'low'
];
const SEVERITY_META = {
    critical: {
        label: 'Critical',
        color: '#F43F5E',
        textClass: 'text-soc-critical',
        badgeClass: 'border-soc-critical/40 bg-soc-critical/15 text-soc-critical',
        dotClass: 'bg-soc-critical'
    },
    high: {
        label: 'High',
        color: '#F97316',
        textClass: 'text-soc-high',
        badgeClass: 'border-soc-high/40 bg-soc-high/15 text-soc-high',
        dotClass: 'bg-soc-high'
    },
    medium: {
        label: 'Medium',
        color: '#FACC15',
        textClass: 'text-soc-medium',
        badgeClass: 'border-soc-medium/40 bg-soc-medium/15 text-soc-medium',
        dotClass: 'bg-soc-medium'
    },
    low: {
        label: 'Low',
        color: '#22C55E',
        textClass: 'text-soc-low',
        badgeClass: 'border-soc-low/40 bg-soc-low/15 text-soc-low',
        dotClass: 'bg-soc-low'
    }
};
function severityMeta(severity) {
    const key = (severity ?? '').toLowerCase();
    return SEVERITY_META[key] ?? {
        label: severity ? severity : 'Unknown',
        color: '#8194AE',
        textClass: 'text-soc-muted',
        badgeClass: 'border-soc-border bg-soc-panel2 text-soc-muted',
        dotClass: 'bg-soc-muted'
    };
}
const STATUS_META = {
    open: {
        label: 'Open',
        badgeClass: 'border-soc-critical/40 bg-soc-critical/10 text-soc-critical',
        color: '#F43F5E'
    },
    acknowledged: {
        label: 'Acknowledged',
        badgeClass: 'border-soc-medium/40 bg-soc-medium/10 text-soc-medium',
        color: '#FACC15'
    },
    resolved: {
        label: 'Resolved',
        badgeClass: 'border-soc-low/40 bg-soc-low/10 text-soc-low',
        color: '#22C55E'
    }
};
function statusMeta(status) {
    const key = (status ?? '').toLowerCase();
    return STATUS_META[key] ?? {
        label: status ?? 'Unknown',
        badgeClass: 'border-soc-border bg-soc-panel2 text-soc-muted',
        color: '#8194AE'
    };
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);})()

//# sourceMappingURL=src_0wbhmfawzxuyo._.js.map