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
        '.po-qnav{position:fixed;right:14px;top:50%;z-index:35;display:flex;flex-direction:column;gap:5px;max-height:62vh;padding:7px 5px;transform:translateY(-50%);overflow:visible;border:1px solid var(--border-subtle, var(--dsw-alias-border-l2, rgba(0,0,0,.1)));border-radius:999px;background:var(--bg-surface, var(--dsw-alias-bg-base, #fff));box-shadow:0 8px 24px rgba(0,0,0,.1);}',
        '.po-qitem{position:relative;display:flex;align-items:center;justify-content:center;}',
        '.po-qbtn{display:grid;place-items:center;width:24px;height:24px;padding:0;border:0;border-radius:999px;background:transparent;color:var(--fg-secondary, var(--dsw-alias-label-secondary, #666));font-size:10px;font-variant-numeric:tabular-nums;cursor:pointer;}',
        '.po-qbtn:hover,.po-qbtn:focus-visible,.po-qbtn[data-active="1"]{outline:none;background:var(--bg-hover, var(--dsw-alias-interactive-bg-hover, rgba(0,0,0,.06)));color:var(--fg-primary, var(--dsw-alias-label-primary, #111));}',
        '.po-qdot{width:5px;height:5px;border-radius:50%;background:currentColor;box-shadow:0 0 0 0 currentColor;transition:transform .16s ease-out,box-shadow .16s ease-out;}',
        '.po-qbtn:hover .po-qdot,.po-qbtn:focus-visible .po-qdot,.po-qbtn[data-active="1"] .po-qdot{transform:scale(1.35);box-shadow:0 0 0 3px color-mix(in srgb,currentColor 14%,transparent);}',
        '.po-qtip{position:absolute;right:calc(100% + 10px);top:50%;display:none;width:max-content;min-width:160px;max-width:min(360px,70vw);max-height:220px;padding:9px 11px;transform:translateY(-50%);overflow:auto;border:1px solid var(--border-subtle, var(--dsw-alias-border-l2, rgba(0,0,0,.1)));border-radius:10px;background:var(--bg-surface, var(--dsw-alias-bg-layer-1, #fff));color:var(--fg-primary, var(--dsw-alias-label-primary, #111));box-shadow:0 10px 30px rgba(0,0,0,.14);white-space:pre-wrap;word-break:break-word;font-size:12px;line-height:1.55;text-align:left;}',
        '.po-qitem:hover .po-qtip,.po-qbtn:focus-visible+.po-qtip{display:block;}',
        '.po-qcount{position:absolute;left:50%;bottom:calc(100% + 7px);transform:translateX(-50%);color:var(--fg-secondary, var(--dsw-alias-label-tertiary, #888));font-size:9px;line-height:1;white-space:nowrap;}',
        '@media(max-width:760px){.po-qnav{right:12px;top:auto;bottom:92px;max-width:calc(100vw - 24px);max-height:none;flex-direction:row;transform:none;overflow-x:auto;overflow-y:visible;}.po-qcount{left:auto;right:5px;bottom:calc(100% + 6px);transform:none;}.po-qtip{right:0;top:auto;bottom:calc(100% + 10px);transform:none;}}',
        '@media(prefers-reduced-motion:reduce){.po-qdot{transition:none;}}',
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

    var inject = ['slots']

    function apply(ctx) {
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
        return function () {
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
