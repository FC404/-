const cleanupKey = Symbol('tableOverflowTooltipCleanup')

const textSelector = [
  '.main-cell',
  '.sub-cell',
  '.address-cell',
  '.note-cell',
  '.table-overflow-text',
].join(', ')

function isOverflowing(element) {
  return (
    element.scrollWidth > element.clientWidth + 1 ||
    element.scrollHeight > element.clientHeight + 1
  )
}

function getTextTarget(table, eventTarget) {
  if (!(eventTarget instanceof Element)) return null

  const textElement = eventTarget.closest(textSelector)
  if (textElement && table.contains(textElement)) return textElement

  const cell = eventTarget.closest('td')
  if (!cell || !table.contains(cell)) return null

  const interactiveSelector = [
    'button',
    'input',
    'select',
    'a',
    '.tag',
    '.role-pill',
    '.progress-cell',
    '.qty-cell',
    '.order-status-stack',
    '.row-actions',
  ].join(', ')

  return cell.querySelector(interactiveSelector) ? null : cell
}

function positionTooltip(tooltip, target) {
  const gap = 8
  const viewportGap = 12
  const targetRect = target.getBoundingClientRect()
  const tooltipRect = tooltip.getBoundingClientRect()

  let left = targetRect.left
  let top = targetRect.bottom + gap

  left = Math.min(left, window.innerWidth - tooltipRect.width - viewportGap)
  left = Math.max(viewportGap, left)

  if (top + tooltipRect.height > window.innerHeight - viewportGap) {
    top = targetRect.top - tooltipRect.height - gap
  }

  tooltip.style.left = `${left}px`
  tooltip.style.top = `${Math.max(viewportGap, top)}px`
}

export default {
  mounted(table) {
    let tooltip = null
    let activeTarget = null

    function hideTooltip() {
      activeTarget = null
      if (tooltip) tooltip.dataset.visible = 'false'
    }

    function showTooltip(target) {
      const content = target.textContent.replace(/\s+/g, ' ').trim()
      if (!content || !isOverflowing(target)) {
        hideTooltip()
        return
      }

      if (!tooltip) {
        tooltip = document.createElement('div')
        tooltip.className = 'table-overflow-tooltip'
        tooltip.setAttribute('role', 'tooltip')
        tooltip.dataset.visible = 'false'
        document.body.appendChild(tooltip)
      }

      activeTarget = target
      tooltip.textContent = content
      tooltip.dataset.visible = 'true'
      positionTooltip(tooltip, target)
    }

    function handlePointerOver(event) {
      const target = getTextTarget(table, event.target)
      if (!target || target === activeTarget) return
      showTooltip(target)
    }

    function handlePointerOut(event) {
      if (!activeTarget) return
      const nextTarget = getTextTarget(table, event.relatedTarget)
      if (nextTarget === activeTarget) return
      hideTooltip()
    }

    table.addEventListener('pointerover', handlePointerOver)
    table.addEventListener('pointerout', handlePointerOut)
    table.addEventListener('scroll', hideTooltip, true)
    window.addEventListener('resize', hideTooltip)
    window.addEventListener('scroll', hideTooltip, true)

    table[cleanupKey] = () => {
      table.removeEventListener('pointerover', handlePointerOver)
      table.removeEventListener('pointerout', handlePointerOut)
      table.removeEventListener('scroll', hideTooltip, true)
      window.removeEventListener('resize', hideTooltip)
      window.removeEventListener('scroll', hideTooltip, true)
      tooltip?.remove()
    }
  },

  unmounted(table) {
    table[cleanupKey]?.()
    delete table[cleanupKey]
  },
}
