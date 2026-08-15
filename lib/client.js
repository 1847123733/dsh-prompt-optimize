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

    var inject = ['slots']

    function apply(ctx) {
      ctx.effect(function () {
        return ctx.slots.register(
          {
            name: 'conversation.input.right',
            id: 'prompt-optimize',
            order: 5,
            label: '优化提示词',
            registrant: 'dsh-prompt-optimize',
          },
          OptimizeButton,
        )
      }, 'dsh-prompt-optimize: input button')
    }

    exports.apply = apply
    exports.inject = inject
    return module.exports
  },
})
