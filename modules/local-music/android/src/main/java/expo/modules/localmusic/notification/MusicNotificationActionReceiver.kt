package expo.modules.localmusic.notification

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class MusicNotificationActionReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val action = intent.action ?: return
    val callback = actionCallback ?: return
    when (action) {
      MusicNotificationService.ACTION_PREVIOUS,
      MusicNotificationService.ACTION_NEXT,
      MusicNotificationService.ACTION_TOGGLE,
      MusicNotificationService.ACTION_REWIND,
      MusicNotificationService.ACTION_FORWARD -> callback(action, null)
      MusicNotificationService.ACTION_SEEK -> callback(
        action,
        intent.getLongExtra(MusicNotificationService.EXTRA_SEEK_POSITION_MS, 0L)
      )
    }
  }

  companion object {
    @Volatile
    var actionCallback: ((String, Long?) -> Unit)? = null
  }
}
