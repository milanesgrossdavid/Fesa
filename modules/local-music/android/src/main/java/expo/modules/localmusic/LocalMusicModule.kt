package expo.modules.localmusic

import android.app.PendingIntent
import android.content.ContentUris
import android.content.ContentValues
import android.content.Intent
import android.media.RingtoneManager
import android.media.audiofx.Equalizer
import android.net.Uri
import android.os.Build
import android.provider.MediaStore
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.localmusic.notification.MusicNotificationActionReceiver
import expo.modules.localmusic.notification.MusicNotificationService
import expo.modules.localmusic.notification.NotificationState
import java.io.File

class LocalMusicModule : Module() {
  private val equalizersBySessionId = mutableMapOf<Int, Equalizer>()

  private fun audioUri(songId: String): Uri {
    return ContentUris.withAppendedId(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, songId.toLong())
  }

  private fun getOrCreateEqualizer(audioSessionId: Int): Equalizer? {
    val existing = equalizersBySessionId[audioSessionId]
    if (existing != null) {
      return existing
    }

    return try {
      val sessionId = audioSessionId.coerceAtLeast(0)
      val equalizer = Equalizer(sessionId, 0)
      equalizer.enabled = true
      equalizersBySessionId[audioSessionId] = equalizer
      equalizer
    } catch (error: Exception) {
      null
    }
  }

  private fun folderFromRelativePath(relativePath: String?): String? {
    if (relativePath.isNullOrBlank()) {
      return null
    }

    return relativePath
      .trim()
      .trimEnd('/', '\\')
      .split('/', '\\')
      .lastOrNull { it.isNotBlank() }
  }

  private fun folderFromFilePath(filePath: String?): String? {
    if (filePath.isNullOrBlank()) {
      return null
    }

    val parts = filePath
      .trim()
      .trimEnd('/', '\\')
      .split('/', '\\')
      .filter { it.isNotBlank() }

    return if (parts.size >= 2) parts[parts.size - 2] else null
  }

  private fun resolveFolderName(relativePath: String?, filePath: String?): String? {
    return folderFromRelativePath(relativePath) ?: folderFromFilePath(filePath)
  }

  override fun definition() = ModuleDefinition {
    Name("LocalMusic")

    Events("onNotificationAction")

    OnCreate {
      MusicNotificationActionReceiver.actionCallback = actionCallback@{ action, positionMs ->
        val actionName = when (action) {
          MusicNotificationService.ACTION_PREVIOUS -> "previous"
          MusicNotificationService.ACTION_NEXT -> "next"
          MusicNotificationService.ACTION_TOGGLE -> "toggle"
          MusicNotificationService.ACTION_SEEK -> "seek"
          MusicNotificationService.ACTION_REWIND -> "rewind"
          MusicNotificationService.ACTION_FORWARD -> "forward"
          else -> return@actionCallback
        }
        try {
          sendEvent(
            "onNotificationAction",
            mapOf("action" to actionName, "positionMs" to positionMs)
          )
        } catch (e: Exception) {
          // Module not ready; ignore.
        }
      }
    }

    OnDestroy {
      MusicNotificationActionReceiver.actionCallback = null
    }

    AsyncFunction("getAudioFiles") { ->
      // Tipamos explícitamente como Any? para aceptar distintos tipos de datos y nulos
      val audioList = mutableListOf<Map<String, Any?>>()
      
      val context = appContext.reactContext ?: return@AsyncFunction audioList

      val collection = MediaStore.Audio.Media.EXTERNAL_CONTENT_URI
      val projection = mutableListOf(
        MediaStore.Audio.Media._ID,
        MediaStore.Audio.Media.TITLE,
        MediaStore.Audio.Media.ARTIST,
        MediaStore.Audio.Media.ALBUM,
        MediaStore.Audio.Media.DURATION,
        MediaStore.Audio.Media.ALBUM_ID,
        MediaStore.Audio.Media.DATE_ADDED,
        MediaStore.Audio.Media.DATE_MODIFIED
      ).apply {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
          add(MediaStore.Audio.Media.RELATIVE_PATH)
        }
        @Suppress("DEPRECATION")
        add(MediaStore.Audio.Media.DATA)
      }.toTypedArray()
      
      val selection = "${MediaStore.Audio.Media.IS_MUSIC} != 0"

      context.contentResolver.query(
        collection,
        projection,
        selection,
        null,
        "${MediaStore.Audio.Media.TITLE} ASC"
      )?.use { cursor ->
        val idCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media._ID)
        val titleCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.TITLE)
        val artistCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ARTIST)
        val albumCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ALBUM)
        val durationCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DURATION)
        val albumIdCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ALBUM_ID)
        val dateAddedCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DATE_ADDED)
        val dateModifiedCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DATE_MODIFIED)
        val relativePathCol = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
          cursor.getColumnIndex(MediaStore.Audio.Media.RELATIVE_PATH)
        } else {
          -1
        }
        @Suppress("DEPRECATION")
        val dataCol = cursor.getColumnIndex(MediaStore.Audio.Media.DATA)

        while (cursor.moveToNext()) {
          val albumId = cursor.getLong(albumIdCol)
          val relativePath = if (relativePathCol >= 0) cursor.getString(relativePathCol) else null
          val filePath = if (dataCol >= 0) cursor.getString(dataCol) else null
          val artworkUri = if (albumId > 0) {
            Uri.withAppendedPath(
              Uri.parse("content://media/external/audio/albumart"),
              albumId.toString()
            ).toString()
          } else {
            null
          }

          audioList.add(
            mapOf(
              "id" to cursor.getLong(idCol).toString(),
              // Usamos paréntesis para forzar a Kotlin a evaluar primero el valor nulo
              "title" to (cursor.getString(titleCol) ?: "Desconocido"),
              "artist" to (cursor.getString(artistCol) ?: "Artista Desconocido"),
              "album" to (cursor.getString(albumCol) ?: "Álbum Desconocido"),
              "duration" to cursor.getLong(durationCol),
              "url" to ContentUris.withAppendedId(collection, cursor.getLong(idCol)).toString(),
              "folder" to resolveFolderName(relativePath, filePath),
              "dateAdded" to cursor.getLong(dateAddedCol),
              "dateModified" to cursor.getLong(dateModifiedCol),
              "artwork" to artworkUri
            )
          )
        }
      }
      return@AsyncFunction audioList
    }

    AsyncFunction("deleteAudioFile") { songId: String ->
      val context = appContext.reactContext ?: return@AsyncFunction false
      val activity = appContext.currentActivity ?: return@AsyncFunction false
      val uri = audioUri(songId)

      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
        val pendingIntent: PendingIntent = MediaStore.createDeleteRequest(context.contentResolver, listOf(uri))
        activity.startIntentSenderForResult(pendingIntent.intentSender, 4001, null, 0, 0, 0)
        return@AsyncFunction true
      }

      return@AsyncFunction context.contentResolver.delete(uri, null, null) > 0
    }

    AsyncFunction("updateAudioMetadata") { songId: String, title: String?, artist: String?, album: String?, artworkUri: String? ->
      val context = appContext.reactContext ?: return@AsyncFunction false
      val uri = audioUri(songId)

      val values = ContentValues().apply {
        if (title != null) {
          put(MediaStore.Audio.Media.TITLE, title)
        }
        if (artist != null) {
          put(MediaStore.Audio.Media.ARTIST, artist)
        }
        if (album != null) {
          put(MediaStore.Audio.Media.ALBUM, album)
        }
      }

      if (values.size() > 0) {
        val updatedRows = try {
          context.contentResolver.update(uri, values, null, null)
        } catch (_: SecurityException) {
          return@AsyncFunction false
        } catch (_: Exception) {
          return@AsyncFunction false
        }

        if (updatedRows <= 0) {
          return@AsyncFunction false
        }
      }

      if (!artworkUri.isNullOrBlank()) {
        val albumId = context.contentResolver.query(
          uri,
          arrayOf(MediaStore.Audio.Media.ALBUM_ID),
          null,
          null,
          null
        )?.use { cursor ->
          if (cursor.moveToFirst()) {
            val albumIdColumnIndex = cursor.getColumnIndex(MediaStore.Audio.Media.ALBUM_ID)
            if (albumIdColumnIndex >= 0) {
              cursor.getLong(albumIdColumnIndex)
            } else {
              -1L
            }
          } else {
            -1L
          }
        } ?: -1L

        if (albumId > 0L) {
          val artUri = Uri.parse("content://media/external/audio/albumart/$albumId")
          val sourceUri = Uri.parse(artworkUri)
          val sourceStream = try {
            when (sourceUri.scheme) {
              "content" -> context.contentResolver.openInputStream(sourceUri)
              "file" -> File(sourceUri.path ?: return@AsyncFunction true).inputStream()
              else -> null
            }
          } catch (_: Exception) {
            null
          }
          val outputStream = try {
            context.contentResolver.openOutputStream(artUri, "w")
          } catch (_: Exception) {
            null
          }

          if (sourceStream != null && outputStream != null) {
            try {
              sourceStream.use { input ->
                outputStream.use { output ->
                  input.copyTo(output)
                }
              }
            } catch (_: Exception) {
              // Save title/artist/album metadata even if the artwork write is denied.
            }
          }
        }
      }

      return@AsyncFunction true
    }

    AsyncFunction("getEqualizerState") { sessionId: Double ->
      val equalizer = getOrCreateEqualizer(sessionId.toInt()) ?: return@AsyncFunction null
      val bandRange = equalizer.bandLevelRange
      val bandCount = equalizer.numberOfBands
      val bands = (0 until bandCount).map { index ->
        val bandIndex = index.toShort()
        val minLevel = bandRange[0].toInt()
        val maxLevel = bandRange[1].toInt()
        val currentLevel = equalizer.getBandLevel(bandIndex).toInt()

        mapOf(
          "index" to index,
          "frequency" to equalizer.getCenterFreq(bandIndex),
          "level" to currentLevel.toDouble(),
          "minLevel" to minLevel.toDouble(),
          "maxLevel" to maxLevel.toDouble()
        )
      }

      mapOf(
        "enabled" to equalizer.enabled,
        "bands" to bands
      )
    }

    AsyncFunction("setEqualizerState") { sessionId: Double, enabled: Boolean, levels: Array<Double> ->
      val equalizer = getOrCreateEqualizer(sessionId.toInt()) ?: return@AsyncFunction false
      val bandRange = equalizer.bandLevelRange
      val minLevel = bandRange[0].toInt()
      val maxLevel = bandRange[1].toInt()

      equalizer.enabled = enabled
      if (levels.isNotEmpty()) {
        val limit = minOf(equalizer.numberOfBands.toInt(), levels.size)
        for (index in 0 until limit) {
          val bandIndex = index.toShort()
          val clamped = levels[index].coerceIn(minLevel.toDouble(), maxLevel.toDouble()).toInt()
          equalizer.setBandLevel(bandIndex, clamped.toShort())
        }
      }

      true
    }

    AsyncFunction("releaseEqualizer") { sessionId: Double ->
      val equalizer = equalizersBySessionId.remove(sessionId.toInt())
      equalizer?.release()
      true
    }

    AsyncFunction("shareAudioFile") { songId: String ->
      val context = appContext.reactContext ?: return@AsyncFunction
      val activity = appContext.currentActivity ?: return@AsyncFunction
      val uri = audioUri(songId)
      val shareIntent = Intent(Intent.ACTION_SEND).apply {
        type = "audio/*"
        putExtra(Intent.EXTRA_STREAM, uri)
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
      }

      activity.startActivity(Intent.createChooser(shareIntent, "Compartir canción"))
    }

    AsyncFunction("setAudioAsTone") { songId: String, type: String ->
      val context = appContext.reactContext ?: return@AsyncFunction false
      val activity = appContext.currentActivity ?: return@AsyncFunction false
      val uri = audioUri(songId)

      if (type == "contact") {
        val contactIntent = Intent(Intent.ACTION_ATTACH_DATA).apply {
          setDataAndType(uri, "audio/*")
          putExtra("mimeType", "audio/*")
          addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        activity.startActivity(Intent.createChooser(contactIntent, "Definir tono de contacto"))
        return@AsyncFunction true
      }

      if (!Settings.System.canWrite(context)) {
        val settingsIntent = Intent(Settings.ACTION_MANAGE_WRITE_SETTINGS).apply {
          data = Uri.parse("package:${context.packageName}")
        }
        activity.startActivity(settingsIntent)
        return@AsyncFunction false
      }

      val ringtoneType = if (type == "alarm") {
        RingtoneManager.TYPE_ALARM
      } else {
        RingtoneManager.TYPE_RINGTONE
      }

      RingtoneManager.setActualDefaultRingtoneUri(context, ringtoneType, uri)
      return@AsyncFunction true
    }

    Function("showMusicNotification") { title: String, artist: String, artworkUri: String?, playing: Boolean, positionMs: Double, durationMs: Double ->
      val context = appContext.reactContext ?: return@Function null
      MusicNotificationService.start(
        context,
        NotificationState(
          title = title,
          artist = artist,
          artworkUri = artworkUri,
          playing = playing,
          positionMs = positionMs.toLong(),
          durationMs = durationMs.toLong()
        )
      )
    }

    Function("stopMusicNotification") {
      val context = appContext.reactContext ?: return@Function null
      MusicNotificationService.stop(context)
      null
    }
  }
}
