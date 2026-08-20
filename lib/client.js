/**
 * dsh-prompt-optimize — browser half (ModuleLoader CJS bundle).
 *
 * - Icon on conversation.input.right
 * - Loading: spin on icon, no popover
 * - Done: compact popover → apply / dismiss
 * - Host: POST /api/prompt-optimize
 */
window.__ModuleLoader__.load({
  id: 'dsh-prompt-optimize',
  factory: (require) => {
    'use strict'
    var module = { exports: {} }
    var exports = module.exports

    var react = require('react')
    var h = react.createElement
    var useState = react.useState
    var useEffect = react.useEffect

    var STYLE_ID = 'dsh-prompt-optimize/styles.css'
    var API_PATH = '/api/prompt-optimize'
    var USAGE_API_PATH = '/api/prompt-optimize/deepseek-usage'
    var FILES_API_PATH = '/api/prompt-optimize/workspace-files'
    var FILE_CONTENT_API_PATH = '/api/prompt-optimize/file-content'

    if (
      typeof document !== 'undefined' &&
      document.querySelector('style[data-plugin-css=' + JSON.stringify(STYLE_ID) + ']') === null
    ) {
      var styleTag = document.createElement('style')
      styleTag.dataset.plugin = 'dsh-prompt-optimize'
      styleTag.dataset.pluginCss = STYLE_ID
      styleTag.textContent = [
        '.po-wrap{position:relative;display:inline-flex;align-items:center;vertical-align:middle;}',
        '.po-btn{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;padding:0;border-radius:999px;border:1px solid transparent;background:transparent;color:var(--fg-secondary, var(--dsw-alias-label-secondary, #666));cursor:pointer;flex-shrink:0;}',
        '.po-btn:hover:not(:disabled){color:var(--fg-primary, var(--dsw-alias-label-primary, #111));background:var(--bg-hover, var(--dsw-alias-interactive-bg-hover, rgba(0,0,0,.05)));border-color:var(--border-subtle, rgba(0,0,0,.06));}',
        '.po-btn:disabled{opacity:.4;cursor:not-allowed;}',
        '.po-btn[data-busy="1"]{color:var(--fg-primary, var(--dsw-alias-label-primary, #111));}',
        '.po-btn[data-open="1"]{color:var(--fg-primary, var(--dsw-alias-label-primary, #111));background:var(--bg-hover, var(--dsw-alias-interactive-bg-hover, rgba(0,0,0,.05)));}',
        '.po-ico{width:16px;height:16px;display:block;}',
        '.po-spin{animation:po-spin .8s linear infinite;}',
        '@keyframes po-spin{to{transform:rotate(360deg);}}',
        '.po-pop{position:absolute;right:0;bottom:calc(100% + 8px);z-index:40;width:min(360px,72vw);max-height:min(320px,50vh);display:flex;flex-direction:column;border-radius:12px;background:var(--bg-surface, var(--dsw-alias-bg-layer-1, #fff));color:var(--fg-primary, var(--dsw-alias-label-primary, #111));border:1px solid var(--border-subtle, rgba(0,0,0,.1));box-shadow:0 12px 40px rgba(0,0,0,.16);overflow:hidden;}',
        '.po-pop-h{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 10px 6px;}',
        '.po-pop-title{font-size:12px;font-weight:600;margin:0;}',
        '.po-pop-meta{margin:0;font-size:11px;color:var(--fg-secondary, var(--dsw-alias-label-tertiary, #888));padding:0 10px 6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
        '.po-pop-x{border:0;background:transparent;color:var(--fg-secondary, #888);cursor:pointer;font-size:16px;line-height:1;padding:0 4px;border-radius:6px;}',
        '.po-pop-x:hover{background:var(--bg-hover, rgba(0,0,0,.06));}',
        '.po-pop-body{margin:0;padding:8px 10px;flex:1;min-height:72px;max-height:200px;overflow:auto;white-space:pre-wrap;word-break:break-word;font-size:12.5px;line-height:1.5;border-top:1px solid var(--border-subtle, rgba(0,0,0,.06));border-bottom:1px solid var(--border-subtle, rgba(0,0,0,.06));background:var(--bg-muted, rgba(0,0,0,.02));font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;}',
        '.po-pop-err{margin:0;padding:8px 10px;color:#b42318;font-size:12px;background:rgba(220,50,50,.06);border-top:1px solid rgba(220,50,50,.12);}',
        '.po-pop-f{display:flex;justify-content:flex-end;gap:6px;padding:8px 10px;}',
        '.po-act{height:28px;padding:0 12px;border-radius:999px;border:1px solid var(--border-subtle, rgba(0,0,0,.1));background:transparent;color:var(--fg-primary, #111);font-size:12px;cursor:pointer;}',
        '.po-act:hover{background:var(--bg-hover, rgba(0,0,0,.05));}',
        '.po-act.primary{border-color:transparent;background:var(--accent, #3b82f6);color:#fff;}',
        '.po-act.primary:hover{filter:brightness(1.06);}',
        '.po-act:disabled{opacity:.45;cursor:not-allowed;}',
        '.po-qnav{position:fixed;right:14px;top:50%;z-index:35;display:flex;flex-direction:column;gap:5px;max-height:62vh;padding:7px 5px;transform:translateY(-50%);overflow:visible;border:1px solid var(--border-subtle, var(--dsw-alias-border-l2, rgba(0,0,0,.1)));border-radius:999px;background:var(--bg-surface, var(--dsw-alias-bg-base, #fff));box-shadow:0 8px 24px rgba(0,0,0,.1);}',
        '.po-qitem{position:relative;display:flex;align-items:center;justify-content:center;}',
        '.po-qbtn{display:grid;place-items:center;width:24px;height:24px;padding:0;border:0;border-radius:999px;background:transparent;color:var(--fg-secondary, var(--dsw-alias-label-secondary, #666));font-size:10px;font-variant-numeric:tabular-nums;cursor:pointer;}',
        '.po-qbtn:hover,.po-qbtn:focus-visible,.po-qbtn[data-active="1"]{outline:none;background:var(--bg-hover, var(--dsw-alias-interactive-bg-hover, rgba(0,0,0,.06)));color:var(--fg-primary, var(--dsw-alias-label-primary, #111));}',
        '.po-qdot{width:5px;height:5px;border-radius:50%;background:currentColor;box-shadow:0 0 0 0 currentColor;transition:transform .16s ease-out,box-shadow .16s ease-out;}',
        '.po-qbtn:hover .po-qdot,.po-qbtn:focus-visible .po-qdot,.po-qbtn[data-active="1"] .po-qdot{transform:scale(1.35);box-shadow:0 0 0 3px color-mix(in srgb,currentColor 14%,transparent);}',
        '.po-qtip{position:absolute;right:calc(100% + 10px);top:50%;display:none;width:max-content;min-width:160px;max-width:min(360px,70vw);max-height:220px;padding:9px 11px;transform:translateY(-50%);overflow:auto;border:1px solid var(--border-subtle, var(--dsw-alias-border-l2, rgba(0,0,0,.1)));border-radius:10px;background:var(--bg-surface, var(--dsw-alias-bg-layer-1, #fff));color:var(--fg-primary, var(--dsw-alias-label-primary, #111));box-shadow:0 10px 30px rgba(0,0,0,.14);white-space:pre-wrap;word-break:break-word;font-size:12px;line-height:1.55;text-align:left;}',
        '.po-qitem:hover .po-qtip,.po-qbtn:focus-visible+.po-qtip{display:block;}',
        '.po-qcount{position:absolute;left:50%;bottom:calc(100% + 7px);transform:translateX(-50%);color:var(--fg-secondary, var(--dsw-alias-label-tertiary, #888));font-size:9px;line-height:1;white-space:nowrap;}',
        '.po-usage{position:fixed;right:18px;bottom:18px;z-index:45;padding-top:10px;pointer-events:auto;font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;}',
        '.po-usage-pill{display:flex;align-items:center;gap:7px;height:38px;padding:0 13px;border:1px solid var(--border-subtle,var(--dsw-alias-border-l2,rgba(0,0,0,.1)));border-radius:999px;background:linear-gradient(135deg,var(--bg-surface,var(--dsw-alias-bg-overlay,#fff)),var(--bg-muted,var(--dsw-alias-bg-layer-1,#f7f7f8)));color:var(--fg-primary,var(--dsw-alias-label-primary,#111));box-shadow:0 8px 28px rgba(0,0,0,.14);cursor:pointer;font-size:12px;font-weight:650;}',
        '.po-usage-pill:hover,.po-usage-pill:focus-visible{outline:none;transform:translateY(-1px);box-shadow:0 12px 34px rgba(0,0,0,.18);}',
        '.po-usage-logo{display:grid;place-items:center;width:22px;height:22px;border-radius:8px;background:linear-gradient(135deg,#4f7cff,#7047eb);color:#fff;font-size:13px;font-weight:800;}',
        '.po-usage-card{position:absolute;right:0;bottom:100%;width:286px;box-sizing:border-box;padding:14px;border:1px solid var(--border-subtle,var(--dsw-alias-border-l2,rgba(0,0,0,.1)));border-radius:16px;background:var(--bg-surface,var(--dsw-alias-bg-overlay,#fff));color:var(--fg-primary,var(--dsw-alias-label-primary,#111));box-shadow:0 18px 50px rgba(0,0,0,.2);}',
        '.po-usage-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px;}',
        '.po-usage-title{font-size:13px;font-weight:700;}.po-usage-key{margin-top:2px;color:var(--fg-secondary,var(--dsw-alias-label-tertiary,#888));font:11px ui-monospace,SFMono-Regular,Consolas,monospace;}',
        '.po-usage-refresh{display:grid;place-items:center;width:28px;height:28px;padding:0;border:0;border-radius:9px;background:var(--bg-muted,rgba(0,0,0,.04));color:var(--fg-secondary,#777);cursor:pointer;font-size:16px;}.po-usage-refresh:hover{background:var(--bg-hover,rgba(0,0,0,.08));}.po-usage-refresh[data-busy="1"]{animation:po-spin .8s linear infinite;}',
        '.po-usage-main{padding:12px;border-radius:13px;background:linear-gradient(135deg,rgba(79,124,255,.12),rgba(112,71,235,.08));}',
        '.po-usage-label{color:var(--fg-secondary,var(--dsw-alias-label-secondary,#666));font-size:11px;}.po-usage-money{margin-top:2px;font-size:25px;line-height:31px;font-weight:750;font-variant-numeric:tabular-nums;}',
        '.po-usage-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:9px;}.po-usage-stat{padding:9px;border-radius:11px;background:var(--bg-muted,rgba(0,0,0,.035));}.po-usage-stat strong{display:block;margin-top:2px;font-size:13px;font-variant-numeric:tabular-nums;}',
        '.po-usage-balance{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:10px;padding-top:9px;border-top:1px solid var(--border-subtle,rgba(0,0,0,.07));font-size:11px;}.po-usage-balance span{color:var(--fg-secondary,var(--dsw-alias-label-secondary,#666));}.po-usage-balance strong{font-size:12px;font-variant-numeric:tabular-nums;}',
        '.po-usage-note{margin-top:9px;color:var(--fg-secondary,var(--dsw-alias-label-tertiary,#888));font-size:10.5px;line-height:1.4;}.po-usage-error{color:#b42318;font-size:11px;line-height:1.5;}',
        '@media(max-width:760px){.po-qnav{right:12px;top:auto;bottom:92px;max-width:calc(100vw - 24px);max-height:none;flex-direction:row;transform:none;overflow-x:auto;overflow-y:visible;}.po-qcount{left:auto;right:5px;bottom:calc(100% + 6px);transform:none;}.po-qtip{right:0;top:auto;bottom:calc(100% + 10px);transform:none;}.po-usage{right:12px;bottom:142px;}.po-usage-card{width:min(286px,calc(100vw - 24px));}}',
        '@media(prefers-reduced-motion:reduce){.po-qdot{transition:none;}.po-usage-pill{transition:none;}}',
        '.po-fctx-dock{display:flex;flex-wrap:wrap;gap:4px;padding:6px 10px;border-bottom:1px solid var(--border-subtle, rgba(0,0,0,.06));background:var(--bg-muted, rgba(0,0,0,.02));}',
        '.po-fctx-tag{display:inline-flex;align-items:center;gap:4px;height:24px;padding:0 8px;border-radius:999px;background:var(--bg-hover, var(--dsw-alias-interactive-bg-hover, rgba(0,0,0,.05)));color:var(--fg-primary, var(--dsw-alias-label-primary, #111));font-size:11.5px;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;cursor:default;max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
        '.po-fctx-tag:hover{background:var(--bg-active, rgba(0,0,0,.08));}',
        '.po-fctx-lines{color:var(--fg-secondary, var(--dsw-alias-label-tertiary, #888));font-size:10px;}',
        '.po-fctx-rm{display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;padding:0;border:0;border-radius:50%;background:transparent;color:var(--fg-secondary, #888);cursor:pointer;font-size:12px;line-height:1;flex-shrink:0;}',
        '.po-fctx-rm:hover{background:rgba(220,50,50,.12);color:#b42318;}',
        '.po-fctx-icon{width:12px;height:12px;flex-shrink:0;color:var(--fg-secondary, var(--dsw-alias-label-tertiary, #888));}',
        '.po-fctx-empty{font-size:11px;color:var(--fg-secondary, var(--dsw-alias-label-tertiary, #888));padding:6px 10px;}',
        '.po-fctx-btn{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;padding:0;border-radius:999px;border:1px solid transparent;background:transparent;color:var(--fg-secondary, var(--dsw-alias-label-secondary, #666));cursor:pointer;flex-shrink:0;}',
        '.po-fctx-btn:hover{color:var(--fg-primary, var(--dsw-alias-label-primary, #111));background:var(--bg-hover, var(--dsw-alias-interactive-bg-hover, rgba(0,0,0,.05)));border-color:var(--border-subtle, rgba(0,0,0,.06));}',
        '.po-fctx-btn[data-active="1"]{color:var(--accent, #3b82f6);background:rgba(59,130,246,.08);}',
      ].join('\n')
      document.head.appendChild(styleTag)
    }

    var state = {
      busy: false,
      popOpen: false,
      original: '',
      optimized: '',
      error: '',
      meta: '',
      applyDraft: null,
      notify: null,
      listeners: new Set(),
    }
    var requestGen = 0

    // ── File context state ──
    var fileContext = {
      files: [], // [{ path, name, startLine?, endLine?, cwd }]
      listeners: new Set(),
    }

    function emitFileContext() {
      fileContext.listeners.forEach(function (fn) {
        try { fn() } catch (e) { console.error(e) }
      })
    }

    function addFileToContext(file) {
      // Deduplicate by path + line range
      var exists = fileContext.files.some(function (f) {
        return f.path === file.path && f.startLine === file.startLine && f.endLine === file.endLine
      })
      if (exists) return
      fileContext.files = fileContext.files.concat([file])
      emitFileContext()
    }

    function removeFileFromContext(index) {
      fileContext.files = fileContext.files.filter(function (_, i) { return i !== index })
      emitFileContext()
    }

    function clearFileContext() {
      fileContext.files = []
      emitFileContext()
    }

    function useFileContext() {
      var tickPair = useState(0)
      var setTick = tickPair[1]
      useEffect(function () {
        var onChange = function () { setTick(function (n) { return n + 1 }) }
        fileContext.listeners.add(onChange)
        return function () { fileContext.listeners.delete(onChange) }
      }, [])
      return fileContext
    }

    async function fetchWorkspaceFiles(cwd, query) {
      var params = new URLSearchParams({ cwd: cwd })
      if (query) params.set('query', query)
      var res = await fetch(FILES_API_PATH + '?' + params.toString(), {
        credentials: 'same-origin',
      })
      if (!res.ok) return []
      var data = await res.json()
      return Array.isArray(data.files) ? data.files : []
    }

    async function fetchFileContent(cwd, path, startLine, endLine, signal) {
      var body = { cwd: cwd, path: path }
      if (startLine !== undefined) body.startLine = startLine
      if (endLine !== undefined) body.endLine = endLine
      var res = await fetch(FILE_CONTENT_API_PATH, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'same-origin',
        signal: signal,
      })
      if (!res.ok) return null
      return res.json()
    }

    function emit() {
      state.listeners.forEach(function (fn) {
        try {
          fn()
        } catch (e) {
          console.error(e)
        }
      })
    }

    function patch(partial) {
      Object.assign(state, partial)
      emit()
    }

    function usePoState() {
      var tickPair = useState(0)
      var setTick = tickPair[1]
      useEffect(function () {
        var onChange = function () {
          setTick(function (n) {
            return n + 1
          })
        }
        state.listeners.add(onChange)
        return function () {
          state.listeners.delete(onChange)
        }
      }, [])
      return state
    }

    function dismissPop() {
      requestGen += 1
      patch({
        busy: false,
        popOpen: false,
        original: '',
        optimized: '',
        error: '',
        meta: '',
        applyDraft: null,
        notify: null,
      })
    }

    async function callOptimize(text) {
      var res = await fetch(API_PATH, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: text }),
        credentials: 'same-origin',
      })
      var data = null
      try {
        data = await res.json()
      } catch (_) {
        data = null
      }
      if (!res.ok) {
        var msg =
          data && typeof data.error === 'string'
            ? data.error
            : '优化失败（HTTP ' + res.status + '）'
        throw new Error(msg)
      }
      return data
    }

    async function runOptimize(text) {
      var my = (requestGen += 1)
      patch({
        busy: true,
        popOpen: false,
        error: '',
        optimized: '',
        meta: '',
        original: text,
      })
      try {
        var result = await callOptimize(text)
        if (my !== requestGen) return
        var optimized =
          result && typeof result.text === 'string' ? result.text.trim() : ''
        if (!optimized) throw new Error('没有得到优化结果')
        var provider = result.provider || ''
        var model = result.model || ''
        var fellBack = !!result.fellBack
        var meta =
          provider && model
            ? provider + ' / ' + model + (fellBack ? ' · 已回退' : '')
            : ''
        patch({
          optimized: optimized,
          meta: meta,
          busy: false,
          popOpen: true,
          error: '',
        })
      } catch (e) {
        if (my !== requestGen) return
        patch({
          busy: false,
          popOpen: true,
          error: e instanceof Error ? e.message : String(e),
          optimized: '',
        })
      }
    }

    function IconSparkle() {
      return h(
        'svg',
        {
          className: 'po-ico',
          viewBox: '0 0 16 16',
          fill: 'none',
          xmlns: 'http://www.w3.org/2000/svg',
          'aria-hidden': 'true',
        },
        h('path', {
          d: 'M8 1.5l1.2 3.6L13 6.3l-3.8 1.2L8 11.1 6.8 7.5 3 6.3l3.8-1.2L8 1.5z',
          stroke: 'currentColor',
          strokeWidth: '1.2',
          strokeLinejoin: 'round',
        }),
        h('path', {
          d: 'M12.5 10l.55 1.65L14.7 12.2l-1.65.55L12.5 14.4l-.55-1.65L10.3 12.2l1.65-.55L12.5 10z',
          fill: 'currentColor',
        }),
      )
    }

    function IconSpinner() {
      return h(
        'svg',
        {
          className: 'po-ico po-spin',
          viewBox: '0 0 16 16',
          fill: 'none',
          xmlns: 'http://www.w3.org/2000/svg',
          'aria-hidden': 'true',
        },
        h('circle', {
          cx: '8',
          cy: '8',
          r: '5.5',
          stroke: 'currentColor',
          strokeWidth: '1.5',
          strokeOpacity: '0.25',
        }),
        h('path', {
          d: 'M8 2.5a5.5 5.5 0 0 1 5.5 5.5',
          stroke: 'currentColor',
          strokeWidth: '1.5',
          strokeLinecap: 'round',
        }),
      )
    }

    function ResultPopover(props) {
      var s = props.s
      if (!s.popOpen) return null

      var canApply = !!s.optimized && !s.error

      var onApply = function () {
        if (!canApply || typeof s.applyDraft !== 'function') return
        s.applyDraft(s.optimized)
        if (typeof s.notify === 'function') s.notify('info', '已应用优化后的提示词')
        dismissPop()
      }

      return h(
        'div',
        {
          className: 'po-pop',
          role: 'dialog',
          'aria-label': '优化结果',
          onMouseDown: function (e) {
            e.stopPropagation()
          },
        },
        h(
          'div',
          { className: 'po-pop-h' },
          h('p', { className: 'po-pop-title' }, s.error ? '优化失败' : '优化结果'),
          h(
            'button',
            {
              type: 'button',
              className: 'po-pop-x',
              'aria-label': '关闭',
              onClick: dismissPop,
            },
            '×',
          ),
        ),
        s.meta && !s.error ? h('p', { className: 'po-pop-meta' }, s.meta) : null,
        s.error
          ? h('p', { className: 'po-pop-err' }, s.error)
          : h('pre', { className: 'po-pop-body' }, s.optimized),
        h(
          'div',
          { className: 'po-pop-f' },
          h(
            'button',
            {
              type: 'button',
              className: 'po-act',
              onClick: dismissPop,
            },
            s.error ? '关闭' : '不用',
          ),
          canApply
            ? h(
                'button',
                {
                  type: 'button',
                  className: 'po-act primary',
                  onClick: onApply,
                },
                '应用',
              )
            : null,
        ),
      )
    }

    function OptimizeButton(props) {
      var draft = props.useInput(function (s) {
        return s.draft
      })
      var locked = !!props.locked
      var s = usePoState()
      var empty = !draft || !String(draft).trim()
      var disabled = locked || empty || s.busy

      var onClick = function () {
        if (disabled) return
        var text = String(draft)
        patch({
          applyDraft: function (next) {
            props.inputActions.setDraft(next)
          },
          notify: function (level, msg) {
            try {
              props.inputActions.notify(level, msg)
            } catch (_) {
              /* optional */
            }
          },
        })
        runOptimize(text)
      }

      var tip = empty ? '先输入提示词' : s.busy ? '正在优化…' : '优化提示词'

      return h(
        'div',
        { className: 'po-wrap' },
        h(
          'button',
          {
            type: 'button',
            className: 'po-btn',
            'data-busy': s.busy ? '1' : '0',
            'data-open': s.popOpen ? '1' : '0',
            disabled: disabled,
            title: tip,
            'aria-label': tip,
            onClick: onClick,
          },
          s.busy ? h(IconSpinner) : h(IconSparkle),
        ),
        h(ResultPopover, { s: s }),
      )
    }

    function contentText(content) {
      if (!Array.isArray(content)) return ''
      return content
        .filter(function (block) {
          return block && block.type === 'text' && typeof block.text === 'string'
        })
        .map(function (block) {
          return block.text.trim()
        })
        .filter(Boolean)
        .join('\n')
        .trim()
    }

    function questionLabel(text) {
      var compact = String(text || '').replace(/\s+/g, ' ').trim()
      return compact.length > 48 ? compact.slice(0, 47) + '…' : compact
    }

    function collectUserQuestions(snapshot) {
      if (!snapshot || !snapshot.chat || !Array.isArray(snapshot.chat.order)) {
        return []
      }
      var questions = []
      snapshot.chat.order.forEach(function (key) {
        var node = snapshot.chat.nodes && snapshot.chat.nodes.get(key)
        if (
          !node ||
          (node.kind !== 'user' && node.kind !== 'steering') ||
          !node.data
        ) {
          return
        }
        var text = contentText(node.data.content)
        if (!text && Array.isArray(node.data.content) && node.data.content.length) {
          text = '图片提问'
        }
        if (!text) return
        questions.push({
          key: key,
          seq: node.data.seq,
          text: text,
          label: questionLabel(text),
        })
      })
      return questions
    }

    function findQuestionAnchor(root, key) {
      if (!root || typeof root.querySelectorAll !== 'function') return null
      var fallback = null
      var rows = root.querySelectorAll('[data-chat-anchor-key]')
      for (var i = 0; i < rows.length; i += 1) {
        var row = rows[i]
        if (!row || !row.dataset || row.dataset.chatAnchorKey !== key) continue
        if (!fallback) fallback = row
        if (typeof row.getClientRects !== 'function' || row.getClientRects().length) {
          return row
        }
      }
      return fallback
    }

    function QuestionAnchors(props) {
      var questions = props.useSession(collectUserQuestions)
      var activePair = useState('')
      var activeKey = activePair[0]
      var setActiveKey = activePair[1]
      if (!questions.length) return null

      var jump = function (question) {
        var row = findQuestionAnchor(document, question.key)
        if (!row || typeof row.scrollIntoView !== 'function') return
        setActiveKey(question.key)
        row.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }

      return h(
        'nav',
        { className: 'po-qnav', 'aria-label': '用户提问锚点' },
        h('span', { className: 'po-qcount', 'aria-hidden': 'true' }, questions.length + '问'),
        questions.map(function (question, index) {
          var number = index + 1
          return h(
            'div',
            { className: 'po-qitem', key: question.key },
            h(
              'button',
              {
                type: 'button',
                className: 'po-qbtn',
                'data-active': activeKey === question.key ? '1' : '0',
                'aria-label': '跳转到第' + number + '个提问：' + question.label,
                onClick: function () {
                  jump(question)
                },
              },
              h('span', { className: 'po-qdot', 'aria-hidden': 'true' }),
            ),
            h(
              'span',
              { className: 'po-qtip', role: 'tooltip' },
              number + '. ' + question.text,
            ),
          )
        }),
      )
    }

    function moneySymbol(currency) {
      if (currency === 'CNY' || currency === 'JPY') return '¥'
      if (currency === 'USD') return '$'
      if (currency === 'EUR') return '€'
      if (currency === 'HKD') return 'HK$'
      return currency ? currency + ' ' : ''
    }

    function formatUsageMoney(value, currency) {
      var amount = Number(value)
      if (!Number.isFinite(amount)) return '—'
      return moneySymbol(currency) + amount.toFixed(2)
    }

    function preferredBalance(payload) {
      var infos = payload && Array.isArray(payload.balance_infos) ? payload.balance_infos : []
      return (
        infos.find(function (item) {
          return item && item.currency === 'CNY'
        }) || infos[0] || null
      )
    }

    function DeepSeekUsageFloat() {
      var openPair = useState(false)
      var open = openPair[0]
      var setOpen = openPair[1]
      var phasePair = useState('loading')
      var phase = phasePair[0]
      var setPhase = phasePair[1]
      var dataPair = useState(null)
      var data = dataPair[0]
      var setData = dataPair[1]
      var errorPair = useState('')
      var error = errorPair[0]
      var setError = errorPair[1]

      var load = async function () {
        setPhase('loading')
        setError('')
        try {
          var response = await fetch(USAGE_API_PATH, {
            cache: 'no-store',
            credentials: 'same-origin',
          })
          var body = null
          try {
            body = await response.json()
          } catch (_) {
            body = null
          }
          if (!response.ok) {
            throw new Error(
              body && typeof body.message === 'string'
                ? body.message
                : '用量查询失败（HTTP ' + response.status + '）',
            )
          }
          setData(body)
          setPhase('ready')
        } catch (e) {
          setPhase('error')
          setError(e instanceof Error ? e.message : String(e))
        }
      }

      useEffect(function () {
        load()
        var timer = setInterval(load, 60 * 1000)
        return function () {
          clearInterval(timer)
        }
      }, [])

      var balance = preferredBalance(data && data.balance)
      var keyUsage = data && data.keyUsage
      var usageCurrency = keyUsage && keyUsage.currency ? keyUsage.currency : 'CNY'
      var compact = keyUsage
        ? '今日 ' + formatUsageMoney(keyUsage.today, usageCurrency)
        : 'DeepSeek 用量'

      return h(
        'div',
        {
          className: 'po-usage',
          onMouseEnter: function () {
            setOpen(true)
          },
          onMouseLeave: function () {
            setOpen(false)
          },
        },
        open
          ? h(
              'section',
              {
                className: 'po-usage-card',
                role: 'status',
                'aria-live': 'polite',
                'aria-label': 'DeepSeek API 用量',
              },
              h(
                'div',
                { className: 'po-usage-head' },
                h(
                  'div',
                  null,
                  h('div', { className: 'po-usage-title' }, 'DeepSeek API Key 用量'),
                  h(
                    'div',
                    { className: 'po-usage-key' },
                    (keyUsage && keyUsage.name ? keyUsage.name + ' · ' : '') +
                      (data && data.key ? data.key : 'DEEPSEEK_API_KEY'),
                  ),
                ),
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'po-usage-refresh',
                    'data-busy': phase === 'loading' ? '1' : '0',
                    disabled: phase === 'loading',
                    title: '刷新',
                    'aria-label': '刷新 DeepSeek 用量',
                    onClick: load,
                  },
                  '↻',
                ),
              ),
              phase === 'error'
                ? h('div', { className: 'po-usage-error' }, error)
                : h(
                    react.Fragment,
                    null,
                    h(
                      'div',
                      { className: 'po-usage-main' },
                      h('div', { className: 'po-usage-label' }, '今天消费'),
                      h(
                        'div',
                        { className: 'po-usage-money' },
                        keyUsage
                          ? formatUsageMoney(keyUsage.today, usageCurrency)
                          : phase === 'loading'
                            ? '加载中…'
                            : '暂不可用',
                      ),
                    ),
                    h(
                      'div',
                      { className: 'po-usage-grid' },
                      h(
                        'div',
                        { className: 'po-usage-stat' },
                        h('span', { className: 'po-usage-label' }, '昨天消费'),
                        h(
                          'strong',
                          null,
                          keyUsage
                            ? formatUsageMoney(keyUsage.yesterday, usageCurrency)
                            : '—',
                        ),
                      ),
                      h(
                        'div',
                        { className: 'po-usage-stat' },
                        h('span', { className: 'po-usage-label' }, '最近 7 天'),
                        h(
                          'strong',
                          null,
                          keyUsage
                            ? formatUsageMoney(keyUsage.last7Days, usageCurrency)
                            : '—',
                        ),
                      ),
                    ),
                    h(
                      'div',
                      { className: 'po-usage-balance' },
                      h('span', null, '账号当前余额'),
                      h(
                        'strong',
                        null,
                        balance
                          ? formatUsageMoney(balance.total_balance, balance.currency)
                          : '—',
                      ),
                    ),
                    data && data.keyUsageUnavailable
                      ? h(
                          'div',
                          { className: 'po-usage-note' },
                          data.keyUsageMessage || '当前 API Key 用量暂不可用；账号余额仍可正常查询。',
                        )
                      : h(
                          'div',
                          { className: 'po-usage-note' },
                          '当前 API Key 消费 · GMT+8 · 数据可能延迟约 5 分钟',
                        ),
                  ),
            )
          : null,
        h(
          'button',
          {
            type: 'button',
            className: 'po-usage-pill',
            title: '悬浮查看 DeepSeek API 用量',
            'aria-expanded': open ? 'true' : 'false',
            onFocus: function () {
              setOpen(true)
            },
            onClick: function () {
              setOpen(!open)
            },
          },
          h('span', { className: 'po-usage-logo', 'aria-hidden': 'true' }, 'D'),
          h('span', null, compact),
        ),
      )
    }

    function IconFile() {
      return h(
        'svg',
        {
          className: 'po-fctx-icon',
          viewBox: '0 0 16 16',
          fill: 'none',
          xmlns: 'http://www.w3.org/2000/svg',
          'aria-hidden': 'true',
        },
        h('path', {
          d: 'M4 1.5h5.586a1 1 0 0 1 .707.293l2.414 2.414a1 1 0 0 1 .293.707V13.5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-11a1 1 0 0 1 1-1z',
          stroke: 'currentColor',
          strokeWidth: '1.2',
        }),
        h('path', {
          d: 'M9.5 1.5v3h3',
          stroke: 'currentColor',
          strokeWidth: '1.2',
          strokeLinejoin: 'round',
        }),
      )
    }

    function IconPaperclip() {
      return h(
        'svg',
        {
          className: 'po-ico',
          viewBox: '0 0 16 16',
          fill: 'none',
          xmlns: 'http://www.w3.org/2000/svg',
          'aria-hidden': 'true',
        },
        h('path', {
          d: 'M8.59 2.59a4 4 0 0 1 5.66 5.66l-5.3 5.3a2.5 2.5 0 1 1-3.54-3.54l5.3-5.3a1 1 0 0 1 1.42 1.42l-5.3 5.3',
          stroke: 'currentColor',
          strokeWidth: '1.3',
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        }),
      )
    }

    function FileContextDock(props) {
      var fc = useFileContext()
      if (!fc.files.length) return null

      return h(
        'div',
        {
          className: 'po-fctx-dock',
          tabIndex: 0,
          title: '聚焦此处后按 Ctrl+C 复制已选文件路径',
          onKeyDown: function (event) {
            if (!(event.ctrlKey || event.metaKey) || String(event.key).toLowerCase() !== 'c') return
            if (!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') return
            event.preventDefault()
            navigator.clipboard.writeText(fc.files.map(function (file) {
              return file.path + (file.startLine ? ':' + file.startLine + '-' + file.endLine : '')
            }).join('\n'))
          },
        },
        fc.files.map(function (file, index) {
          var label = file.name || file.path
          var lineRange = ''
          if (file.startLine && file.endLine) {
            lineRange = ':' + file.startLine + '-' + file.endLine
          } else if (file.startLine) {
            lineRange = ':' + file.startLine
          }
          return h(
            'span',
            { className: 'po-fctx-tag', key: file.path + lineRange + index, title: file.path + lineRange },
            h(IconFile),
            h('span', null, label + lineRange),
            h(
              'button',
              {
                type: 'button',
                className: 'po-fctx-rm',
                'aria-label': '移除 ' + label,
                onClick: function () { removeFileFromContext(index) },
              },
              '×',
            ),
          )
        }),
      )
    }

    function FileAttachButton(props) {
      var fc = useFileContext()
      var count = fc.files.length
      var tip = count > 0 ? count + ' 个文件已添加' : '添加文件上下文 (输入 @ 选择)'

      return h(
        'div',
        { className: 'po-wrap' },
        h(
          'button',
          {
            type: 'button',
            className: 'po-fctx-btn',
            'data-active': count > 0 ? '1' : '0',
            title: tip,
            'aria-label': tip,
            onClick: function () {
              if (count > 0) {
                clearFileContext()
              }
            },
          },
          h(IconPaperclip),
        ),
      )
    }

    var inject = ['slots', 'sessions', 'inputTriggers']

    function apply(ctx) {
      // ── Register @ file trigger source ──
      var inputTriggers = ctx.inputTriggers || (typeof ctx.get === 'function' ? ctx.get('inputTriggers') : null)
      if (inputTriggers) {
        var sessions = ctx.sessions
        var fileSource = {
          trigger: '@',
          name: 'file',
          order: 10, // after subagent and other @ sources
          candidates: function (session, req) {
            var list = sessions.list.getSnapshot()
            var sessionData = list.byId[session.sessionId]
            var cwd = sessionData && sessionData.cwd
            if (!cwd) return Promise.resolve([])
            var query = String(req.query || '')
            // Optional range syntax: @path/to/file.js:10-25 (or :10)
            var rangeMatch = query.match(/^(.*?):(\\d+)(?:-(\\d+))?$/)
            var fileQuery = rangeMatch ? rangeMatch[1] : query
            var startLine = rangeMatch ? Number(rangeMatch[2]) : undefined
            var endLine = rangeMatch ? Number(rangeMatch[3] || rangeMatch[2]) : undefined
            return fetchWorkspaceFiles(cwd, fileQuery).then(function (files) {
              if (req.signal && req.signal.aborted) return []
              return files.slice(0, 20).map(function (file) {
                var rangeLabel = startLine ? ':' + startLine + '-' + endLine : ''
                return {
                  name: file.name,
                  description: file.path + rangeLabel,
                  path: file.path,
                  cwd: cwd,
                  startLine: startLine,
                  endLine: endLine,
                  icon: h(IconFile),
                }
              })
            }).catch(function () { return [] })
          },
          onPick: function (pick) {
            var candidate = pick.candidate
            var cwd = candidate.cwd
            var filePath = candidate.path || candidate.description
            if (!cwd || !filePath) return { text: filePath ? filePath + ' ' : '' }
            addFileToContext({
              path: filePath,
              name: candidate.name,
              cwd: cwd,
              startLine: candidate.startLine,
              endLine: candidate.endLine,
            })
            return {
              insert: {
                source: 'file',
                ref: {
                  cwd: cwd,
                  path: filePath,
                  startLine: candidate.startLine,
                  endLine: candidate.endLine,
                },
                label: candidate.name,
                clipboardText: filePath + (candidate.startLine ? ':' + candidate.startLine + '-' + candidate.endLine : ''),
              },
            }
          },
          codec: {
            clipboardText: function (ref) {
              return ref && ref.path ? ref.path : ''
            },
            serialize: function (ref, signal) {
              if (!ref || !ref.cwd || !ref.path) return Promise.reject(new Error('文件引用无效'))
              return fetchFileContent(ref.cwd, ref.path, ref.startLine, ref.endLine, signal).then(function (result) {
                if (signal && signal.aborted) throw new Error('文件读取已取消')
                if (!result || typeof result.content !== 'string') throw new Error('无法读取文件：' + ref.path)
                return '\n--- ' + ref.path + ' ---\n' + result.content + '\n---\n'
              })
            },
          },
        }
        ctx.effect(function () {
          return inputTriggers.registerSource(fileSource)
        }, 'dsh-prompt-optimize: @ file source')
      }

      ctx.effect(function () {
        var disposeOptimize = ctx.slots.register(
          {
            name: 'conversation.input.right',
            id: 'prompt-optimize',
            order: 5,
            label: '优化提示词',
            registrant: 'dsh-prompt-optimize',
          },
          OptimizeButton,
        )
        var disposeAnchors = ctx.slots.inject(
          'conversation.session.header.utilities',
          function () {
            return ctx.slots.register(
              {
                name: 'conversation.session.header.utilities',
                id: 'prompt-question-anchors',
                order: 90,
                label: '用户提问锚点',
              },
              QuestionAnchors,
            )
          },
        )
        var disposeUsage = ctx.slots.inject('shell.overlay', function () {
          return ctx.slots.register(
            {
              name: 'shell.overlay',
              id: 'prompt-deepseek-usage',
              order: 95,
              label: 'DeepSeek API 用量',
            },
            DeepSeekUsageFloat,
          )
        })
        var disposeDock = ctx.slots.inject('conversation.input.dock', function () {
          return ctx.slots.register(
            {
              name: 'conversation.input.dock',
              id: 'prompt-file-context',
              order: 10,
              label: '文件上下文',
              registrant: 'dsh-prompt-optimize',
            },
            FileContextDock,
          )
        })
        var disposeFileBtn = ctx.slots.register(
          {
            name: 'conversation.input.left',
            id: 'prompt-file-attach',
            order: 5,
            label: '文件上下文',
            registrant: 'dsh-prompt-optimize',
          },
          FileAttachButton,
        )
        return function () {
          if (typeof disposeFileBtn === 'function') disposeFileBtn()
          if (typeof disposeDock === 'function') disposeDock()
          if (typeof disposeUsage === 'function') disposeUsage()
          if (typeof disposeAnchors === 'function') disposeAnchors()
          if (typeof disposeOptimize === 'function') disposeOptimize()
        }
      }, 'dsh-prompt-optimize: input button')
    }

    exports.apply = apply
    exports.inject = inject
    exports.collectUserQuestions = collectUserQuestions
    exports.findQuestionAnchor = findQuestionAnchor
    return module.exports
  },
})
