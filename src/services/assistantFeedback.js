import { ElNotification } from 'element-plus'

let activeNotification

function feedbackType(title) {
  return ['操作异常', '无法删除'].includes(title) ? 'error' : 'success'
}

export function showAssistantFeedback(message, title = '操作提示') {
  activeNotification?.close()
  activeNotification = ElNotification({
    title,
    message,
    type: feedbackType(title),
    position: 'top-right',
    duration: 4200,
    customClass: 'assistant-notification',
    onClose: () => {
      activeNotification = null
    },
  })
}

export function dismissAssistantFeedback() {
  activeNotification?.close()
}
