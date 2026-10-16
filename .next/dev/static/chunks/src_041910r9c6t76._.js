(()=>{"use strict";(globalThis["TURBOPACK"] || (globalThis["TURBOPACK"] = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/src/components/layout/AppShell.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AppShell",
    ()=>AppShell,
    "PageHeader",
    ()=>PageHeader
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$layout$2f$Sidebar$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/layout/Sidebar.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$context$2f$AnalysisContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/context/AnalysisContext.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/format.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$primitives$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/primitives.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature();
'use client';
;
;
;
;
;
/* -------------------------------------------------------------------------- */ /* Error boundary                                                              */ /* -------------------------------------------------------------------------- */ class PageErrorBoundary extends __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Component"] {
    state = {
        error: null
    };
    static getDerivedStateFromError(error) {
        return {
            error
        };
    }
    componentDidCatch(error, info) {
        console.error('NetShield page error', error, info);
    }
    render() {
        if (this.state.error) {
            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$primitives$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Panel"], {
                title: "Page error",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-sm text-soc-critical",
                        children: this.state.error.message
                    }, void 0, false, {
                        fileName: "[project]/src/components/layout/AppShell.tsx",
                        lineNumber: 30,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "mt-2 text-xs text-soc-muted",
                        children: "The page failed to render. Reload the page or run the checks described in the README."
                    }, void 0, false, {
                        fileName: "[project]/src/components/layout/AppShell.tsx",
                        lineNumber: 31,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$primitives$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                        className: "mt-3",
                        variant: "primary",
                        onClick: ()=>this.setState({
                                error: null
                            }),
                        children: "Try again"
                    }, void 0, false, {
                        fileName: "[project]/src/components/layout/AppShell.tsx",
                        lineNumber: 34,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/layout/AppShell.tsx",
                lineNumber: 29,
                columnNumber: 9
            }, this);
        }
        return this.props.children;
    }
}
/* -------------------------------------------------------------------------- */ /* Toasts                                                                      */ /* -------------------------------------------------------------------------- */ function ToastStack() {
    _s();
    const { toasts, dismissToast } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$context$2f$AnalysisContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAnalysis"])();
    if (toasts.length === 0) return null;
    const tones = {
        info: 'border-soc-info/50 bg-soc-info/10 text-soc-info',
        success: 'border-soc-low/50 bg-soc-low/10 text-soc-low',
        warning: 'border-soc-medium/50 bg-soc-medium/10 text-soc-medium',
        danger: 'border-soc-critical/50 bg-soc-critical/10 text-soc-critical'
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "fixed bottom-4 right-4 z-50 flex w-[min(92vw,360px)] flex-col gap-2",
        role: "region",
        "aria-live": "polite",
        children: toasts.map((toast)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('flex items-start justify-between gap-3 rounded-lg border px-3 py-2 text-xs shadow-lg backdrop-blur', tones[toast.tone]),
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "leading-relaxed",
                        children: toast.message
                    }, void 0, false, {
                        fileName: "[project]/src/components/layout/AppShell.tsx",
                        lineNumber: 63,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "button",
                        className: "shrink-0 opacity-70 hover:opacity-100",
                        onClick: ()=>dismissToast(toast.id),
                        "aria-label": "Dismiss notification",
                        children: "✕"
                    }, void 0, false, {
                        fileName: "[project]/src/components/layout/AppShell.tsx",
                        lineNumber: 64,
                        columnNumber: 11
                    }, this)
                ]
            }, toast.id, true, {
                fileName: "[project]/src/components/layout/AppShell.tsx",
                lineNumber: 59,
                columnNumber: 9
            }, this))
    }, void 0, false, {
        fileName: "[project]/src/components/layout/AppShell.tsx",
        lineNumber: 57,
        columnNumber: 5
    }, this);
}
_s(ToastStack, "xYlME0FmTVgAJCS3KF+MB4vkfKo=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$context$2f$AnalysisContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAnalysis"]
    ];
});
_c = ToastStack;
/* -------------------------------------------------------------------------- */ /* Connection banner                                                           */ /* -------------------------------------------------------------------------- */ function ConnectionBanner() {
    _s1();
    const { connection, connectionError, refresh, refreshing } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$context$2f$AnalysisContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAnalysis"])();
    if (connection !== 'offline') return null;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "border-b border-soc-critical/40 bg-soc-critical/10 px-4 py-2.5 text-xs",
        role: "alert",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex flex-wrap items-center justify-between gap-2",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    className: "text-soc-critical",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                            className: "font-semibold",
                            children: "Backend unavailable."
                        }, void 0, false, {
                            fileName: "[project]/src/components/layout/AppShell.tsx",
                            lineNumber: 88,
                            columnNumber: 11
                        }, this),
                        ' ',
                        connectionError ?? 'Start the FastAPI server to enable training, evaluation and detection.'
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/layout/AppShell.tsx",
                    lineNumber: 87,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$primitives$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                    variant: "ghost",
                    loading: refreshing,
                    onClick: ()=>void refresh(),
                    children: "Retry connection"
                }, void 0, false, {
                    fileName: "[project]/src/components/layout/AppShell.tsx",
                    lineNumber: 91,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/layout/AppShell.tsx",
            lineNumber: 86,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/components/layout/AppShell.tsx",
        lineNumber: 85,
        columnNumber: 5
    }, this);
}
_s1(ConnectionBanner, "+cD/IL9O9Gz5QdnCWpx+DkwNBU8=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$context$2f$AnalysisContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAnalysis"]
    ];
});
_c1 = ConnectionBanner;
function PageHeader({ title, description, actions }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
        className: "flex flex-wrap items-end justify-between gap-3",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "min-w-0",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                        className: "text-lg font-semibold tracking-tight text-soc-text sm:text-xl",
                        children: title
                    }, void 0, false, {
                        fileName: "[project]/src/components/layout/AppShell.tsx",
                        lineNumber: 114,
                        columnNumber: 9
                    }, this),
                    description && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "mt-1 max-w-3xl text-xs leading-relaxed text-soc-muted",
                        children: description
                    }, void 0, false, {
                        fileName: "[project]/src/components/layout/AppShell.tsx",
                        lineNumber: 115,
                        columnNumber: 25
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/layout/AppShell.tsx",
                lineNumber: 113,
                columnNumber: 7
            }, this),
            actions && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex flex-wrap items-center gap-2",
                children: actions
            }, void 0, false, {
                fileName: "[project]/src/components/layout/AppShell.tsx",
                lineNumber: 117,
                columnNumber: 19
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/layout/AppShell.tsx",
        lineNumber: 112,
        columnNumber: 5
    }, this);
}
_c2 = PageHeader;
function AppShell({ children }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex min-h-screen bg-soc-bg",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$layout$2f$Sidebar$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Sidebar"], {}, void 0, false, {
                fileName: "[project]/src/components/layout/AppShell.tsx",
                lineNumber: 128,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex min-w-0 flex-1 flex-col",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(ConnectionBanner, {}, void 0, false, {
                        fileName: "[project]/src/components/layout/AppShell.tsx",
                        lineNumber: 130,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
                        className: "flex-1 px-4 py-5 sm:px-6 lg:px-8",
                        id: "main",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(PageErrorBoundary, {
                            children: children
                        }, void 0, false, {
                            fileName: "[project]/src/components/layout/AppShell.tsx",
                            lineNumber: 132,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/components/layout/AppShell.tsx",
                        lineNumber: 131,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("footer", {
                        className: "border-t border-soc-border px-4 py-3 text-[11px] text-soc-muted sm:px-6 lg:px-8",
                        children: "NetShield AI · Offline dataset-driven analysis · Not a live packet-capture or automatic blocking system."
                    }, void 0, false, {
                        fileName: "[project]/src/components/layout/AppShell.tsx",
                        lineNumber: 134,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/layout/AppShell.tsx",
                lineNumber: 129,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(ToastStack, {}, void 0, false, {
                fileName: "[project]/src/components/layout/AppShell.tsx",
                lineNumber: 138,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/layout/AppShell.tsx",
        lineNumber: 127,
        columnNumber: 5
    }, this);
}
_c3 = AppShell;
var _c, _c1, _c2, _c3;
__turbopack_context__.k.register(_c, "ToastStack");
__turbopack_context__.k.register(_c1, "ConnectionBanner");
__turbopack_context__.k.register(_c2, "PageHeader");
__turbopack_context__.k.register(_c3, "AppShell");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/layout/Sidebar.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "NAV_ITEMS",
    ()=>NAV_ITEMS,
    "Sidebar",
    ()=>Sidebar
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/format.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$context$2f$AnalysisContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/context/AnalysisContext.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$primitives$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/primitives.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
;
;
const NAV_ITEMS = [
    {
        href: '/',
        label: 'Security Dashboard',
        description: 'Live posture overview',
        icon: 'shield'
    },
    {
        href: '/dataset',
        label: 'Dataset Analysis',
        description: 'Upload & profile traffic',
        icon: 'database'
    },
    {
        href: '/training',
        label: 'Model Training',
        description: 'Fit RF / DT / LR',
        icon: 'cpu'
    },
    {
        href: '/evaluation',
        label: 'Model Evaluation',
        description: 'Metrics on held-out set',
        icon: 'target'
    },
    {
        href: '/detection',
        label: 'Threat Detection',
        description: 'Score uploaded traffic',
        icon: 'radar'
    },
    {
        href: '/alerts',
        label: 'Security Alerts',
        description: 'Triage & resolve',
        icon: 'bell'
    },
    {
        href: '/reports',
        label: 'Reports',
        description: 'CSV + project report',
        icon: 'file'
    },
    {
        href: '/about',
        label: 'About Project',
        description: 'Scope & limitations',
        icon: 'info'
    }
];
function Icon({ name, className }) {
    const paths = {
        shield: 'M12 3l7 3v6c0 4.5-3 7.9-7 9-4-1.1-7-4.5-7-9V6l7-3z',
        database: 'M12 3c4 0 7 1.1 7 2.5S16 8 12 8 5 6.9 5 5.5 8 3 12 3zM5 5.5v13C5 19.9 8 21 12 21s7-1.1 7-2.5v-13',
        cpu: 'M9 3v2M15 3v2M9 19v2M15 19v2M3 9h2M3 15h2M19 9h2M19 15h2M6 6h12v12H6zM10 10h4v4h-4z',
        target: 'M12 3v3M12 18v3M3 12h3M18 12h3M12 8a4 4 0 100 8 4 4 0 000-8z',
        radar: 'M12 12l6-3M4 12a8 8 0 1116 0 8 8 0 01-16 0zM12 8a4 4 0 100 8',
        bell: 'M18 16H6l1.5-2.5V10a4.5 4.5 0 019 0v3.5L18 16zM10 19a2 2 0 004 0',
        file: 'M7 3h7l4 4v14H7zM14 3v5h4M10 13h6M10 17h6',
        info: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 10v6M12 7h.01'
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "1.6",
        strokeLinecap: "round",
        strokeLinejoin: "round",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('h-[18px] w-[18px] shrink-0', className),
        "aria-hidden": "true",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
            d: paths[name] ?? paths.info
        }, void 0, false, {
            fileName: "[project]/src/components/layout/Sidebar.tsx",
            lineNumber: 50,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/components/layout/Sidebar.tsx",
        lineNumber: 40,
        columnNumber: 5
    }, this);
}
_c = Icon;
function Sidebar() {
    _s();
    const pathname = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePathname"])();
    const [mobileOpen, setMobileOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const { connection, datasets, activeModel, evaluation, alertStats, selectedDataset } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$context$2f$AnalysisContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAnalysis"])();
    const realDatasets = datasets.filter((item)=>!item.isSample);
    const openAlerts = alertStats?.byStatus?.open ?? 0;
    const statusColor = connection === 'online' ? 'bg-soc-low' : connection === 'connecting' ? 'bg-soc-medium' : 'bg-soc-critical';
    const nav = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("nav", {
        className: "flex flex-1 flex-col gap-1 overflow-y-auto px-2 py-3",
        "aria-label": "Primary",
        children: NAV_ITEMS.map((item)=>{
            const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
            const badge = item.href === '/alerts' && openAlerts > 0 ? String(openAlerts) : item.href === '/dataset' && datasets.length > 0 ? String(datasets.length) : undefined;
            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                href: item.href,
                onClick: ()=>setMobileOpen(false),
                "aria-current": active ? 'page' : undefined,
                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('group flex items-start gap-3 rounded-lg border px-3 py-2 text-sm transition-colors', active ? 'border-soc-accent/40 bg-soc-accent/10 text-soc-accent' : 'border-transparent text-soc-muted hover:border-soc-border hover:bg-soc-panel2 hover:text-soc-text'),
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Icon, {
                        name: item.icon,
                        className: "mt-0.5"
                    }, void 0, false, {
                        fileName: "[project]/src/components/layout/Sidebar.tsx",
                        lineNumber: 89,
                        columnNumber: 13
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "min-w-0 flex-1",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "flex items-center justify-between gap-2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "truncate font-medium",
                                        children: item.label
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/layout/Sidebar.tsx",
                                        lineNumber: 92,
                                        columnNumber: 17
                                    }, this),
                                    badge && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "rounded-full bg-soc-panel3 px-1.5 py-0.5 text-[10px] tabular-nums text-soc-text",
                                        children: badge
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/layout/Sidebar.tsx",
                                        lineNumber: 94,
                                        columnNumber: 19
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/layout/Sidebar.tsx",
                                lineNumber: 91,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "mt-0.5 block truncate text-[11px] text-soc-muted",
                                children: item.description
                            }, void 0, false, {
                                fileName: "[project]/src/components/layout/Sidebar.tsx",
                                lineNumber: 99,
                                columnNumber: 15
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/layout/Sidebar.tsx",
                        lineNumber: 90,
                        columnNumber: 13
                    }, this)
                ]
            }, item.href, true, {
                fileName: "[project]/src/components/layout/Sidebar.tsx",
                lineNumber: 77,
                columnNumber: 11
            }, this);
        })
    }, void 0, false, {
        fileName: "[project]/src/components/layout/Sidebar.tsx",
        lineNumber: 67,
        columnNumber: 5
    }, this);
    const footer = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "space-y-2 border-t border-soc-border px-3 py-3 text-[11px]",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-center justify-between gap-2",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "flex items-center gap-1.5 text-soc-muted",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$primitives$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["StatusDot"], {
                                className: statusColor
                            }, void 0, false, {
                                fileName: "[project]/src/components/layout/Sidebar.tsx",
                                lineNumber: 111,
                                columnNumber: 11
                            }, this),
                            "Backend ",
                            connection
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/layout/Sidebar.tsx",
                        lineNumber: 110,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "tabular-nums text-soc-muted",
                        children: [
                            (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatNumber"])(datasets.length),
                            " datasets"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/layout/Sidebar.tsx",
                        lineNumber: 114,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/layout/Sidebar.tsx",
                lineNumber: 109,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex flex-wrap items-center gap-1.5",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('rounded-full border px-2 py-0.5', activeModel ? 'border-soc-low/40 bg-soc-low/10 text-soc-low' : 'border-soc-border bg-soc-panel2 text-soc-muted'),
                        children: activeModel ? `Model: ${activeModel.algorithmLabel}` : 'No trained model'
                    }, void 0, false, {
                        fileName: "[project]/src/components/layout/Sidebar.tsx",
                        lineNumber: 117,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('rounded-full border px-2 py-0.5', evaluation ? 'border-soc-low/40 bg-soc-low/10 text-soc-low' : 'border-soc-border bg-soc-panel2 text-soc-muted'),
                        children: evaluation ? 'Evaluated' : 'Not evaluated'
                    }, void 0, false, {
                        fileName: "[project]/src/components/layout/Sidebar.tsx",
                        lineNumber: 127,
                        columnNumber: 9
                    }, this),
                    realDatasets.length === 0 && datasets.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$primitives$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SampleBadge"], {
                        show: true
                    }, void 0, false, {
                        fileName: "[project]/src/components/layout/Sidebar.tsx",
                        lineNumber: 135,
                        columnNumber: 62
                    }, this),
                    selectedDataset?.isSample && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$primitives$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SampleBadge"], {
                        show: true
                    }, void 0, false, {
                        fileName: "[project]/src/components/layout/Sidebar.tsx",
                        lineNumber: 136,
                        columnNumber: 39
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/layout/Sidebar.tsx",
                lineNumber: 116,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/layout/Sidebar.tsx",
        lineNumber: 108,
        columnNumber: 5
    }, this);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-soc-border bg-soc-bg/95 px-4 py-3 backdrop-blur lg:hidden",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                        href: "/",
                        className: "flex items-center gap-2",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(BrandMark, {}, void 0, false, {
                                fileName: "[project]/src/components/layout/Sidebar.tsx",
                                lineNumber: 146,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-sm font-semibold text-soc-text",
                                children: "NetShield AI"
                            }, void 0, false, {
                                fileName: "[project]/src/components/layout/Sidebar.tsx",
                                lineNumber: 147,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/layout/Sidebar.tsx",
                        lineNumber: 145,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "button",
                        className: "soc-btn-ghost px-3 py-1.5",
                        onClick: ()=>setMobileOpen((open)=>!open),
                        "aria-expanded": mobileOpen,
                        "aria-label": "Toggle navigation",
                        children: mobileOpen ? 'Close' : 'Menu'
                    }, void 0, false, {
                        fileName: "[project]/src/components/layout/Sidebar.tsx",
                        lineNumber: 149,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/layout/Sidebar.tsx",
                lineNumber: 144,
                columnNumber: 7
            }, this),
            mobileOpen && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "fixed inset-0 z-40 lg:hidden",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "absolute inset-0 bg-black/60",
                        onClick: ()=>setMobileOpen(false),
                        "aria-hidden": "true"
                    }, void 0, false, {
                        fileName: "[project]/src/components/layout/Sidebar.tsx",
                        lineNumber: 162,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("aside", {
                        className: "absolute left-0 top-0 flex h-full w-72 flex-col border-r border-soc-border bg-soc-panel",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center justify-between border-b border-soc-border px-4 py-3",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                        href: "/",
                                        className: "flex items-center gap-2",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(BrandMark, {}, void 0, false, {
                                                fileName: "[project]/src/components/layout/Sidebar.tsx",
                                                lineNumber: 170,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-sm font-semibold text-soc-text",
                                                children: "NetShield AI"
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/layout/Sidebar.tsx",
                                                lineNumber: 171,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/layout/Sidebar.tsx",
                                        lineNumber: 169,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        type: "button",
                                        className: "soc-btn-ghost px-2 py-1",
                                        onClick: ()=>setMobileOpen(false),
                                        children: "✕"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/layout/Sidebar.tsx",
                                        lineNumber: 173,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/layout/Sidebar.tsx",
                                lineNumber: 168,
                                columnNumber: 13
                            }, this),
                            nav,
                            footer
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/layout/Sidebar.tsx",
                        lineNumber: 167,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/layout/Sidebar.tsx",
                lineNumber: 161,
                columnNumber: 9
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("aside", {
                className: "sticky top-0 hidden h-screen w-72 shrink-0 flex-col border-r border-soc-border bg-soc-panel lg:flex",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                        href: "/",
                        className: "flex items-center gap-2.5 border-b border-soc-border px-4 py-4",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(BrandMark, {}, void 0, false, {
                                fileName: "[project]/src/components/layout/Sidebar.tsx",
                                lineNumber: 186,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "min-w-0",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "block text-sm font-semibold tracking-wide text-soc-text",
                                        children: "NetShield AI"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/layout/Sidebar.tsx",
                                        lineNumber: 188,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "block truncate text-[11px] text-soc-muted",
                                        children: "Anomaly Detection & Intrusion Monitoring"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/layout/Sidebar.tsx",
                                        lineNumber: 189,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/layout/Sidebar.tsx",
                                lineNumber: 187,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/layout/Sidebar.tsx",
                        lineNumber: 185,
                        columnNumber: 9
                    }, this),
                    nav,
                    footer
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/layout/Sidebar.tsx",
                lineNumber: 184,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/layout/Sidebar.tsx",
        lineNumber: 142,
        columnNumber: 5
    }, this);
}
_s(Sidebar, "J3MamEDof8NbtrtF7JLe4ysHuoU=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePathname"],
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$context$2f$AnalysisContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAnalysis"]
    ];
});
_c1 = Sidebar;
function BrandMark() {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
        className: "flex h-8 w-8 items-center justify-center rounded-lg border border-soc-accent/40 bg-soc-accent/10",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
            viewBox: "0 0 24 24",
            className: "h-4 w-4 text-soc-accent",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: "1.8",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                    d: "M12 3l7 3v6c0 4.5-3 7.9-7 9-4-1.1-7-4.5-7-9V6l7-3z",
                    strokeLinejoin: "round"
                }, void 0, false, {
                    fileName: "[project]/src/components/layout/Sidebar.tsx",
                    lineNumber: 203,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                    d: "M9 12l2 2 4-4",
                    strokeLinecap: "round",
                    strokeLinejoin: "round"
                }, void 0, false, {
                    fileName: "[project]/src/components/layout/Sidebar.tsx",
                    lineNumber: 204,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/layout/Sidebar.tsx",
            lineNumber: 202,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/components/layout/Sidebar.tsx",
        lineNumber: 201,
        columnNumber: 5
    }, this);
}
_c2 = BrandMark;
var _c, _c1, _c2;
__turbopack_context__.k.register(_c, "Icon");
__turbopack_context__.k.register(_c1, "Sidebar");
__turbopack_context__.k.register(_c2, "BrandMark");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/ui/primitives.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Badge",
    ()=>Badge,
    "Button",
    ()=>Button,
    "EmptyState",
    ()=>EmptyState,
    "ErrorState",
    ()=>ErrorState,
    "Field",
    ()=>Field,
    "KeyValue",
    ()=>KeyValue,
    "LinkButton",
    ()=>LinkButton,
    "LoadingBlock",
    ()=>LoadingBlock,
    "MetricCard",
    ()=>MetricCard,
    "Notice",
    ()=>Notice,
    "Pagination",
    ()=>Pagination,
    "Panel",
    ()=>Panel,
    "ProgressBar",
    ()=>ProgressBar,
    "SampleBadge",
    ()=>SampleBadge,
    "Select",
    ()=>Select,
    "Spinner",
    ()=>Spinner,
    "StatusDot",
    ()=>StatusDot,
    "Tabs",
    ()=>Tabs
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/format.ts [app-client] (ecmascript)");
'use client';
;
;
function Panel({ title, subtitle, actions, children, className, bodyClassName, id }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
        id: id,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('soc-panel flex flex-col', className),
        children: [
            (title || actions) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
                className: "flex flex-wrap items-start justify-between gap-3 border-b border-soc-border px-4 py-3",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "min-w-0",
                        children: [
                            title && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                className: "text-sm font-semibold tracking-wide text-soc-text",
                                children: title
                            }, void 0, false, {
                                fileName: "[project]/src/components/ui/primitives.tsx",
                                lineNumber: 31,
                                columnNumber: 23
                            }, this),
                            subtitle && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "mt-0.5 text-xs text-soc-muted",
                                children: subtitle
                            }, void 0, false, {
                                fileName: "[project]/src/components/ui/primitives.tsx",
                                lineNumber: 32,
                                columnNumber: 26
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/ui/primitives.tsx",
                        lineNumber: 30,
                        columnNumber: 11
                    }, this),
                    actions && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex flex-wrap items-center gap-2",
                        children: actions
                    }, void 0, false, {
                        fileName: "[project]/src/components/ui/primitives.tsx",
                        lineNumber: 34,
                        columnNumber: 23
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/ui/primitives.tsx",
                lineNumber: 29,
                columnNumber: 9
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('flex-1 p-4', bodyClassName),
                children: children
            }, void 0, false, {
                fileName: "[project]/src/components/ui/primitives.tsx",
                lineNumber: 37,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/ui/primitives.tsx",
        lineNumber: 27,
        columnNumber: 5
    }, this);
}
_c = Panel;
const VARIANT_CLASS = {
    primary: 'soc-btn-primary',
    ghost: 'soc-btn-ghost',
    danger: 'soc-btn-danger'
};
function Button({ variant = 'ghost', className, loading = false, children, ...rest }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
        type: "button",
        ...rest,
        disabled: rest.disabled || loading,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])(VARIANT_CLASS[variant], className),
        children: [
            loading && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Spinner, {
                className: "h-3.5 w-3.5"
            }, void 0, false, {
                fileName: "[project]/src/components/ui/primitives.tsx",
                lineNumber: 67,
                columnNumber: 19
            }, this),
            children
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/ui/primitives.tsx",
        lineNumber: 61,
        columnNumber: 5
    }, this);
}
_c1 = Button;
function LinkButton({ href, variant = 'ghost', className, children, download = true }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
        href: href,
        download: download,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])(VARIANT_CLASS[variant], className),
        children: children
    }, void 0, false, {
        fileName: "[project]/src/components/ui/primitives.tsx",
        lineNumber: 87,
        columnNumber: 5
    }, this);
}
_c2 = LinkButton;
function Badge({ children, className }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium', 'border-soc-border bg-soc-panel2 text-soc-muted', className),
        children: children
    }, void 0, false, {
        fileName: "[project]/src/components/ui/primitives.tsx",
        lineNumber: 98,
        columnNumber: 5
    }, this);
}
_c3 = Badge;
function SampleBadge({ show }) {
    if (!show) return null;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Badge, {
        className: "border-soc-medium/40 bg-soc-medium/10 text-soc-medium",
        children: "Sample data — not UNSW-NB15"
    }, void 0, false, {
        fileName: "[project]/src/components/ui/primitives.tsx",
        lineNumber: 113,
        columnNumber: 5
    }, this);
}
_c4 = SampleBadge;
function MetricCard({ label, value, hint, accent, icon }) {
    const accents = {
        cyan: 'text-soc-accent',
        critical: 'text-soc-critical',
        high: 'text-soc-high',
        medium: 'text-soc-medium',
        low: 'text-soc-low',
        purple: 'text-soc-purple',
        muted: 'text-soc-muted'
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "soc-panel p-4",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-start justify-between gap-2",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-xs font-medium uppercase tracking-wide text-soc-muted",
                        children: label
                    }, void 0, false, {
                        fileName: "[project]/src/components/ui/primitives.tsx",
                        lineNumber: 147,
                        columnNumber: 9
                    }, this),
                    icon && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('opacity-80', accents[accent ?? 'muted']),
                        children: icon
                    }, void 0, false, {
                        fileName: "[project]/src/components/ui/primitives.tsx",
                        lineNumber: 148,
                        columnNumber: 18
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/ui/primitives.tsx",
                lineNumber: 146,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('mt-2 text-2xl font-semibold tabular-nums', accents[accent ?? 'cyan']),
                children: value
            }, void 0, false, {
                fileName: "[project]/src/components/ui/primitives.tsx",
                lineNumber: 150,
                columnNumber: 7
            }, this),
            hint && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "mt-1 text-xs text-soc-muted",
                children: hint
            }, void 0, false, {
                fileName: "[project]/src/components/ui/primitives.tsx",
                lineNumber: 151,
                columnNumber: 16
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/ui/primitives.tsx",
        lineNumber: 145,
        columnNumber: 5
    }, this);
}
_c5 = MetricCard;
function Spinner({ className }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('h-4 w-4 animate-spin', className),
        viewBox: "0 0 24 24",
        fill: "none",
        "aria-hidden": "true",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                cx: "12",
                cy: "12",
                r: "10",
                stroke: "currentColor",
                strokeOpacity: "0.25",
                strokeWidth: "3"
            }, void 0, false, {
                fileName: "[project]/src/components/ui/primitives.tsx",
                lineNumber: 167,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: "M22 12a10 10 0 0 0-10-10",
                stroke: "currentColor",
                strokeWidth: "3",
                strokeLinecap: "round"
            }, void 0, false, {
                fileName: "[project]/src/components/ui/primitives.tsx",
                lineNumber: 168,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/ui/primitives.tsx",
        lineNumber: 161,
        columnNumber: 5
    }, this);
}
_c6 = Spinner;
function LoadingBlock({ label = 'Loading…' }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex items-center justify-center gap-3 py-10 text-sm text-soc-muted",
        role: "status",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Spinner, {
                className: "text-soc-accent"
            }, void 0, false, {
                fileName: "[project]/src/components/ui/primitives.tsx",
                lineNumber: 176,
                columnNumber: 7
            }, this),
            label
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/ui/primitives.tsx",
        lineNumber: 175,
        columnNumber: 5
    }, this);
}
_c7 = LoadingBlock;
function EmptyState({ title, description, action }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-soc-border bg-soc-panel2/40 px-6 py-10 text-center",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "text-sm font-medium text-soc-text",
                children: title
            }, void 0, false, {
                fileName: "[project]/src/components/ui/primitives.tsx",
                lineNumber: 193,
                columnNumber: 7
            }, this),
            description && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "max-w-xl text-xs leading-relaxed text-soc-muted",
                children: description
            }, void 0, false, {
                fileName: "[project]/src/components/ui/primitives.tsx",
                lineNumber: 194,
                columnNumber: 23
            }, this),
            action
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/ui/primitives.tsx",
        lineNumber: 192,
        columnNumber: 5
    }, this);
}
_c8 = EmptyState;
function ErrorState({ title = 'Something went wrong', message, details, action }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        role: "alert",
        className: "rounded-lg border border-soc-critical/40 bg-soc-critical/5 px-4 py-3 text-sm",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "font-medium text-soc-critical",
                children: title
            }, void 0, false, {
                fileName: "[project]/src/components/ui/primitives.tsx",
                lineNumber: 216,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "mt-1 text-soc-text/90",
                children: message
            }, void 0, false, {
                fileName: "[project]/src/components/ui/primitives.tsx",
                lineNumber: 217,
                columnNumber: 7
            }, this),
            details && details.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                className: "mt-2 list-disc space-y-1 pl-5 text-xs text-soc-muted",
                children: details.map((item, index)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                        children: item
                    }, index, false, {
                        fileName: "[project]/src/components/ui/primitives.tsx",
                        lineNumber: 221,
                        columnNumber: 13
                    }, this))
            }, void 0, false, {
                fileName: "[project]/src/components/ui/primitives.tsx",
                lineNumber: 219,
                columnNumber: 9
            }, this),
            action && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mt-3",
                children: action
            }, void 0, false, {
                fileName: "[project]/src/components/ui/primitives.tsx",
                lineNumber: 225,
                columnNumber: 18
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/ui/primitives.tsx",
        lineNumber: 212,
        columnNumber: 5
    }, this);
}
_c9 = ErrorState;
function Notice({ tone = 'info', title, children }) {
    const tones = {
        info: 'border-soc-info/40 bg-soc-info/5 text-soc-info',
        warning: 'border-soc-medium/40 bg-soc-medium/5 text-soc-medium',
        danger: 'border-soc-critical/40 bg-soc-critical/5 text-soc-critical',
        success: 'border-soc-low/40 bg-soc-low/5 text-soc-low'
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('rounded-lg border px-4 py-3 text-sm', tones[tone]),
        children: [
            title && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "font-medium",
                children: title
            }, void 0, false, {
                fileName: "[project]/src/components/ui/primitives.tsx",
                lineNumber: 247,
                columnNumber: 17
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('text-xs leading-relaxed', title ? 'mt-1 text-soc-text/85' : 'text-soc-text/85'),
                children: children
            }, void 0, false, {
                fileName: "[project]/src/components/ui/primitives.tsx",
                lineNumber: 248,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/ui/primitives.tsx",
        lineNumber: 246,
        columnNumber: 5
    }, this);
}
_c10 = Notice;
function ProgressBar({ value, label, tone = 'accent' }) {
    const clamped = Math.max(0, Math.min(100, value));
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "h-2 w-full overflow-hidden rounded-full bg-soc-panel3",
                role: "progressbar",
                "aria-valuenow": clamped,
                "aria-valuemin": 0,
                "aria-valuemax": 100,
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('h-full rounded-full transition-all duration-300', tone === 'accent' ? 'bg-soc-accent' : 'bg-soc-critical'),
                    style: {
                        width: `${clamped}%`
                    }
                }, void 0, false, {
                    fileName: "[project]/src/components/ui/primitives.tsx",
                    lineNumber: 274,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/components/ui/primitives.tsx",
                lineNumber: 267,
                columnNumber: 7
            }, this),
            label && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "mt-1.5 text-xs text-soc-muted",
                children: [
                    label,
                    " · ",
                    clamped,
                    "%"
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/ui/primitives.tsx",
                lineNumber: 283,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/ui/primitives.tsx",
        lineNumber: 266,
        columnNumber: 5
    }, this);
}
_c11 = ProgressBar;
function Field({ label, hint, htmlFor, children }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                className: "soc-label",
                htmlFor: htmlFor,
                children: label
            }, void 0, false, {
                fileName: "[project]/src/components/ui/primitives.tsx",
                lineNumber: 307,
                columnNumber: 7
            }, this),
            children,
            hint && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "mt-1 text-[11px] leading-relaxed text-soc-muted",
                children: hint
            }, void 0, false, {
                fileName: "[project]/src/components/ui/primitives.tsx",
                lineNumber: 311,
                columnNumber: 16
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/ui/primitives.tsx",
        lineNumber: 306,
        columnNumber: 5
    }, this);
}
_c12 = Field;
function Select({ value, onChange, options, id, disabled, placeholder }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
        id: id,
        className: "soc-input",
        value: value,
        disabled: disabled,
        onChange: (event)=>onChange(event.target.value),
        children: [
            placeholder && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                value: "",
                children: placeholder
            }, void 0, false, {
                fileName: "[project]/src/components/ui/primitives.tsx",
                lineNumber: 339,
                columnNumber: 23
            }, this),
            options.map((option)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                    value: option.value,
                    children: option.label
                }, option.value, false, {
                    fileName: "[project]/src/components/ui/primitives.tsx",
                    lineNumber: 341,
                    columnNumber: 9
                }, this))
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/ui/primitives.tsx",
        lineNumber: 332,
        columnNumber: 5
    }, this);
}
_c13 = Select;
function Tabs({ tabs, active, onChange }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        role: "tablist",
        className: "flex flex-wrap gap-1 rounded-lg border border-soc-border bg-soc-panel2/60 p-1",
        children: tabs.map((tab)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                role: "tab",
                type: "button",
                "aria-selected": active === tab.id,
                onClick: ()=>onChange(tab.id),
                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('rounded-md px-3 py-1.5 text-xs font-medium transition-colors', active === tab.id ? 'bg-soc-accent/15 text-soc-accent' : 'text-soc-muted hover:bg-soc-panel3 hover:text-soc-text'),
                children: [
                    tab.label,
                    tab.count !== undefined && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "ml-1.5 tabular-nums opacity-70",
                        children: [
                            "(",
                            tab.count,
                            ")"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/ui/primitives.tsx",
                        lineNumber: 378,
                        columnNumber: 39
                    }, this)
                ]
            }, tab.id, true, {
                fileName: "[project]/src/components/ui/primitives.tsx",
                lineNumber: 364,
                columnNumber: 9
            }, this))
    }, void 0, false, {
        fileName: "[project]/src/components/ui/primitives.tsx",
        lineNumber: 362,
        columnNumber: 5
    }, this);
}
_c14 = Tabs;
function Pagination({ page, totalPages, total, pageSize, onPageChange, onPageSizeChange, pageSizes = [
    10,
    25,
    50,
    100
] }) {
    const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, total);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex flex-wrap items-center justify-between gap-3 border-t border-soc-border px-1 pt-3 text-xs text-soc-muted",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "tabular-nums",
                children: [
                    "Showing ",
                    start,
                    "–",
                    end,
                    " of ",
                    total
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/ui/primitives.tsx",
                lineNumber: 409,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-center gap-2",
                children: [
                    onPageSizeChange && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                        className: "flex items-center gap-1.5",
                        children: [
                            "Rows",
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                className: "rounded border border-soc-border bg-soc-bg px-1.5 py-1 text-xs text-soc-text",
                                value: pageSize,
                                onChange: (event)=>onPageSizeChange(Number(event.target.value)),
                                children: pageSizes.map((size)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                        value: size,
                                        children: size
                                    }, size, false, {
                                        fileName: "[project]/src/components/ui/primitives.tsx",
                                        lineNumber: 422,
                                        columnNumber: 17
                                    }, this))
                            }, void 0, false, {
                                fileName: "[project]/src/components/ui/primitives.tsx",
                                lineNumber: 416,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/ui/primitives.tsx",
                        lineNumber: 414,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center gap-1",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                type: "button",
                                className: "soc-btn-ghost px-2 py-1",
                                onClick: ()=>onPageChange(1),
                                disabled: page <= 1,
                                "aria-label": "First page",
                                children: "«"
                            }, void 0, false, {
                                fileName: "[project]/src/components/ui/primitives.tsx",
                                lineNumber: 430,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                type: "button",
                                className: "soc-btn-ghost px-2 py-1",
                                onClick: ()=>onPageChange(page - 1),
                                disabled: page <= 1,
                                children: "Prev"
                            }, void 0, false, {
                                fileName: "[project]/src/components/ui/primitives.tsx",
                                lineNumber: 439,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "px-2 tabular-nums text-soc-text",
                                children: [
                                    page,
                                    " / ",
                                    totalPages
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/ui/primitives.tsx",
                                lineNumber: 447,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                type: "button",
                                className: "soc-btn-ghost px-2 py-1",
                                onClick: ()=>onPageChange(page + 1),
                                disabled: page >= totalPages,
                                children: "Next"
                            }, void 0, false, {
                                fileName: "[project]/src/components/ui/primitives.tsx",
                                lineNumber: 450,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                type: "button",
                                className: "soc-btn-ghost px-2 py-1",
                                onClick: ()=>onPageChange(totalPages),
                                disabled: page >= totalPages,
                                "aria-label": "Last page",
                                children: "»"
                            }, void 0, false, {
                                fileName: "[project]/src/components/ui/primitives.tsx",
                                lineNumber: 458,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/ui/primitives.tsx",
                        lineNumber: 429,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/ui/primitives.tsx",
                lineNumber: 412,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/ui/primitives.tsx",
        lineNumber: 408,
        columnNumber: 5
    }, this);
}
_c15 = Pagination;
function KeyValue({ items }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("dl", {
        className: "grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3",
        children: items.map((item)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "min-w-0",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("dt", {
                        className: "text-[11px] uppercase tracking-wide text-soc-muted",
                        children: item.label
                    }, void 0, false, {
                        fileName: "[project]/src/components/ui/primitives.tsx",
                        lineNumber: 481,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("dd", {
                        className: "mt-0.5 break-words text-sm text-soc-text",
                        children: item.value
                    }, void 0, false, {
                        fileName: "[project]/src/components/ui/primitives.tsx",
                        lineNumber: 482,
                        columnNumber: 11
                    }, this)
                ]
            }, item.label, true, {
                fileName: "[project]/src/components/ui/primitives.tsx",
                lineNumber: 480,
                columnNumber: 9
            }, this))
    }, void 0, false, {
        fileName: "[project]/src/components/ui/primitives.tsx",
        lineNumber: 478,
        columnNumber: 5
    }, this);
}
_c16 = KeyValue;
function StatusDot({ className }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('inline-block h-2 w-2 rounded-full', className),
        "aria-hidden": "true"
    }, void 0, false, {
        fileName: "[project]/src/components/ui/primitives.tsx",
        lineNumber: 490,
        columnNumber: 10
    }, this);
}
_c17 = StatusDot;
var _c, _c1, _c2, _c3, _c4, _c5, _c6, _c7, _c8, _c9, _c10, _c11, _c12, _c13, _c14, _c15, _c16, _c17;
__turbopack_context__.k.register(_c, "Panel");
__turbopack_context__.k.register(_c1, "Button");
__turbopack_context__.k.register(_c2, "LinkButton");
__turbopack_context__.k.register(_c3, "Badge");
__turbopack_context__.k.register(_c4, "SampleBadge");
__turbopack_context__.k.register(_c5, "MetricCard");
__turbopack_context__.k.register(_c6, "Spinner");
__turbopack_context__.k.register(_c7, "LoadingBlock");
__turbopack_context__.k.register(_c8, "EmptyState");
__turbopack_context__.k.register(_c9, "ErrorState");
__turbopack_context__.k.register(_c10, "Notice");
__turbopack_context__.k.register(_c11, "ProgressBar");
__turbopack_context__.k.register(_c12, "Field");
__turbopack_context__.k.register(_c13, "Select");
__turbopack_context__.k.register(_c14, "Tabs");
__turbopack_context__.k.register(_c15, "Pagination");
__turbopack_context__.k.register(_c16, "KeyValue");
__turbopack_context__.k.register(_c17, "StatusDot");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/context/AnalysisContext.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AnalysisProvider",
    ()=>AnalysisProvider,
    "useAnalysis",
    ()=>useAnalysis
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
/**
 * Single source of truth for everything the pages share:
 * server metadata, datasets, the active model, the latest evaluation,
 * the latest detection run and alert statistics.
 *
 * Every page reads from this context instead of fetching on its own, so the
 * dashboard, tables and reports can never disagree about what is loaded.
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/api.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature();
'use client';
;
;
const AnalysisContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createContext"])(null);
let toastCounter = 0;
function AnalysisProvider({ children }) {
    _s();
    const [connection, setConnection] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('connecting');
    const [connectionError, setConnectionError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [health, setHealth] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [meta, setMeta] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [datasets, setDatasets] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [selectedDatasetId, setSelectedDatasetId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [models, setModels] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [activeModelId, setActiveModelId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [evaluation, setEvaluation] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [detection, setDetection] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [alertStats, setAlertStats] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [storage, setStorage] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [refreshing, setRefreshing] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [toasts, setToasts] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const selectedRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    /* Mirrored into a ref so `reloadDatasets` can read the *current* selection
     without being re-created on every selection change. Synced in an effect
     rather than during render (writing refs while rendering is unsafe). */ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "AnalysisProvider.useEffect": ()=>{
            selectedRef.current = selectedDatasetId;
        }
    }["AnalysisProvider.useEffect"], [
        selectedDatasetId
    ]);
    const notify = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "AnalysisProvider.useCallback[notify]": (tone, message)=>{
            const id = `toast-${++toastCounter}`;
            setToasts({
                "AnalysisProvider.useCallback[notify]": (current)=>[
                        ...current,
                        {
                            id,
                            tone,
                            message
                        }
                    ]
            }["AnalysisProvider.useCallback[notify]"]);
            if ("TURBOPACK compile-time truthy", 1) {
                window.setTimeout({
                    "AnalysisProvider.useCallback[notify]": ()=>{
                        setToasts({
                            "AnalysisProvider.useCallback[notify]": (current)=>current.filter({
                                    "AnalysisProvider.useCallback[notify]": (toast)=>toast.id !== id
                                }["AnalysisProvider.useCallback[notify]"])
                        }["AnalysisProvider.useCallback[notify]"]);
                    }
                }["AnalysisProvider.useCallback[notify]"], 6000);
            }
        }
    }["AnalysisProvider.useCallback[notify]"], []);
    const dismissToast = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "AnalysisProvider.useCallback[dismissToast]": (id)=>{
            setToasts({
                "AnalysisProvider.useCallback[dismissToast]": (current)=>current.filter({
                        "AnalysisProvider.useCallback[dismissToast]": (toast)=>toast.id !== id
                    }["AnalysisProvider.useCallback[dismissToast]"])
            }["AnalysisProvider.useCallback[dismissToast]"]);
        }
    }["AnalysisProvider.useCallback[dismissToast]"], []);
    const applyState = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "AnalysisProvider.useCallback[applyState]": (state)=>{
            setDatasets(state.datasets ?? []);
            setStorage(state.storage ?? null);
            setAlertStats(state.alerts ?? null);
            setActiveModelId(state.model?.id ?? null);
            setEvaluation(state.evaluation ?? null);
            setDetection(state.detection ?? null);
            setSelectedDatasetId({
                "AnalysisProvider.useCallback[applyState]": (current)=>{
                    if (current && (state.datasets ?? []).some({
                        "AnalysisProvider.useCallback[applyState]": (item)=>item.id === current
                    }["AnalysisProvider.useCallback[applyState]"])) return current;
                    return state.datasets?.[0]?.id ?? null;
                }
            }["AnalysisProvider.useCallback[applyState]"]);
        }
    }["AnalysisProvider.useCallback[applyState]"], []);
    const refresh = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "AnalysisProvider.useCallback[refresh]": async (options = {})=>{
            if (!options.silent) setRefreshing(true);
            try {
                const state = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].state();
                applyState(state);
                setConnection('online');
                setConnectionError(null);
                try {
                    const [healthResponse, metaResponse, modelList] = await Promise.all([
                        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].health(),
                        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].meta(),
                        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].models.list()
                    ]);
                    setHealth(healthResponse);
                    setMeta(metaResponse);
                    setModels(modelList.items ?? []);
                    setActiveModelId(modelList.activeModelId ?? null);
                } catch  {
                /* metadata is optional; the core state already loaded */ }
            } catch (error) {
                const message = error instanceof __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ApiError"] ? error.message : error instanceof Error ? error.message : String(error);
                setConnection('offline');
                setConnectionError(message);
            } finally{
                setLoading(false);
                setRefreshing(false);
            }
        }
    }["AnalysisProvider.useCallback[refresh]"], [
        applyState
    ]);
    const reloadDatasets = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "AnalysisProvider.useCallback[reloadDatasets]": async ()=>{
            const response = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].datasets.list();
            setDatasets(response.items ?? []);
            if (!selectedRef.current || !(response.items ?? []).some({
                "AnalysisProvider.useCallback[reloadDatasets]": (item)=>item.id === selectedRef.current
            }["AnalysisProvider.useCallback[reloadDatasets]"])) {
                setSelectedDatasetId(response.items?.[0]?.id ?? null);
            }
            return response.items ?? [];
        }
    }["AnalysisProvider.useCallback[reloadDatasets]"], []);
    const reloadModels = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "AnalysisProvider.useCallback[reloadModels]": async ()=>{
            const response = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].models.list();
            setModels(response.items ?? []);
            setActiveModelId(response.activeModelId ?? null);
        }
    }["AnalysisProvider.useCallback[reloadModels]"], []);
    const reloadAlerts = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "AnalysisProvider.useCallback[reloadAlerts]": async ()=>{
            const stats = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].alerts.stats();
            setAlertStats(stats);
        }
    }["AnalysisProvider.useCallback[reloadAlerts]"], []);
    const setActiveModelLocally = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "AnalysisProvider.useCallback[setActiveModelLocally]": (model)=>{
            setActiveModelId(model?.id ?? null);
        }
    }["AnalysisProvider.useCallback[setActiveModelLocally]"], []);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "AnalysisProvider.useEffect": ()=>{
            void refresh();
        }
    }["AnalysisProvider.useEffect"], [
        refresh
    ]);
    const selectedDataset = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "AnalysisProvider.useMemo[selectedDataset]": ()=>datasets.find({
                "AnalysisProvider.useMemo[selectedDataset]": (item)=>item.id === selectedDatasetId
            }["AnalysisProvider.useMemo[selectedDataset]"]) ?? null
    }["AnalysisProvider.useMemo[selectedDataset]"], [
        datasets,
        selectedDatasetId
    ]);
    const activeModel = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "AnalysisProvider.useMemo[activeModel]": ()=>models.find({
                "AnalysisProvider.useMemo[activeModel]": (item)=>item.id === activeModelId
            }["AnalysisProvider.useMemo[activeModel]"]) ?? models[0] ?? null
    }["AnalysisProvider.useMemo[activeModel]"], [
        models,
        activeModelId
    ]);
    const value = {
        connection,
        connectionError,
        health,
        meta,
        datasets,
        selectedDatasetId,
        setSelectedDatasetId,
        selectedDataset,
        models,
        activeModel,
        activeModelId,
        evaluation,
        detection,
        alertStats,
        storage,
        loading,
        refreshing,
        refresh,
        reloadDatasets,
        reloadModels,
        setActiveModelLocally,
        setEvaluationLocally: setEvaluation,
        setDetectionLocally: setDetection,
        reloadAlerts,
        notify,
        dismissToast,
        toasts
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(AnalysisContext.Provider, {
        value: value,
        children: children
    }, void 0, false, {
        fileName: "[project]/src/context/AnalysisContext.tsx",
        lineNumber: 240,
        columnNumber: 10
    }, this);
}
_s(AnalysisProvider, "htddQK1pHAYPBLndE2B2Rv+wsGI=");
_c = AnalysisProvider;
function useAnalysis() {
    _s1();
    const context = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useContext"])(AnalysisContext);
    if (!context) {
        throw new Error('useAnalysis must be used inside <AnalysisProvider>');
    }
    return context;
}
_s1(useAnalysis, "b9L3QQ+jgeyIrH0NfHrJ8nn7VMU=");
var _c;
__turbopack_context__.k.register(_c, "AnalysisProvider");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/lib/api.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Typed client for the NetShield AI Python backend.
 *
 * Works both:
 *  - directly against the backend (`NEXT_PUBLIC_API_BASE=http://127.0.0.1:8000`), or
 *  - through the Next.js dev-server proxy (`NEXT_PUBLIC_API_BASE=/pyapi`),
 *    which is the default and avoids cross-origin requests entirely.
 */ __turbopack_context__.s([
    "API_BASE",
    ()=>API_BASE,
    "ApiError",
    ()=>ApiError,
    "api",
    ()=>api,
    "downloadUrl",
    ()=>downloadUrl
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
const API_BASE = (__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].env.NEXT_PUBLIC_API_BASE ?? '/pyapi').replace(/\/$/, '');
class ApiError extends Error {
    status;
    details;
    code;
    constructor(message, status, details = [], code = 'error'){
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.details = details;
        this.code = code;
    }
}
function extractError(payload, status) {
    if (typeof payload === 'object' && payload !== null) {
        const record = payload;
        const detail = record.detail;
        if (typeof detail === 'object' && detail !== null) {
            const nested = detail;
            const details = Array.isArray(nested.details) ? nested.details.map((item)=>String(item)) : [];
            return new ApiError(String(nested.message ?? 'Request failed'), status, details, String(nested.error ?? 'error'));
        }
        if (typeof detail === 'string') return new ApiError(detail, status);
        if (typeof record.message === 'string') return new ApiError(record.message, status);
    }
    return new ApiError(`Request failed with status ${status}`, status);
}
async function request(path, init) {
    let response;
    try {
        response = await fetch(`${API_BASE}${path}`, {
            ...init,
            headers: {
                Accept: 'application/json',
                ...init?.body instanceof FormData ? {} : {
                    'Content-Type': 'application/json'
                },
                ...init?.headers ?? {}
            },
            cache: 'no-store'
        });
    } catch (error) {
        throw new ApiError('Cannot reach the NetShield backend. Start it with "cd backend && .venv\\Scripts\\python -m uvicorn app.main:app --port 8000".', 0, [
            error instanceof Error ? error.message : String(error)
        ], 'network_error');
    }
    if (response.status === 204) return undefined;
    const text = await response.text();
    let payload = null;
    if (text) {
        try {
            payload = JSON.parse(text);
        } catch  {
            payload = text;
        }
    }
    if (!response.ok) throw extractError(payload, response.status);
    return payload;
}
function query(params) {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value])=>{
        if (value === undefined || value === null || value === '') return;
        search.set(key, String(value));
    });
    const text = search.toString();
    return text ? `?${text}` : '';
}
function downloadUrl(path) {
    return `${API_BASE}${path}`;
}
const api = {
    health: ()=>request('/api/health'),
    meta: ()=>request('/api/meta'),
    state: ()=>request('/api/state'),
    datasets: {
        list: ()=>request('/api/datasets'),
        projectFiles: ()=>request('/api/datasets/project-files'),
        upload: (file, onProgress)=>{
            const form = new FormData();
            form.append('file', file);
            // fetch() has no upload progress; the caller shows an indeterminate state.
            onProgress?.(0);
            return request('/api/datasets/upload', {
                method: 'POST',
                body: form
            });
        },
        summary: (id)=>request(`/api/datasets/${id}/summary`),
        reanalyze: (id)=>request(`/api/datasets/${id}/reanalyze`, {
                method: 'POST'
            }),
        rows: (id, params)=>request(`/api/datasets/${id}/rows${query(params)}`),
        filterOptions: (id)=>request(`/api/datasets/${id}/filter-options`),
        remove: (id)=>request(`/api/datasets/${id}`, {
                method: 'DELETE'
            }),
        exportUrl: (id, params = {})=>downloadUrl(`/api/datasets/${id}/export${query(params)}`),
        reportUrl: (id)=>downloadUrl(`/api/datasets/${id}/report`)
    },
    models: {
        list: ()=>request('/api/models'),
        active: ()=>request('/api/models/active'),
        train: (body)=>request('/api/models/train', {
                method: 'POST',
                body: JSON.stringify(body)
            }),
        activate: (id)=>request(`/api/models/${id}/activate`, {
                method: 'POST'
            }),
        remove: (id)=>request(`/api/models/${id}`, {
                method: 'DELETE'
            })
    },
    jobs: {
        get: (id)=>request(`/api/jobs/${id}`)
    },
    evaluations: {
        list: ()=>request('/api/evaluations'),
        latest: ()=>request('/api/evaluations/latest'),
        run: (body)=>request('/api/evaluate', {
                method: 'POST',
                body: JSON.stringify(body)
            }),
        reportUrl: (id)=>downloadUrl(`/api/evaluations/${id}/report`)
    },
    detection: {
        list: ()=>request('/api/detections'),
        latest: ()=>request('/api/detections/latest'),
        get: (id)=>request(`/api/detections/${id}`),
        run: (body)=>{
            const form = new FormData();
            form.append('file', body.file);
            if (body.modelId) form.append('model_id', body.modelId);
            form.append('mode', body.mode ?? 'model');
            if (body.critical !== undefined) form.append('critical', String(body.critical));
            if (body.high !== undefined) form.append('high', String(body.high));
            if (body.medium !== undefined) form.append('medium', String(body.medium));
            form.append('create_alerts', String(body.createAlerts ?? true));
            return request('/api/detect', {
                method: 'POST',
                body: form
            });
        },
        rows: (id, params)=>request(`/api/detections/${id}/rows${query(params)}`),
        raiseAlerts: (id)=>request(`/api/detections/${id}/alerts`, {
                method: 'POST'
            }),
        remove: (id)=>request(`/api/detections/${id}`, {
                method: 'DELETE'
            }),
        reportUrl: (id)=>downloadUrl(`/api/detections/${id}/report`)
    },
    alerts: {
        list: (params)=>request(`/api/alerts${query(params)}`),
        stats: ()=>request('/api/alerts/stats'),
        update: (id, status)=>request(`/api/alerts/${id}`, {
                method: 'PATCH',
                body: JSON.stringify({
                    status
                })
            }),
        bulkStatus: (ids, status)=>request('/api/alerts/bulk-status', {
                method: 'POST',
                body: JSON.stringify({
                    ids,
                    status
                })
            }),
        remove: (ids)=>request('/api/alerts/delete', {
                method: 'POST',
                body: JSON.stringify({
                    ids,
                    confirm: true
                })
            }),
        reportUrl: (params = {})=>downloadUrl(`/api/alerts/report${query(params)}`)
    }
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/lib/format.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "cn",
    ()=>cn,
    "formatBytes",
    ()=>formatBytes,
    "formatDateTime",
    ()=>formatDateTime,
    "formatDecimal",
    ()=>formatDecimal,
    "formatNumber",
    ()=>formatNumber,
    "formatPercent",
    ()=>formatPercent,
    "formatRelative",
    ()=>formatRelative,
    "sortEntries",
    ()=>sortEntries,
    "titleCase",
    ()=>titleCase,
    "truncate",
    ()=>truncate
]);
function cn(...values) {
    return values.filter(Boolean).join(' ');
}
const numberFormatter = new Intl.NumberFormat('en-US');
function formatNumber(value) {
    if (value === null || value === undefined || Number.isNaN(value)) return '—';
    return numberFormatter.format(value);
}
function formatDecimal(value, digits = 4) {
    if (value === null || value === undefined || Number.isNaN(value)) return '—';
    return value.toFixed(digits);
}
function formatPercent(value, options = {}) {
    if (value === null || value === undefined || Number.isNaN(value)) return '—';
    const digits = options.digits ?? 2;
    const asPercent = options.alreadyPercent ? value : value * 100;
    return `${asPercent.toFixed(digits)}%`;
}
function formatBytes(bytes) {
    if (!bytes) return '0 B';
    const units = [
        'B',
        'KB',
        'MB',
        'GB',
        'TB'
    ];
    const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / 1024 ** exponent;
    return `${value.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}
function formatDateTime(iso) {
    if (!iso) return '—';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    return date.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}
function formatRelative(iso) {
    if (!iso) return '—';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    const deltaSeconds = Math.round((Date.now() - date.getTime()) / 1000);
    if (Math.abs(deltaSeconds) < 60) return 'just now';
    const minutes = Math.round(deltaSeconds / 60);
    if (Math.abs(minutes) < 60) return `${minutes} min ago`;
    const hours = Math.round(minutes / 60);
    if (Math.abs(hours) < 24) return `${hours} h ago`;
    return `${Math.round(hours / 24)} d ago`;
}
function truncate(text, max = 16) {
    if (text.length <= max) return text;
    return `${text.slice(0, max - 1)}…`;
}
function titleCase(value) {
    return value.replace(/[_-]+/g, ' ').replace(/\b\w/g, (character)=>character.toUpperCase());
}
function sortEntries(entries, limit) {
    const sorted = [
        ...entries
    ].sort((a, b)=>b.value - a.value);
    return limit ? sorted.slice(0, limit) : sorted;
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);})()

//# sourceMappingURL=src_041910r9c6t76._.js.map