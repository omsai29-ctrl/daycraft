package com.omsai.daycraft;

import android.app.Activity;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.provider.OpenableColumns;
import com.getcapacitor.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.InputStream;
import java.io.OutputStream;

@CapacitorPlugin(name = "DaycraftFiles")
public class DaycraftFilesPlugin extends Plugin {
    private static final String ROOT = "Daycraft/Notes/";

    @PluginMethod
    public void pickPhoto(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.setType("image/*");
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        startActivityForResult(call, intent, "photoPicked");
    }

    @ActivityCallback
    private void photoPicked(PluginCall call, ActivityResult result) {
        if (result == null || result.getResultCode() != Activity.RESULT_OK || result.getData() == null) {
            call.reject("Photo selection cancelled");
            return;
        }
        Uri source = result.getData().getData();
        if (source == null) { call.reject("No photo was selected"); return; }

        try {
            String noteId = safe(call.getString("noteId", "note"));
            String folderPath = safePath(call.getString("folderPath", ""));
            String originalName = safe(queryName(source));
            if (originalName.isEmpty()) originalName = "photo.jpg";
            String ext = extension(originalName);
            String fileName = noteId + "_" + System.currentTimeMillis() + ext;
            String relative = Environment.DIRECTORY_PICTURES + "/" + ROOT + folderPath;

            ContentResolver resolver = getContext().getContentResolver();
            ContentValues values = new ContentValues();
            values.put(MediaStore.Images.Media.DISPLAY_NAME, fileName);
            String mime = resolver.getType(source);
            values.put(MediaStore.Images.Media.MIME_TYPE, mime == null ? "image/jpeg" : mime);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                values.put(MediaStore.Images.Media.RELATIVE_PATH, relative);
                values.put(MediaStore.Images.Media.IS_PENDING, 1);
            }

            Uri target = resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values);
            if (target == null) throw new Exception("Could not create local photo");

            try (InputStream in = resolver.openInputStream(source);
                 OutputStream out = resolver.openOutputStream(target)) {
                if (in == null || out == null) throw new Exception("Could not open photo");
                byte[] buf = new byte[8192];
                int n;
                while ((n = in.read(buf)) != -1) out.write(buf, 0, n);
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ContentValues done = new ContentValues();
                done.put(MediaStore.Images.Media.IS_PENDING, 0);
                resolver.update(target, done, null, null);
            }

            JSObject ret = new JSObject();
            ret.put("uri", target.toString());
            ret.put("name", originalName);
            ret.put("fileName", fileName);
            ret.put("relativePath", relative);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Could not save photo locally", e);
        }
    }

    private String queryName(Uri uri) {
        Cursor c = getContext().getContentResolver().query(uri,
                new String[]{OpenableColumns.DISPLAY_NAME}, null, null, null);
        if (c == null) return "";
        try { return c.moveToFirst() ? c.getString(0) : ""; }
        finally { c.close(); }
    }
    private String extension(String name) {
        int p = name.lastIndexOf('.');
        return p >= 0 ? name.substring(p).toLowerCase() : ".jpg";
    }
    private String safe(String s) {
        return s == null ? "" : s.replaceAll("[^a-zA-Z0-9._-]", "_");
    }
    private String safePath(String s) {
        if (s == null || s.isEmpty()) return "";
        StringBuilder out = new StringBuilder();
        for (String part : s.split("/")) {
            String x = safe(part);
            if (!x.isEmpty()) {
                if (out.length() > 0) out.append('/');
                out.append(x);
            }
        }
        return out.toString();
    }
}
