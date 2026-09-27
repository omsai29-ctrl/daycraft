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
        intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
        startActivityForResult(call, intent, "photoPicked");
    }

    @ActivityCallback
    private void photoPicked(PluginCall call, ActivityResult result) {
        if (result == null || result.getResultCode() != Activity.RESULT_OK || result.getData() == null) {
            call.reject("Photo selection cancelled");
            return;
        }
        try {
            android.content.Intent data = result.getData();
            java.util.ArrayList<Uri> sources = new java.util.ArrayList<>();
            if (data.getClipData() != null) {
                for (int i = 0; i < data.getClipData().getItemCount(); i++) {
                    Uri u = data.getClipData().getItemAt(i).getUri();
                    if (u != null) sources.add(u);
                }
            } else if (data.getData() != null) {
                sources.add(data.getData());
            }
            if (sources.isEmpty()) throw new Exception("No photos were selected");

            String noteId = safe(call.getString("noteId", "note"));
            String folderPath = safePath(call.getString("folderPath", ""));
            String relative = Environment.DIRECTORY_PICTURES + "/" + ROOT + folderPath;
            ContentResolver resolver = getContext().getContentResolver();
            org.json.JSONArray files = new org.json.JSONArray();

            for (Uri source : sources) {
                String originalName = safe(queryName(source));
                if (originalName.isEmpty()) originalName = "photo.jpg";
                String ext = extension(originalName);
                String fileName = noteId + "_" + System.currentTimeMillis() + "_" + files.length() + ext;
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
                try (InputStream in = resolver.openInputStream(source); OutputStream out = resolver.openOutputStream(target)) {
                    if (in == null || out == null) throw new Exception("Could not open photo");
                    byte[] buf = new byte[8192]; int n;
                    while ((n = in.read(buf)) != -1) out.write(buf, 0, n);
                }
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    ContentValues done = new ContentValues();
                    done.put(MediaStore.Images.Media.IS_PENDING, 0);
                    resolver.update(target, done, null, null);
                }
                JSObject f = new JSObject();
                f.put("uri", target.toString()); f.put("name", originalName); f.put("fileName", fileName);
                f.put("mime", mime == null ? "image/jpeg" : mime); f.put("relativePath", relative); f.put("kind", "image");
                files.put(new org.json.JSONObject(f.toString()));
            }
            JSObject ret = new JSObject();
            ret.put("files", files);
            call.resolve(ret);
        } catch (Exception e) { call.reject("Could not save photos locally", e); }
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
                "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                "text/plain"
        });
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
        startActivityForResult(call, intent, "filePicked");
    }

    @ActivityCallback
    private void filePicked(PluginCall call, ActivityResult result) {
        if (result == null || result.getResultCode() != Activity.RESULT_OK || result.getData() == null) {
            call.reject("File selection cancelled");
            return;
        }
        try {
            android.content.Intent data = result.getData();
            java.util.ArrayList<Uri> sources = new java.util.ArrayList<>();
            if (data.getClipData() != null) {
                for (int i = 0; i < data.getClipData().getItemCount(); i++) {
                    Uri u = data.getClipData().getItemAt(i).getUri();
                    if (u != null) sources.add(u);
                }
            } else if (data.getData() != null) {
                sources.add(data.getData());
            }
            if (sources.isEmpty()) throw new Exception("No files were selected");

            String noteId = safe(call.getString("noteId", "note"));
            String folderPath = safePath(call.getString("folderPath", ""));
            String relative = Environment.DIRECTORY_DOCUMENTS + "/" + ROOT + folderPath;
            ContentResolver resolver = getContext().getContentResolver();
            org.json.JSONArray files = new org.json.JSONArray();

            for (Uri source : sources) {
                String originalName = safe(queryName(source));
                if (originalName.isEmpty()) originalName = "attachment";
                String ext = extension(originalName);
                String fileName = noteId + "_" + System.currentTimeMillis() + "_" + files.length() + ext;
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
                try (InputStream in = resolver.openInputStream(source); OutputStream out = resolver.openOutputStream(target)) {
                    if (in == null || out == null) throw new Exception("Could not open file");
                    byte[] buf = new byte[8192]; int n;
                    while ((n = in.read(buf)) != -1) out.write(buf, 0, n);
                }
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    ContentValues done = new ContentValues();
                    done.put(MediaStore.Files.FileColumns.IS_PENDING, 0);
                    resolver.update(target, done, null, null);
                }
                JSObject f = new JSObject();
                f.put("uri", target.toString()); f.put("name", originalName); f.put("fileName", fileName);
                f.put("mime", mime); f.put("relativePath", relative); f.put("kind", "file");
                files.put(new org.json.JSONObject(f.toString()));
            }
            JSObject ret = new JSObject();
            ret.put("files", files);
            call.resolve(ret);
        } catch (Exception e) { call.reject("Could not save files locally", e); }
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
    public void listFiles(PluginCall call) {
        try {
            String folderPath = safePath(call.getString("folderPath", ""));
            String docPrefix = Environment.DIRECTORY_DOCUMENTS + "/" + ROOT + folderPath;
            String picPrefix = Environment.DIRECTORY_PICTURES + "/" + ROOT + folderPath;
            ContentResolver resolver = getContext().getContentResolver();
            org.json.JSONArray arr = new org.json.JSONArray();
            java.util.HashSet<String> seen = new java.util.HashSet<>();

            String[] projection = {
                    MediaStore.MediaColumns._ID, MediaStore.MediaColumns.DISPLAY_NAME,
                    MediaStore.MediaColumns.MIME_TYPE, MediaStore.MediaColumns.SIZE,
                    MediaStore.MediaColumns.DATE_MODIFIED, MediaStore.MediaColumns.RELATIVE_PATH
            };

            // Documents: query the Files collection directly for the exact folder.
            try (Cursor cur = resolver.query(
                    MediaStore.Files.getContentUri("external"),
                    projection,
                    MediaStore.MediaColumns.RELATIVE_PATH + "=?",
                    new String[]{docPrefix},
                    MediaStore.MediaColumns.DATE_MODIFIED + " DESC")) {
                if (cur != null) {
                    int idCol = cur.getColumnIndex(MediaStore.MediaColumns._ID);
                    int nameCol = cur.getColumnIndex(MediaStore.MediaColumns.DISPLAY_NAME);
                    int mimeCol = cur.getColumnIndex(MediaStore.MediaColumns.MIME_TYPE);
                    int sizeCol = cur.getColumnIndex(MediaStore.MediaColumns.SIZE);
                    int dateCol = cur.getColumnIndex(MediaStore.MediaColumns.DATE_MODIFIED);
                    while (cur.moveToNext()) {
                        long id = cur.getLong(idCol);
                        Uri uri = Uri.withAppendedPath(MediaStore.Files.getContentUri("external"), String.valueOf(id));
                        if (!seen.add(uri.toString())) continue;
                        JSObject x = new JSObject();
                        x.put("uri", uri.toString());
                        x.put("name", nameCol >= 0 ? cur.getString(nameCol) : "File");
                        x.put("mime", mimeCol >= 0 ? cur.getString(mimeCol) : "");
                        x.put("size", sizeCol >= 0 ? cur.getLong(sizeCol) : 0);
                        x.put("modified", dateCol >= 0 ? cur.getLong(dateCol) * 1000L : 0);
                        x.put("kind", "file");
                        arr.put(new org.json.JSONObject(x.toString()));
                    }
                }
            }

            // Photos: query Images separately. This avoids MediaStore.Files filtering
            // inconsistencies on some Android versions.
            try (Cursor cur = resolver.query(
                    MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
                    projection,
                    MediaStore.MediaColumns.RELATIVE_PATH + "=?",
                    new String[]{picPrefix},
                    MediaStore.MediaColumns.DATE_MODIFIED + " DESC")) {
                if (cur != null) {
                    int idCol = cur.getColumnIndex(MediaStore.MediaColumns._ID);
                    int nameCol = cur.getColumnIndex(MediaStore.MediaColumns.DISPLAY_NAME);
                    int mimeCol = cur.getColumnIndex(MediaStore.MediaColumns.MIME_TYPE);
                    int sizeCol = cur.getColumnIndex(MediaStore.MediaColumns.SIZE);
                    int dateCol = cur.getColumnIndex(MediaStore.MediaColumns.DATE_MODIFIED);
                    while (cur.moveToNext()) {
                        long id = cur.getLong(idCol);
                        Uri uri = Uri.withAppendedPath(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, String.valueOf(id));
                        if (!seen.add(uri.toString())) continue;
                        JSObject x = new JSObject();
                        x.put("uri", uri.toString());
                        x.put("name", nameCol >= 0 ? cur.getString(nameCol) : "Photo");
                        x.put("mime", mimeCol >= 0 ? cur.getString(mimeCol) : "image/*");
                        x.put("size", sizeCol >= 0 ? cur.getLong(sizeCol) : 0);
                        x.put("modified", dateCol >= 0 ? cur.getLong(dateCol) * 1000L : 0);
                        x.put("kind", "image");
                        arr.put(new org.json.JSONObject(x.toString()));
                    }
                }
            }

            JSObject ret = new JSObject();
            ret.put("files", arr);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Could not list folder files", e);
        }
    }

    @PluginMethod
    public void deleteFile(PluginCall call) {
        try {
            String uriString = call.getString("uri", "");
            if (uriString.isEmpty()) throw new Exception("No file URI");
            int deleted = getContext().getContentResolver().delete(Uri.parse(uriString), null, null);
            if (deleted <= 0) throw new Exception("File was not deleted");
            call.resolve();
        } catch (Exception e) {
            call.reject("Could not delete file", e);
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