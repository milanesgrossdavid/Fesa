package expo.modules.localmusic

import android.net.Uri
import android.provider.MediaStore
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class LocalMusicModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("LocalMusic")

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
  }
}