package expo.modules.localmusic

import android.app.PendingIntent
import android.content.ContentUris
import android.content.Intent
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.provider.MediaStore
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.localmusic.notification.MusicNotificationActionReceiver
import expo.modules.localmusic.notification.MusicNotificationService
import expo.modules.localmusic.notification.NotificationState

class LocalMusicModule : Module() {
  private fun audioUri(songId: String): Uri {
    return ContentUris.withAppendedId(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, songId.toLong())
  }

  override fun definition() = ModuleDefinition {
    Name("LocalMusic")

    Events("onNotificationAction")

    OnCreate {
      MusicNotificationActionReceiver.actionCallback = actionCallback@{ action ->
        val actionName = when (action) {
          MusicNotificationService.ACTION_PREVIOUS -> "previous"
          MusicNotificationService.ACTION_NEXT -> "next"
          MusicNotificationService.ACTION_TOGGLE -> "toggle"
          else -> return@actionCallback
        }
        try {
          sendEvent("onNotificationAction", mapOf("action" to actionName))
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
      val projection = arrayOf(
        MediaStore.Audio.Media._ID,
        MediaStore.Audio.Media.TITLE,
        MediaStore.Audio.Media.ARTIST,
        MediaStore.Audio.Media.ALBUM,
        MediaStore.Audio.Media.DURATION,
        MediaStore.Audio.Media.DATA,
        MediaStore.Audio.Media.ALBUM_ID,
        MediaStore.Audio.Media.DATE_ADDED,
        MediaStore.Audio.Media.DATE_MODIFIED
      )
      
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
        val dataCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DATA)
        val albumIdCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ALBUM_ID)
        val dateAddedCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DATE_ADDED)
        val dateModifiedCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DATE_MODIFIED)

        while (cursor.moveToNext()) {
          val albumId = cursor.getLong(albumIdCol)
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
              "url" to cursor.getString(dataCol),
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
