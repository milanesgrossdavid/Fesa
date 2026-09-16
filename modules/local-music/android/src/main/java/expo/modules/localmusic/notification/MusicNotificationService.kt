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
import android.media.AudioManager
import android.net.Uri
import android.os.Build
import android.os.IBinder
import android.os.SystemClock
import android.util.Log
import android.widget.RemoteViews
import androidx.core.app.NotificationCompat
import android.support.v4.media.MediaMetadataCompat
import android.support.v4.media.session.MediaSessionCompat
import android.support.v4.media.session.PlaybackStateCompat
import androidx.media.app.NotificationCompat.MediaStyle
import expo.modules.localmusic.R
import java.io.InputStream
import java.util.concurrent.Executors

class MusicNotificationService : Service() {

  private val ioExecutor = Executors.newSingleThreadExecutor()
  private var currentArtworkUri: String? = null
  private var currentArtworkBitmap: Bitmap? = null
  private var mediaSession: MediaSessionCompat? = null
  private var lastState: NotificationState? = null
  private var lastRenderedSignature: String? = null
  private var foregroundStarted = false

  private fun notificationSignature(state: NotificationState): String {
    return listOf(
      state.title,
      state.artist,
      state.artworkUri ?: "",
      state.playing.toString(),
      state.positionMs.toString(),
      state.durationMs.toString(),
      state.shuffleEnabled.toString(),
      state.repeatMode
    ).joinToString("|")
  }

  private fun shouldRefreshNotification(previous: NotificationState?, current: NotificationState): Boolean {
    if (previous == null) return true

    val previousPosition = previous.positionMs
    val currentPosition = current.positionMs
    val positionDelta = kotlin.math.abs(currentPosition - previousPosition)

    return previous.title != current.title ||
      previous.artist != current.artist ||
      previous.artworkUri != current.artworkUri ||
      previous.playing != current.playing ||
      positionDelta >= 1_000L ||
      previous.durationMs != current.durationMs ||
      previous.shuffleEnabled != current.shuffleEnabled ||
      previous.repeatMode != current.repeatMode
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onCreate() {
    super.onCreate()
    runningService = this
    ensureMediaSession()
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    ensureMediaSession()
    when (intent?.action) {
      ACTION_STOP -> {
        releaseMediaSession()
        stopForeground(STOP_FOREGROUND_REMOVE)
        foregroundStarted = false
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

    val previousState = lastState
    val shouldUpdate = shouldRefreshNotification(previousState, state)
    lastState = state

    if (!shouldUpdate) {
      updateMediaSession(state, currentArtworkBitmap)
      return
    }

    val artworkUri = state.artworkUri
    if (artworkUri != currentArtworkUri) {
      currentArtworkUri = artworkUri
      currentArtworkBitmap = null
      if (!artworkUri.isNullOrEmpty()) {
        ioExecutor.execute {
          val bmp = loadBitmap(artworkUri)
          if (bmp != null && artworkUri == currentArtworkUri) {
            currentArtworkBitmap = bmp
            val latestState = lastState ?: state
            updateMediaSession(latestState, currentArtworkBitmap)
            postNotification(latestState)
          }
        }
      } else {
        updateMediaSession(state, null)
        postNotification(state)
      }
    } else {
      updateMediaSession(state, currentArtworkBitmap)
    }

    postNotification(state)
  }

  private fun postNotification(state: NotificationState) {
    val signature = notificationSignature(state)
    if (signature == lastRenderedSignature) {
      return
    }
    lastRenderedSignature = signature

    val contentIntent = launchAppIntent()
    val compactViews = buildNotificationViews(R.layout.notif_music_small, state)
    val expandedViews = buildNotificationViews(R.layout.notif_music_big, state)

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
      .setLargeIcon(currentArtworkBitmap)
      .setCustomContentView(compactViews)
      .setCustomBigContentView(expandedViews)
      .setStyle(
        MediaStyle()
          .setMediaSession(mediaSession?.sessionToken)
          // Keep the app's mode controls visible in the collapsed notification.
          .setShowActionsInCompactView(0, 2, 4)
      )
      .addAction(
        NotificationCompat.Action(
          R.drawable.ic_notif_shuffle,
          if (state.shuffleEnabled) "Desactivar aleatorio" else "Activar aleatorio",
          actionPendingIntent(ACTION_SHUFFLE)
        )
      )
      .addAction(
        NotificationCompat.Action(
          R.drawable.ic_notif_prev,
          "Anterior",
          actionPendingIntent(ACTION_PREVIOUS)
        )
      )
      .addAction(
        NotificationCompat.Action(
          if (state.playing) R.drawable.ic_notif_pause else R.drawable.ic_notif_play,
          if (state.playing) "Pausar" else "Reproducir",
          actionPendingIntent(ACTION_TOGGLE)
        )
      )
      .addAction(
        NotificationCompat.Action(
          R.drawable.ic_notif_next,
          "Siguiente",
          actionPendingIntent(ACTION_NEXT)
        )
      )
      .addAction(
        NotificationCompat.Action(
          R.drawable.ic_notif_repeat,
          when (state.repeatMode) {
            "repeat-all" -> "Repetir lista"
            "repeat-one" -> "Repetir canción"
            else -> "Activar repetición"
          },
          actionPendingIntent(ACTION_REPEAT)
        )
      )

    val notification = builder.build()

    try {
      if (!foregroundStarted) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
          startForeground(
            NOTIFICATION_ID,
            notification,
            android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK
          )
        } else {
          startForeground(NOTIFICATION_ID, notification)
        }
        foregroundStarted = true
      } else {
        val notificationManager = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(NOTIFICATION_ID, notification)
      }
    } catch (e: Exception) {
      Log.w(TAG, "startForeground failed, posting via NotificationManager", e)
      val nm = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
      nm.notify(NOTIFICATION_ID, notification)
    }
  }

  private fun buildNotificationViews(layoutId: Int, state: NotificationState): RemoteViews {
    return RemoteViews(packageName, layoutId).apply {
      setTextViewText(R.id.notif_title, state.title)
      setTextViewText(R.id.notif_artist, state.artist)
      setImageViewResource(
        R.id.notif_btn_play,
        if (state.playing) R.drawable.ic_notif_pause else R.drawable.ic_notif_play
      )
      setOnClickPendingIntent(R.id.notif_btn_shuffle, actionPendingIntent(ACTION_SHUFFLE))
      setOnClickPendingIntent(R.id.notif_btn_prev, actionPendingIntent(ACTION_PREVIOUS))
      setOnClickPendingIntent(R.id.notif_btn_play, actionPendingIntent(ACTION_TOGGLE))
      setOnClickPendingIntent(R.id.notif_btn_next, actionPendingIntent(ACTION_NEXT))
      setOnClickPendingIntent(R.id.notif_btn_repeat, actionPendingIntent(ACTION_REPEAT))

      if (currentArtworkBitmap != null) {
        setImageViewBitmap(R.id.notif_artwork, currentArtworkBitmap)
      } else {
        setImageViewResource(R.id.notif_artwork, R.drawable.notif_artwork_placeholder)
      }

      if (layoutId == R.layout.notif_music_big) {
        val duration = state.durationMs.coerceAtLeast(0L)
        val position = state.positionMs.coerceIn(0L, duration)
        val progress = if (duration > 0L) {
          ((position.toDouble() / duration.toDouble()) * 1000).toInt()
        } else {
          0
        }
        setProgressBar(R.id.notif_seekbar, 1000, progress, false)
        setTextViewText(R.id.notif_time_elapsed, formatNotificationTime(position))
        setTextViewText(R.id.notif_time_remaining, formatNotificationTime((duration - position).coerceAtLeast(0L)))
        setOnClickPendingIntent(R.id.notif_btn_rewind, actionPendingIntent(ACTION_REWIND))
        setOnClickPendingIntent(R.id.notif_btn_forward, actionPendingIntent(ACTION_FORWARD))
      }
    }
  }

  private fun formatNotificationTime(milliseconds: Long): String {
    val totalSeconds = (milliseconds / 1000L).coerceAtLeast(0L)
    return "${totalSeconds / 60}:${(totalSeconds % 60).toString().padStart(2, '0')}"
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
      val options = BitmapFactory.Options().apply {
        inJustDecodeBounds = true
      }

      val decodeBounds = when (uri.scheme) {
        "content", "file", "android.resource" -> contentResolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, options) }
        "http", "https" -> {
          val conn = java.net.URL(uriString).openConnection()
          conn.connectTimeout = 5000
          conn.readTimeout = 8000
          (conn.getInputStream() as? InputStream)?.use { BitmapFactory.decodeStream(it, null, options) }
        }
        null -> {
          BitmapFactory.decodeFile(uriString, options)
        }
        else -> null
      }

      val inSampleSize = calculateInSampleSize(options, 512, 512)
      val bitmapOptions = BitmapFactory.Options().apply {
        this.inSampleSize = inSampleSize
        inPreferredConfig = Bitmap.Config.RGB_565
      }

      when (uri.scheme) {
        "content", "file", "android.resource" -> contentResolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, bitmapOptions) }
        "http", "https" -> {
          val conn = java.net.URL(uriString).openConnection()
          conn.connectTimeout = 5000
          conn.readTimeout = 8000
          (conn.getInputStream() as? InputStream)?.use { BitmapFactory.decodeStream(it, null, bitmapOptions) }
        }
        null -> BitmapFactory.decodeFile(uriString, bitmapOptions)
        else -> null
      }
    } catch (e: Exception) {
      Log.w(TAG, "Failed to load artwork: $uriString", e)
      null
    }
  }

  private fun calculateInSampleSize(options: BitmapFactory.Options, reqWidth: Int, reqHeight: Int): Int {
    val height = options.outHeight
    val width = options.outWidth
    var inSampleSize = 1

    if (height > reqHeight || width > reqWidth) {
      val halfHeight = height / 2
      val halfWidth = width / 2
      while (halfHeight / inSampleSize >= reqHeight && halfWidth / inSampleSize >= reqWidth) {
        inSampleSize *= 2
      }
    }

    return inSampleSize
  }

  private fun ensureMediaSession() {
    if (mediaSession != null) return
    val session = MediaSessionCompat(this, TAG).apply {
      setFlags(
        MediaSessionCompat.FLAG_HANDLES_MEDIA_BUTTONS or
          MediaSessionCompat.FLAG_HANDLES_TRANSPORT_CONTROLS
      )
      setSessionActivity(launchAppIntent())
      setCallback(object : MediaSessionCompat.Callback() {
        override fun onPlay() {
          val state = lastState
          if (state?.playing != true) {
            dispatchAction(ACTION_TOGGLE)
          }
        }
        override fun onPause() {
          val state = lastState
          if (state?.playing == true) {
            dispatchAction(ACTION_TOGGLE)
          }
        }
        override fun onSkipToPrevious() {
          dispatchAction(ACTION_PREVIOUS)
        }
        override fun onSkipToNext() {
          dispatchAction(ACTION_NEXT)
        }
        override fun onSeekTo(pos: Long) {
          dispatchAction(ACTION_SEEK, pos)
        }
        override fun onSetShuffleMode(shuffleMode: Int) {
          val shouldEnable = shuffleMode == PlaybackStateCompat.SHUFFLE_MODE_ALL
          if (lastState?.shuffleEnabled != shouldEnable) {
            dispatchAction(ACTION_SHUFFLE)
          }
        }
        override fun onSetRepeatMode(repeatMode: Int) {
          val currentMode = repeatModeToCompat(lastState?.repeatMode)
          if (currentMode == repeatMode) {
            return
          }

          val currentIndex = repeatModeOrder.indexOf(currentMode)
          val targetIndex = repeatModeOrder.indexOf(repeatMode)
          if (currentIndex < 0 || targetIndex < 0) {
            return
          }

          val steps = (targetIndex - currentIndex + repeatModeOrder.size) % repeatModeOrder.size
          repeat(steps) {
            dispatchAction(ACTION_REPEAT)
          }
        }
        override fun onStop() {
          val state = lastState
          if (state?.playing == true) {
            dispatchAction(ACTION_TOGGLE)
          }
        }
      })
      setPlaybackToLocal(AudioManager.STREAM_MUSIC)
      isActive = true
    }
    mediaSession = session
  }

  private fun releaseMediaSession() {
    try {
      mediaSession?.isActive = false
      mediaSession?.release()
    } catch (_: Exception) {
    }
    mediaSession = null
  }

  private fun dispatchAction(action: String, positionMs: Long? = null) {
    val cb = MusicNotificationActionReceiver.actionCallback
    if (cb != null) {
      try { cb(action, positionMs) } catch (_: Exception) { }
      return
    }
    val intent = Intent(this, MusicNotificationActionReceiver::class.java).apply {
      this.action = action
      setPackage(packageName)
      if (positionMs != null) {
        putExtra(EXTRA_SEEK_POSITION_MS, positionMs)
      }
    }
    sendBroadcast(intent)
  }

  private fun updateMediaSession(state: NotificationState, artwork: Bitmap?) {
    val session = mediaSession ?: return
    val durationMs = state.durationMs.coerceAtLeast(0L)
    val positionMs = state.positionMs.coerceIn(0L, if (durationMs > 0) durationMs else Long.MAX_VALUE)

    val playbackState = PlaybackStateCompat.Builder()
      .setActions(
        PlaybackStateCompat.ACTION_PLAY
          or PlaybackStateCompat.ACTION_PAUSE
          or PlaybackStateCompat.ACTION_PLAY_PAUSE
          or PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS
          or PlaybackStateCompat.ACTION_SKIP_TO_NEXT
          or PlaybackStateCompat.ACTION_SEEK_TO
          or PlaybackStateCompat.ACTION_SET_SHUFFLE_MODE
          or PlaybackStateCompat.ACTION_SET_REPEAT_MODE
          or PlaybackStateCompat.ACTION_STOP
      )
      .setState(
        if (state.playing) PlaybackStateCompat.STATE_PLAYING else PlaybackStateCompat.STATE_PAUSED,
        positionMs,
        if (state.playing) 1.0f else 0.0f,
        SystemClock.elapsedRealtime()
      )
      .setBufferedPosition(durationMs)
      .build()
    session.setPlaybackState(playbackState)
    session.setShuffleMode(
      if (state.shuffleEnabled) {
        PlaybackStateCompat.SHUFFLE_MODE_ALL
      } else {
        PlaybackStateCompat.SHUFFLE_MODE_NONE
      }
    )
    session.setRepeatMode(repeatModeToCompat(state.repeatMode))

    val metadata = MediaMetadataCompat.Builder()
      .putString(MediaMetadataCompat.METADATA_KEY_TITLE, state.title)
      .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, state.artist)
      .putLong(MediaMetadataCompat.METADATA_KEY_DURATION, durationMs)
      .apply {
        if (artwork != null) {
          putBitmap(MediaMetadataCompat.METADATA_KEY_ART, artwork)
          putBitmap(MediaMetadataCompat.METADATA_KEY_ALBUM_ART, artwork)
          putBitmap(MediaMetadataCompat.METADATA_KEY_DISPLAY_ICON, artwork)
        }
      }
      .build()
    session.setMetadata(metadata)
  }

  override fun onDestroy() {
    releaseMediaSession()
    ioExecutor.shutdownNow()
    currentArtworkBitmap = null
    foregroundStarted = false
    runningService = null
    super.onDestroy()
  }

  companion object {
    @Volatile
    private var runningService: MusicNotificationService? = null

    private const val TAG = "MusicNotifService"
    const val CHANNEL_ID = "fesa_music_playback"
    const val NOTIFICATION_ID = 8421

    const val ACTION_START = "expo.modules.localmusic.START_NOTIF"
    const val ACTION_STOP = "expo.modules.localmusic.STOP_NOTIF"

    const val ACTION_PREVIOUS = "expo.modules.localmusic.action.PREVIOUS"
    const val ACTION_NEXT = "expo.modules.localmusic.action.NEXT"
    const val ACTION_TOGGLE = "expo.modules.localmusic.action.TOGGLE"
    const val ACTION_SEEK = "expo.modules.localmusic.action.SEEK"
    const val ACTION_REWIND = "expo.modules.localmusic.action.REWIND_10"
    const val ACTION_FORWARD = "expo.modules.localmusic.action.FORWARD_10"
    const val ACTION_SHUFFLE = "expo.modules.localmusic.action.SHUFFLE"
    const val ACTION_REPEAT = "expo.modules.localmusic.action.REPEAT"

    const val EXTRA_TITLE = "title"
    const val EXTRA_ARTIST = "artist"
    const val EXTRA_ARTWORK = "artwork"
    const val EXTRA_PLAYING = "playing"
    const val EXTRA_POSITION_MS = "positionMs"
    const val EXTRA_DURATION_MS = "durationMs"
    const val EXTRA_SHUFFLE_ENABLED = "shuffleEnabled"
    const val EXTRA_REPEAT_MODE = "repeatMode"
    const val EXTRA_SEEK_POSITION_MS = "seekPositionMs"

    private val repeatModeOrder = intArrayOf(
      PlaybackStateCompat.REPEAT_MODE_NONE,
      PlaybackStateCompat.REPEAT_MODE_ALL,
      PlaybackStateCompat.REPEAT_MODE_ONE
    )

    private fun repeatModeToCompat(mode: String?): Int {
      return when (mode) {
        "repeat-all" -> PlaybackStateCompat.REPEAT_MODE_ALL
        "repeat-one" -> PlaybackStateCompat.REPEAT_MODE_ONE
        else -> PlaybackStateCompat.REPEAT_MODE_NONE
      }
    }

    fun start(context: Context, state: NotificationState) {
      val intent = Intent(context, MusicNotificationService::class.java).apply {
        action = ACTION_START
        putExtra(EXTRA_TITLE, state.title)
        putExtra(EXTRA_ARTIST, state.artist)
        putExtra(EXTRA_ARTWORK, state.artworkUri)
        putExtra(EXTRA_PLAYING, state.playing)
        putExtra(EXTRA_POSITION_MS, state.positionMs)
        putExtra(EXTRA_DURATION_MS, state.durationMs)
        putExtra(EXTRA_SHUFFLE_ENABLED, state.shuffleEnabled)
        putExtra(EXTRA_REPEAT_MODE, state.repeatMode)
      }
      if (runningService != null) {
        context.startService(intent)
      } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
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
  val durationMs: Long,
  val shuffleEnabled: Boolean,
  val repeatMode: String
) {
  companion object {
    fun fromIntent(intent: Intent?): NotificationState {
      return NotificationState(
        title = intent?.getStringExtra(MusicNotificationService.EXTRA_TITLE) ?: "",
        artist = intent?.getStringExtra(MusicNotificationService.EXTRA_ARTIST) ?: "",
        artworkUri = intent?.getStringExtra(MusicNotificationService.EXTRA_ARTWORK),
        playing = intent?.getBooleanExtra(MusicNotificationService.EXTRA_PLAYING, false) ?: false,
        positionMs = intent?.getLongExtra(MusicNotificationService.EXTRA_POSITION_MS, 0L) ?: 0L,
        durationMs = intent?.getLongExtra(MusicNotificationService.EXTRA_DURATION_MS, 0L) ?: 0L,
        shuffleEnabled = intent?.getBooleanExtra(MusicNotificationService.EXTRA_SHUFFLE_ENABLED, false) ?: false,
        repeatMode = intent?.getStringExtra(MusicNotificationService.EXTRA_REPEAT_MODE) ?: "linear"
      )
    }
  }
}
