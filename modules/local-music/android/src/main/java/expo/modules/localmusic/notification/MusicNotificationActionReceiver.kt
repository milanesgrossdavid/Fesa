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
      MusicNotificationService.ACTION_TOGGLE -> callback(action)
    }
  }

  companion object {
    @Volatile
    var actionCallback: ((String) -> Unit)? = null
  }
}
