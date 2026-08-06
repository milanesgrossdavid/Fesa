package expo.modules.localmusic.notification

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.os.Build
import android.os.IBinder
import android.util.Log
import android.widget.RemoteViews
import androidx.core.app.NotificationCompat
import expo.modules.localmusic.R
import java.io.InputStream
import java.util.concurrent.Executors

class MusicNotificationService : Service() {

  private val ioExecutor = Executors.newSingleThreadExecutor()
  private var currentArtworkUri: String? = null
  private var currentArtworkBitmap: Bitmap? = null

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    when (intent?.action) {
      ACTION_STOP -> {
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
        return START_NOT_STICKY
      }
      else -> {
        val state = NotificationState.fromIntent(intent)
        showOrUpdate(state)
      }
    }
    return START_STICKY
  }

  private fun showOrUpdate(state: NotificationState) {
    ensureChannel()

    val artworkUri = state.artworkUri
    if (artworkUri != currentArtworkUri) {
      currentArtworkUri = artworkUri
      currentArtworkBitmap = null
      if (!artworkUri.isNullOrEmpty()) {
        ioExecutor.execute {
          val bmp = loadBitmap(artworkUri)
          if (bmp != null && artworkUri == currentArtworkUri) {
            currentArtworkBitmap = bmp
            postNotification(state)
          }
        }
      }
    }

    postNotification(state)
  }

  private fun postNotification(state: NotificationState) {
    val small = buildRemoteViews(R.layout.notif_music_small, state)
    val big = buildRemoteViews(R.layout.notif_music_big, state)

    val contentIntent = launchAppIntent()

    val builder = NotificationCompat.Builder(this, CHANNEL_ID)
      .setSmallIcon(R.drawable.ic_notif_music)
      .setContentTitle(state.title)
      .setContentText(state.artist)
      .setContentIntent(contentIntent)
      .setOngoing(state.playing)
      .setOnlyAlertOnce(true)
      .setShowWhen(false)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setCategory(NotificationCompat.CATEGORY_TRANSPORT)
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .setCustomContentView(small)
      .setCustomBigContentView(big)
      .setStyle(NotificationCompat.DecoratedCustomViewStyle())

    val notification = builder.build()

    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        startForeground(
          NOTIFICATION_ID,
          notification,
          android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK
        )
      } else {
        startForeground(NOTIFICATION_ID, notification)
      }
    } catch (e: Exception) {
      Log.w(TAG, "startForeground failed, posting via NotificationManager", e)
      val nm = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
      nm.notify(NOTIFICATION_ID, notification)
    }
  }

  private fun buildRemoteViews(layoutRes: Int, state: NotificationState): RemoteViews {
    val rv = RemoteViews(packageName, layoutRes)
    rv.setTextViewText(R.id.notif_title, state.title)
    rv.setTextViewText(R.id.notif_artist, state.artist)

    val bmp = currentArtworkBitmap
    if (bmp != null) {
      rv.setImageViewBitmap(R.id.notif_artwork, bmp)
    } else {
      rv.setImageViewResource(R.id.notif_artwork, R.drawable.notif_artwork_placeholder)
    }

    // Play / Pause icon toggle
    rv.setImageViewResource(
      R.id.notif_btn_play,
      if (state.playing) R.drawable.ic_notif_pause else R.drawable.ic_notif_play
    )

    rv.setOnClickPendingIntent(R.id.notif_btn_prev, actionPendingIntent(ACTION_PREVIOUS))
    rv.setOnClickPendingIntent(R.id.notif_btn_play, actionPendingIntent(ACTION_TOGGLE))
    rv.setOnClickPendingIntent(R.id.notif_btn_next, actionPendingIntent(ACTION_NEXT))

    // Only the big view has the seekbar and timestamps.
    if (layoutRes == R.layout.notif_music_big) {
      val durationMs = state.durationMs.coerceAtLeast(0L)
      val positionMs = state.positionMs.coerceIn(0L, if (durationMs > 0) durationMs else Long.MAX_VALUE)
      val progress = if (durationMs > 0) {
        ((positionMs * 1000L) / durationMs).toInt().coerceIn(0, 1000)
      } else 0

      rv.setProgressBar(R.id.notif_seekbar, 1000, progress, false)
      rv.setTextViewText(R.id.notif_time_elapsed, formatMs(positionMs))
      rv.setTextViewText(
        R.id.notif_time_remaining,
        "-" + formatMs((durationMs - positionMs).coerceAtLeast(0L))
      )
    }

    return rv
  }

  private fun actionPendingIntent(action: String): PendingIntent {
    val intent = Intent(this, MusicNotificationActionReceiver::class.java).apply {
      this.action = action
      setPackage(packageName)
    }
    val flags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    return PendingIntent.getBroadcast(this, action.hashCode(), intent, flags)
  }

  private fun launchAppIntent(): PendingIntent {
    val launch = packageManager.getLaunchIntentForPackage(packageName)?.apply {
      addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
    }
    val flags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    return PendingIntent.getActivity(this, 0, launch ?: Intent(), flags)
  }

  private fun ensureChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val nm = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
    if (nm.getNotificationChannel(CHANNEL_ID) != null) return
    val channel = NotificationChannel(
      CHANNEL_ID,
      "Reproducción de música",
      NotificationManager.IMPORTANCE_LOW
    ).apply {
      description = "Controles de la canción en reproducción"
      setShowBadge(false)
      lockscreenVisibility = Notification.VISIBILITY_PUBLIC
      enableVibration(false)
      setSound(null, null)
    }
    nm.createNotificationChannel(channel)
  }

  private fun loadBitmap(uriString: String): Bitmap? {
    return try {
      val uri = Uri.parse(uriString)
      when (uri.scheme) {
        "content", "file", "android.resource" -> contentResolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it) }
        "http", "https" -> {
          val conn = java.net.URL(uriString).openConnection()
          conn.connectTimeout = 5000
          conn.readTimeout = 8000
          (conn.getInputStream() as? InputStream)?.use { BitmapFactory.decodeStream(it) }
        }
        null -> {
          // Absolute file path fallback
          BitmapFactory.decodeFile(uriString)
        }
        else -> null
      }
    } catch (e: Exception) {
      Log.w(TAG, "Failed to load artwork: $uriString", e)
      null
    }
  }

  private fun formatMs(ms: Long): String {
    val totalSeconds = ms / 1000L
    val minutes = totalSeconds / 60
    val seconds = totalSeconds % 60
    return String.format("%d:%02d", minutes, seconds)
  }

  override fun onDestroy() {
    ioExecutor.shutdownNow()
    currentArtworkBitmap = null
    super.onDestroy()
  }

  companion object {
    private const val TAG = "MusicNotifService"
    const val CHANNEL_ID = "fesa_music_playback"
    const val NOTIFICATION_ID = 8421

    const val ACTION_START = "expo.modules.localmusic.START_NOTIF"
    const val ACTION_STOP = "expo.modules.localmusic.STOP_NOTIF"

    const val ACTION_PREVIOUS = "expo.modules.localmusic.action.PREVIOUS"
    const val ACTION_NEXT = "expo.modules.localmusic.action.NEXT"
    const val ACTION_TOGGLE = "expo.modules.localmusic.action.TOGGLE"

    const val EXTRA_TITLE = "title"
    const val EXTRA_ARTIST = "artist"
    const val EXTRA_ARTWORK = "artwork"
    const val EXTRA_PLAYING = "playing"
    const val EXTRA_POSITION_MS = "positionMs"
    const val EXTRA_DURATION_MS = "durationMs"

    fun start(context: Context, state: NotificationState) {
      val intent = Intent(context, MusicNotificationService::class.java).apply {
        action = ACTION_START
        putExtra(EXTRA_TITLE, state.title)
        putExtra(EXTRA_ARTIST, state.artist)
        putExtra(EXTRA_ARTWORK, state.artworkUri)
        putExtra(EXTRA_PLAYING, state.playing)
        putExtra(EXTRA_POSITION_MS, state.positionMs)
        putExtra(EXTRA_DURATION_MS, state.durationMs)
      }
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        context.startForegroundService(intent)
      } else {
        context.startService(intent)
      }
    }

    fun stop(context: Context) {
      val intent = Intent(context, MusicNotificationService::class.java).apply {
        action = ACTION_STOP
      }
      context.startService(intent)
    }
  }
}

data class NotificationState(
  val title: String,
  val artist: String,
  val artworkUri: String?,
  val playing: Boolean,
  val positionMs: Long,
  val durationMs: Long
) {
  companion object {
    fun fromIntent(intent: Intent?): NotificationState {
      return NotificationState(
        title = intent?.getStringExtra(MusicNotificationService.EXTRA_TITLE) ?: "",
        artist = intent?.getStringExtra(MusicNotificationService.EXTRA_ARTIST) ?: "",
        artworkUri = intent?.getStringExtra(MusicNotificationService.EXTRA_ARTWORK),
        playing = intent?.getBooleanExtra(MusicNotificationService.EXTRA_PLAYING, false) ?: false,
        positionMs = intent?.getLongExtra(MusicNotificationService.EXTRA_POSITION_MS, 0L) ?: 0L,
        durationMs = intent?.getLongExtra(MusicNotificationService.EXTRA_DURATION_MS, 0L) ?: 0L
      )
    }
  }
}
