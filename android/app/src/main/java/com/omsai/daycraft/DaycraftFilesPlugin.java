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
import androidx.activity.result.ActivityResult;
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
            ret.put("mime", mime);
            ret.put("relativePath", relative);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Could not save photo locally", e);
        }
    }

    @PluginMethod
    public void pickFile(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.setType("*/*");
        intent.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{
                "application/pdf",
                "application/msword",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "application/vnd.ms-powerpoint",
                "application/vnd.openxmlformats-officedocument.presentationml.presentation"
        });
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        startActivityForResult(call, intent, "filePicked");
    }

    @ActivityCallback
    private void filePicked(PluginCall call, ActivityResult result) {
        if (result == null || result.getResultCode() != Activity.RESULT_OK || result.getData() == null) {
            call.reject("File selection cancelled");
            return;
        }
        Uri source = result.getData().getData();
        if (source == null) { call.reject("No file was selected"); return; }

        try {
            String noteId = safe(call.getString("noteId", "note"));
            String folderPath = safePath(call.getString("folderPath", ""));
            String originalName = safe(queryName(source));
            if (originalName.isEmpty()) originalName = "attachment";
            String ext = extension(originalName);
            String fileName = noteId + "_" + System.currentTimeMillis() + ext;
            String relative = Environment.DIRECTORY_DOCUMENTS + "/" + ROOT + folderPath;

            ContentResolver resolver = getContext().getContentResolver();
            ContentValues values = new ContentValues();
            values.put(MediaStore.Files.FileColumns.DISPLAY_NAME, fileName);
            String mime = resolver.getType(source);
            if (mime == null || mime.isEmpty()) mime = mimeFromName(originalName);
            values.put(MediaStore.Files.FileColumns.MIME_TYPE, mime);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                values.put(MediaStore.Files.FileColumns.RELATIVE_PATH, relative);
                values.put(MediaStore.Files.FileColumns.IS_PENDING, 1);
            }

            Uri target = resolver.insert(MediaStore.Files.getContentUri("external"), values);
            if (target == null) throw new Exception("Could not create local file");

            try (InputStream in = resolver.openInputStream(source);
                 OutputStream out = resolver.openOutputStream(target)) {
                if (in == null || out == null) throw new Exception("Could not open file");
                byte[] buf = new byte[8192];
                int n;
                while ((n = in.read(buf)) != -1) out.write(buf, 0, n);
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ContentValues done = new ContentValues();
                done.put(MediaStore.Files.FileColumns.IS_PENDING, 0);
                resolver.update(target, done, null, null);
            }

            JSObject ret = new JSObject();
            ret.put("uri", target.toString());
            ret.put("name", originalName);
            ret.put("fileName", fileName);
            ret.put("mime", mime);
            ret.put("relativePath", relative);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Could not save file locally", e);
        }
    }

    @PluginMethod
    public void exportBackup(PluginCall call) {
        try {
            String fileName = safe(call.getString("fileName", "planner-backup.json"));
            if (!fileName.toLowerCase().endsWith(".json")) fileName += ".json";
            String data = call.getString("data", "");
            if (data == null) data = "";

            ContentResolver resolver = getContext().getContentResolver();
            ContentValues values = new ContentValues();
            values.put(MediaStore.Downloads.DISPLAY_NAME, fileName);
            values.put(MediaStore.Downloads.MIME_TYPE, "application/json");
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/Daycraft");
                values.put(MediaStore.Downloads.IS_PENDING, 1);
            }

            Uri target;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                target = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
            } else {
                target = resolver.insert(MediaStore.Files.getContentUri("external"), values);
            }
            if (target == null) throw new Exception("Could not create backup file");

            try (OutputStream out = resolver.openOutputStream(target)) {
                if (out == null) throw new Exception("Could not open backup file");
                out.write(data.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ContentValues done = new ContentValues();
                done.put(MediaStore.Downloads.IS_PENDING, 0);
                resolver.update(target, done, null, null);
            }

            JSObject ret = new JSObject();
            ret.put("uri", target.toString());
            ret.put("fileName", fileName);
            ret.put("path", "Downloads/Daycraft/" + fileName);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Could not export backup", e);
        }
    }

    @PluginMethod
    public void openFile(PluginCall call) {
        try {
            String uriString = call.getString("uri", "");
            if (uriString.isEmpty()) throw new Exception("No file URI");
            Uri uri = Uri.parse(uriString);
            String mime = call.getString("mime", "");
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(uri, mime.isEmpty() ? "*/*" : mime);
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(Intent.createChooser(intent, "Open file with"));
            call.resolve();
        } catch (android.content.ActivityNotFoundException e) {
            call.reject("No app is available to open this file", e);
        } catch (Exception e) {
            call.reject("Could not open file", e);
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
    private String mimeFromName(String name) {
        String n = name.toLowerCase();
        if (n.endsWith(".pdf")) return "application/pdf";
        if (n.endsWith(".doc")) return "application/msword";
        if (n.endsWith(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        if (n.endsWith(".ppt")) return "application/vnd.ms-powerpoint";
        if (n.endsWith(".pptx")) return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
        return "application/octet-stream";
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